import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Benutzer existiert bereits.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const { error } = await supabase.from('users').insert({
      email,
      password: hashedPassword,
      name,
      is_verified: true,
      verification_token: verificationToken,
    });

    if (error) {
      return NextResponse.json({ error: 'Fehler bei der Registrierung.' }, { status: 500 });
    }

    // E-Mail-Verifizierung nur wenn SMTP konfiguriert
    if (process.env.SMTP_HOST) {
      const { sendVerificationEmail } = await import('@/lib/mailer');
      await sendVerificationEmail(email, verificationToken);
      return NextResponse.json({ message: 'Registrierung erfolgreich. Bitte E-Mail bestätigen.' });
    }

    return NextResponse.json({ message: 'Registrierung erfolgreich.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
