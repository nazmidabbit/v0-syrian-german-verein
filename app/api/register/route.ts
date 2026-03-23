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
      is_verified: false,
      verification_token: verificationToken,
      role: 'viewer',
    });

    if (error) {
      return NextResponse.json({ error: 'Fehler bei der Registrierung.' }, { status: 500 });
    }

    // E-Mail-Verifizierung senden
    if (process.env.SMTP_HOST) {
      try {
        const { sendVerificationEmail } = await import('@/lib/mailer');
        await sendVerificationEmail(email, verificationToken);
      } catch (emailError) {
        console.error('E-Mail senden fehlgeschlagen:', emailError);
      }
    }

    return NextResponse.json({ message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link in der zugesendeten E-Mail.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
