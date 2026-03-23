import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token fehlt.' }, { status: 400 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('verification_token', token)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Ungültiger Token.' }, { status: 400 });
  }

  await supabase
    .from('users')
    .update({ email_verified: true, verification_token: '' })
    .eq('id', user.id);

  return NextResponse.json({ message: 'E-Mail erfolgreich bestätigt! Ihr Konto muss noch vom Administrator freigegeben werden.' });
}
