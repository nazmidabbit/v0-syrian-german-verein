import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  const supabase = getSupabase();
  const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

  const { data: user } = await supabase
    .from('users')
    .select('id, email, role, is_verified')
    .eq('id', decoded.userId)
    .single();

  if (!user || !user.is_verified) return null;
  return user;
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_verified, email_verified, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
