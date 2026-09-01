import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { issueFormToken, verifyFormToken, hashIp, getClientIp } from '@/lib/form-token';
import { validateSubmission, MAX_PHOTO_DATA_URL_LENGTH, type FormFieldDef } from '@/lib/forms';

export const dynamic = 'force-dynamic';

// Formulare ohne Foto-Feld bleiben bei der alten, engen Grenze.
// Nur wenn ein Foto-Feld existiert, ist der groessere Body erlaubt.
const MAX_BODY_BYTES = 50_000;
const MAX_BODY_BYTES_WITH_PHOTO = 6_000_000;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const GENERIC_ERROR = { error: 'serverError' } as const;

const slugSchema = z.string().regex(/^[a-z0-9-]{1,60}$/);

const submitSchema = z
  .object({
    formToken: z.string().min(1).max(200),
    // Honeypot — muss leer sein
    company: z.string().max(200).optional().default(''),
    locale: z.enum(['de', 'ar']).optional().default('de'),
    // DSGVO: Einwilligung in die Datenschutzerklaerung ist bei jedem Formular Pflicht
    privacyConsent: z.boolean(),
    // Obergrenze deckt Foto-Data-URLs ab; die feine Pruefung je Feldtyp
    // macht validateSubmission
    data: z.record(z.union([z.string().max(MAX_PHOTO_DATA_URL_LENGTH), z.boolean()])),
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
    .select(
      'id, title, title_ar, description, description_ar, slug, max_participants, closes_at, waitlist_enabled, unique_by_email',
    )
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

interface RegistrationForm {
  id: string;
  max_participants: number | null;
  closes_at: string | null;
  waitlist_enabled: boolean;
}

// Anmeldestand: Anmeldeschluss vorbei, Plaetze belegt, Restplaetze.
// Gezaehlt wird nur bei gesetztem Limit — sonst ist die Zahl belanglos.
async function registrationState(form: RegistrationForm) {
  const closed = form.closes_at ? new Date(form.closes_at).getTime() < Date.now() : false;

  if (!form.max_participants) {
    return { closed, isFull: false, remaining: null as number | null };
  }

  const { count } = await getSupabase()
    .from('form_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('form_id', form.id)
    .eq('status', 'confirmed');

  const confirmed = count || 0;
  return {
    closed,
    isFull: confirmed >= form.max_participants,
    remaining: Math.max(0, form.max_participants - confirmed),
  };
}

// GET: Formular-Definition, Anmeldestand und Anti-Bot-Token
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

    const state = await registrationState(loaded.form as RegistrationForm);

    return NextResponse.json({
      ...loaded,
      registration: {
        closesAt: loaded.form.closes_at,
        maxParticipants: loaded.form.max_participants,
        waitlistEnabled: loaded.form.waitlist_enabled,
        ...state,
      },
      token: issueFormToken(),
    });
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

// Foto-Data-URLs in den Storage schieben und durch die oeffentliche URL ersetzen.
// Schlaegt ein Upload fehl, bleibt das Feld leer — die Anmeldung selbst zaehlt mehr.
async function storePhotos(
  formId: string,
  fields: FormFieldDef[],
  cleaned: Record<string, string | boolean>,
) {
  const supabase = getSupabase();

  for (const field of fields) {
    if (field.field_type !== 'photo') continue;
    const value = cleaned[field.field_key];
    if (typeof value !== 'string' || !value) continue;

    cleaned[field.field_key] = '';

    const match = value.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!match) continue;

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) continue;

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const path = `forms/${formId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, { contentType: `image/${match[1]}` });

    if (error) {
      console.error('Formular-Foto-Upload fehlgeschlagen:', error.message);
      continue;
    }
    cleaned[field.field_key] = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
  }
}

// POST: Einsendung validieren, Anmeldegrenzen pruefen und speichern
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
    if (contentLength > MAX_BODY_BYTES_WITH_PHOTO) {
      return NextResponse.json(GENERIC_ERROR, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES_WITH_PHOTO) {
      return NextResponse.json(GENERIC_ERROR, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }

    const parsed = submitSchema.safeParse(body);
    if (!parsed.success || parsed.data.privacyConsent !== true) {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }

    // Honeypot gefuellt → Bot. Fake-Erfolg, nichts speichern.
    if (parsed.data.company !== '') {
      console.warn('Formular-Einsendung verworfen: Honeypot gefuellt');
      return NextResponse.json({ ok: true, status: 'confirmed' });
    }

    if (!verifyFormToken(parsed.data.formToken)) {
      return NextResponse.json({ error: 'invalidToken' }, { status: 400 });
    }

    const loaded = await loadActiveForm(slug);
    if (!loaded) {
      return NextResponse.json({ error: 'notFound' }, { status: 404 });
    }

    // Grosser Body nur fuer Formulare mit Foto-Feld
    const hasPhotoField = loaded.fields.some((f) => f.field_type === 'photo');
    if (!hasPhotoField && raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(GENERIC_ERROR, { status: 413 });
    }

    const supabase = getSupabase();
    const state = await registrationState(loaded.form as RegistrationForm);

    if (state.closed) {
      return NextResponse.json({ error: 'closed' }, { status: 409 });
    }

    const result = validateSubmission(loaded.fields, parsed.data.data);
    if (!result.ok) {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }

    // E-Mail des Absenders (erstes E-Mail-Feld) — fuer Doppelpruefung,
    // Export und die Eingangsbestaetigung
    const emailField = loaded.fields.find((f) => f.field_type === 'email');
    const submitterEmail = emailField ? String(result.cleaned[emailField.field_key] || '') : '';
    const normalizedEmail = submitterEmail.toLowerCase();

    if (loaded.form.unique_by_email && normalizedEmail) {
      const { data: existing } = await supabase
        .from('form_submissions')
        .select('id')
        .eq('form_id', loaded.form.id)
        .eq('email', normalizedEmail)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'duplicate' }, { status: 409 });
      }
    }

    // Ausgebucht: entweder Warteliste oder Absage
    let status = 'confirmed';
    if (state.isFull) {
      if (!loaded.form.waitlist_enabled) {
        return NextResponse.json({ error: 'full' }, { status: 409 });
      }
      status = 'waitlist';
    }

    if (hasPhotoField) {
      await storePhotos(loaded.form.id, loaded.fields, result.cleaned);
    }

    const { error: insertError } = await supabase.from('form_submissions').insert({
      form_id: loaded.form.id,
      data: result.cleaned,
      status,
      email: normalizedEmail,
      privacy_consent_at: new Date().toISOString(),
      ip_hash: ip,
    });

    if (insertError) {
      console.error('Formular-Einsendung Insert fehlgeschlagen:', insertError.code);
      return NextResponse.json(GENERIC_ERROR, { status: 500 });
    }

    // Eingangsbestaetigung an die ausfuellende Person, wenn das Formular ein
    // E-Mail-Feld hat — Fehler dabei duerfen die Einsendung nicht scheitern lassen
    if (process.env.SMTP_HOST && submitterEmail) {
      const isAr = parsed.data.locale === 'ar';
      const formTitle = isAr && loaded.form.title_ar ? loaded.form.title_ar : loaded.form.title;
      const firstName =
        typeof result.cleaned['first_name'] === 'string' ? result.cleaned['first_name'] : '';
      try {
        const { sendFormConfirmation } = await import('@/lib/mailer');
        await sendFormConfirmation(
          submitterEmail,
          firstName,
          formTitle,
          parsed.data.locale,
          status === 'waitlist',
        );
      } catch (mailError) {
        console.error('Formular-Bestaetigungsmail fehlgeschlagen:', mailError);
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}
