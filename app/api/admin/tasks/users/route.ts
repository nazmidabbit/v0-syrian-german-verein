import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

// Auswahlliste fuer die Zuweisung. Bewusst schlank (kein Rollen-/Rechte-Detail),
// damit auch Editoren mit der Berechtigung "aufgaben" sie laden duerfen.
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'aufgaben')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { data, error } = await getSupabase()
      .from('users')
      .select('id, name, email')
      .eq('is_verified', true)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    return NextResponse.json({ users: data || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
