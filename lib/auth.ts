import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/jwt';

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  try {
    const supabase = getSupabase();
    const decoded = verifyToken(token);
    if (!decoded) return null;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role, is_verified')
      .eq('id', decoded.userId)
      .single();

    if (!user || !user.is_verified) return null;

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

    return { ...user, role: user.role || 'viewer', permissions };
  } catch {
    return null;
  }
}

export function canEdit(role: string) {
  return role === 'admin' || role === 'editor';
}

export function hasPermission(user: { role: string; permissions: string[] }, page: string) {
  if (user.role === 'admin') return true;
  return user.permissions.includes(page);
}
