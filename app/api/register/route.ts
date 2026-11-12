import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';
import { hashIp, getClientIp } from '@/lib/form-token';

// Registrierung fuer den Mitgliederbereich. Der Zugang wird nach der
// E-Mail-Bestaetigung noch vom Vorstand freigeschaltet.
//
// Die Route verschickt eine Mail an jede eingegebene Adresse — ohne
// Rate-Limit liesse sie sich zum Zumuellen fremder Postfaecher missbrauchen.
export const dynamic = 'force-dynamic';

const NO_CONTROL_CHARS = new RegExp('^[^\\u0000-\\u001F\\u007F]*$');

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100).regex(NO_CONTROL_CHARS),
    email: z.string().trim().toLowerCase().email().max(254),
    // bcrypt beruecksichtigt nur die ersten 72 Bytes
    password: z.string().min(8).max(72),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const ip = hashIp(getClientIp(request));
    const perIp = rateLimit(`register:${ip}`, 3, 60 * 60_000);
    const global = rateLimit('register:global', 30, 60 * 60_000);
    if (!perIp.allowed || !global.allowed) {
      return NextResponse.json(
        { error: 'Zu viele Registrierungen in kurzer Zeit. Bitte versuchen Sie es später erneut.' },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const message =
        field === 'password'
          ? 'Das Passwort muss mindestens 8 Zeichen lang sein.'
          : field === 'email'
            ? 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
            : 'Bitte alle Felder korrekt ausfüllen (Name mindestens 2 Zeichen).';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const { name, email, password } = parsed.data;

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Für diese E-Mail-Adresse gibt es bereits ein Konto.' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const { error } = await supabase.from('users').insert({
      email,
      password: hashedPassword,
      name,
      is_verified: false,
      verification_token: verificationToken,
      role: 'viewer',
    });

    if (error) {
      console.error('Registrierung fehlgeschlagen:', error.code);
      return NextResponse.json({ error: 'Fehler bei der Registrierung.' }, { status: 500 });
    }

    if (process.env.SMTP_HOST) {
      try {
        const { sendVerificationEmail } = await import('@/lib/mailer');
        await sendVerificationEmail(email, verificationToken);
      } catch (emailError) {
        console.error('E-Mail senden fehlgeschlagen:', emailError);
      }
    }

    return NextResponse.json({
      message:
        'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link in der zugesendeten E-Mail.',
    });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
