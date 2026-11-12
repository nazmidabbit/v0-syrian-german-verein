import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { hashIp, getClientIp } from '@/lib/form-token';

// Kontaktformular. Ersetzt die alte Pages-API-Route ohne jeden Schutz:
// jetzt mit Laengenpruefung, Honeypot, Rate-Limit und Eingangsbestaetigung.
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 20_000;

// Steuerzeichen haben in einzeiligen Feldern nichts verloren — sonst liesse
// sich ueber den Betreff ein zusaetzlicher Mail-Header einschleusen.
const NO_CONTROL_CHARS = new RegExp('^[^\\u0000-\\u001F\\u007F]*$');
const MULTILINE_SAFE = new RegExp('^[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]*$');

const contactSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).regex(NO_CONTROL_CHARS),
    lastName: z.string().trim().min(1).max(100).regex(NO_CONTROL_CHARS),
    email: z.string().trim().toLowerCase().email().max(254),
    subject: z.string().trim().min(2).max(150).regex(NO_CONTROL_CHARS),
    message: z.string().trim().min(10).max(5000).regex(MULTILINE_SAFE),
    locale: z.enum(['de', 'ar']).optional().default('de'),
    // Honeypot: unsichtbares Feld, das nur Bots ausfuellen
    website: z.string().max(200).optional().default(''),
  })
  .strict();

function tooManyRequests(retryAfterMs: number) {
  return NextResponse.json(
    { error: 'rateLimited' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
  );
}

export async function POST(request: Request) {
  try {
    const ip = hashIp(getClientIp(request));

    // Pro Absender und insgesamt — gegen Einzeltaeter wie gegen Spam-Wellen
    const perIp = rateLimit(`contact:${ip}`, 5, 15 * 60_000);
    if (!perIp.allowed) return tooManyRequests(perIp.retryAfterMs);
    const global = rateLimit('contact:global', 60, 60 * 60_000);
    if (!global.allowed) return tooManyRequests(global.retryAfterMs);

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'validation' }, { status: 415 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'validation' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation' }, { status: 400 });
    }
    const data = parsed.data;

    // Honeypot gefuellt: Bot. Scheinbar Erfolg melden, nichts verschicken.
    if (data.website !== '') {
      console.warn('Kontaktanfrage verworfen: Honeypot gefuellt');
      return NextResponse.json({ ok: true });
    }

    if (!process.env.SMTP_HOST) {
      console.error('Kontaktformular: SMTP ist nicht konfiguriert');
      return NextResponse.json({ error: 'serverError' }, { status: 500 });
    }

    const { sendContactAdminNotification, sendContactConfirmation } = await import('@/lib/mailer');

    // Die Nachricht an den Verein muss ankommen — scheitert sie, bekommt
    // der Absender einen Fehler und kann es erneut versuchen.
    await sendContactAdminNotification({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });

    // Die Eingangsbestaetigung ist Komfort: ein Fehler hier darf die
    // Anfrage nicht als gescheitert erscheinen lassen.
    try {
      await sendContactConfirmation(data.email, data.firstName, data.subject, data.locale);
    } catch (mailError) {
      console.error('Kontakt-Eingangsbestaetigung fehlgeschlagen:', mailError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Kontaktformular fehlgeschlagen:', error);
    return NextResponse.json({ error: 'serverError' }, { status: 500 });
  }
}
