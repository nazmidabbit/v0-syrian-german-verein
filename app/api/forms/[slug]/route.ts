import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { issueFormToken, verifyFormToken, hashIp, getClientIp } from '@/lib/form-token';
import { validateSubmission, type FormFieldDef } from '@/lib/forms';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 50_000;

const GENERIC_ERROR = { error: 'serverError' } as const;
const SUCCESS = { ok: true } as const;

const slugSchema = z.string().regex(/^[a-z0-9-]{1,60}$/);

const submitSchema = z
  .object({
    formToken: z.string().min(1).max(200),
    // Honeypot — muss leer sein
    company: z.string().max(200).optional().default(''),
    data: z.record(z.union([z.string().max(4000), z.boolean()])),
  })
  .strict();

function tooManyRequests(retryAfterMs: number) {
  return NextResponse.json(
    { error: 'rateLimited' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
  );
}

// Aktives Formular samt Feldern laden; null wenn unbekannt/inaktiv
async function loadActiveForm(slug: string) {
  const supabase = getSupabase();
  const { data: form } = await supabase
    .from('forms')
    .select('id, title, title_ar, description, description_ar, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!form) return null;

  const { data: fields } = await supabase
    .from('form_fields')
    .select('field_key, label, label_ar, field_type, options, options_ar, required, sort_order')
    .eq('form_id', form.id)
    .order('sort_order', { ascending: true });

  return { form, fields: (fields || []) as FormFieldDef[] };
}

// GET: Formular-Definition + Anti-Bot-Token
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slugSchema.safeParse(slug).success) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }

    const ip = hashIp(getClientIp(request));
    const limit = rateLimit(`form:get:${ip}`, 30, 10 * 60_000);
    if (!limit.allowed) return tooManyRequests(limit.retryAfterMs);

    const loaded = await loadActiveForm(slug);
    if (!loaded) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }

    return NextResponse.json({ ...loaded, token: issueFormToken() });
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

// POST: Einsendung validieren und speichern
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slugSchema.safeParse(slug).success) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }

    const ip = hashIp(getClientIp(request));
    const perIp = rateLimit(`form:post:${ip}`, 10, 15 * 60_000);
    if (!perIp.allowed) return tooManyRequests(perIp.retryAfterMs);
    const global = rateLimit('form:post:global', 120, 60 * 60_000);
    if (!global.allowed) return tooManyRequests(global.retryAfterMs);

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(GENERIC_ERROR, { status: 415 });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(GENERIC_ERROR, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(GENERIC_ERROR, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }

    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }

    // Honeypot gefuellt → Bot. Fake-Erfolg, nichts speichern.
    if (parsed.data.company !== '') {
      console.warn('Formular-Einsendung verworfen: Honeypot gefuellt');
      return NextResponse.json(SUCCESS);
    }

    if (!verifyFormToken(parsed.data.formToken)) {
      return NextResponse.json({ error: 'invalidToken' }, { status: 400 });
    }

    const loaded = await loadActiveForm(slug);
    if (!loaded) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }

    const result = validateSubmission(loaded.fields, parsed.data.data);
    if (!result.ok) {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }

    const { error: insertError } = await getSupabase().from('form_submissions').insert({
      form_id: loaded.form.id,
      data: result.cleaned,
      ip_hash: ip,
    });

    if (insertError) {
      console.error('Formular-Einsendung Insert fehlgeschlagen:', insertError.code);
      return NextResponse.json(GENERIC_ERROR, { status: 500 });
    }

    return NextResponse.json(SUCCESS);
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}
