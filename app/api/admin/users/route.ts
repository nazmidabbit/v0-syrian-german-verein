import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_verified, email_verified, permissions, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
