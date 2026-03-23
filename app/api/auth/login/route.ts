import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich.' },
        { status: 400 }
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten.' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten.' },
        { status: 401 }
      );
    }

    if (!user.email_verified) {
      return NextResponse.json(
        { error: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse über den Link in der zugesendeten E-Mail.' },
        { status: 403 }
      );
    }

    if (!user.is_verified) {
      return NextResponse.json(
        { error: 'Ihr Konto wurde noch nicht vom Administrator freigegeben. Bitte warten Sie auf die Freigabe.' },
        { status: 403 }
      );
    }

    const token = Buffer.from(
      JSON.stringify({ userId: user.id, email: user.email, ts: Date.now() })
    ).toString('base64');

    const response = NextResponse.json({
      message: 'Login erfolgreich.',
      user: { name: user.name, email: user.email },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Serverfehler beim Login.' },
      { status: 500 }
    );
  }
}
