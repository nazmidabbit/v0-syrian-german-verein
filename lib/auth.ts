import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  try {
    const supabase = getSupabase();
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role, is_verified')
      .eq('id', decoded.userId)
      .single();

    if (!user || !user.is_verified) return null;
    return { ...user, role: user.role || 'viewer' };
  } catch {
    return null;
  }
}

export function canEdit(role: string) {
  return role === 'admin' || role === 'editor';
}
