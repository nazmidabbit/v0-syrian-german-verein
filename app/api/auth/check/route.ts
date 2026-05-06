import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const supabase = getSupabase();
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

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
      user: { id: user.id, name: user.name, email: user.email, role: user.role || 'viewer', is_verified: user.is_verified, permissions },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
