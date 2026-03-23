import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const supabase = getSupabase();
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, is_verified, role')
      .eq('id', decoded.userId)
      .single();

    if (!user || !user.is_verified) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Permissions separat laden (Spalte existiert evtl. noch nicht)
    let permissions: string[] = [];
    try {
      const { data: permData } = await supabase
        .from('users')
        .select('permissions')
        .eq('id', decoded.userId)
        .single();
      permissions = permData?.permissions || [];
    } catch {
      // Spalte existiert noch nicht
    }

    return NextResponse.json({
      authenticated: true,
      user: { name: user.name, email: user.email, role: user.role || 'viewer', permissions },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
