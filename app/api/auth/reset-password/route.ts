import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data: user } = await supabase
      .from('users')
      .select('id, password, is_verified')
      .eq('id', authUser.id)
      .single();

    if (!user || !user.is_verified) {
      return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Bitte alle Felder ausfüllen.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Neues Passwort muss mindestens 6 Zeichen lang sein.' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Aktuelles Passwort ist falsch.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Passwort erfolgreich geändert.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
