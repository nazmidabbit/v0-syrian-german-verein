import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { membershipSubmitSchema } from '@/lib/membership';
import { issueFormToken, verifyFormToken, hashIp, getClientIp } from '@/lib/form-token';

// Token-Ausgabe darf nie gecacht werden
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 20_000;

// Neutrale Antworten: keine internen Details, keine E-Mail-Enumeration
const GENERIC_ERROR = { error: 'serverError' } as const;
const SUCCESS = { ok: true } as const;

function tooManyRequests(retryAfterMs: number) {
  return NextResponse.json(
    { error: 'rateLimited' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
  );
}

// GET: signiertes Formular-Token ausgeben (Anti-Bot: Mindest-Ausfuellzeit + Ablauf)
export async function GET(request: Request) {
  const ip = hashIp(getClientIp(request));
  const limit = rateLimit(`membership:token:${ip}`, 30, 10 * 60_000);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterMs);

  return NextResponse.json({ token: issueFormToken() });
}

export async function POST(request: Request) {
  try {
    const ip = hashIp(getClientIp(request));

    // Rate-Limits: pro IP und global (gegen verteilte Spam-Wellen)
    const perIp = rateLimit(`membership:post:${ip}`, 5, 15 * 60_000);
    if (!perIp.allowed) return tooManyRequests(perIp.retryAfterMs);
    const global = rateLimit('membership:post:global', 60, 60 * 60_000);
    if (!global.allowed) return tooManyRequests(global.retryAfterMs);

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(GENERIC_ERROR, { status: 415 });
    }

    // Groessenlimit gegen ueberdimensionierte Payloads —
    // erst per Header ablehnen, dann nach dem Lesen erneut pruefen
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

    // Strikte Server-Validierung (Laengen, Formate, keine Zusatzfelder)
    const parsed = membershipSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }
    const data = parsed.data;

    // Honeypot gefuellt → Bot. Fake-Erfolg zurueckgeben, nichts speichern.
    if (data.company !== '') {
      console.warn('Mitgliedsantrag verworfen: Honeypot gefuellt');
      return NextResponse.json(SUCCESS);
    }

    // Formular-Token pruefen (min. 3s Ausfuellzeit, max. 2h gueltig)
    if (!verifyFormToken(data.formToken)) {
      return NextResponse.json({ error: 'invalidToken' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Duplikat-Check: bereits offener Antrag mit dieser E-Mail →
    // neutraler Erfolg (kein Insert, keine Mails), verhindert Enumeration & Mail-Bombing.
    // E-Mail ist durch das Schema bereits lowercase — eq genuegt, der Unique-Index faengt Races.
    const { data: existing } = await supabase
      .from('membership_applications')
      .select('id')
      .eq('status', 'pending')
      .eq('email', data.email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(SUCCESS);
    }

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('membership_applications').insert({
      first_name: data.firstName,
      last_name: data.lastName,
      birth_date: data.birthDate,
      birth_place: data.birthPlace,
      email: data.email,
      phone: data.phone,
      profession: data.profession,
      certificate: data.certificate,
      street: data.street,
      postal_code: data.postalCode,
      city: data.city,
      membership_type: data.membershipType,
      message: data.message,
      privacy_consent_at: now,
      statutes_consent_at: now,
      ip_hash: ip,
      status: 'pending',
    });

    if (insertError) {
      // 23505 = Unique-Verletzung (Race beim Duplikat-Check) → neutraler Erfolg
      if (insertError.code === '23505') {
        return NextResponse.json(SUCCESS);
      }
      console.error('Mitgliedsantrag Insert fehlgeschlagen:', insertError.code);
      return NextResponse.json(GENERIC_ERROR, { status: 500 });
    }

    // Mails sind nice-to-have — Fehler dabei duerfen den Antrag nicht scheitern lassen
    if (process.env.SMTP_HOST) {
      try {
        const { sendMembershipAdminNotification, sendMembershipConfirmation } = await import('@/lib/mailer');
        await sendMembershipAdminNotification({
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate,
          birthPlace: data.birthPlace,
          email: data.email,
          phone: data.phone,
          profession: data.profession,
          certificate: data.certificate,
          street: data.street,
          postalCode: data.postalCode,
          city: data.city,
          membershipType: data.membershipType,
          message: data.message,
        });
        await sendMembershipConfirmation(data.email, data.firstName, data.locale);
      } catch (mailError) {
        console.error('Mitgliedsantrag-Mail fehlgeschlagen:', mailError);
      }
    }

    return NextResponse.json(SUCCESS);
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}
