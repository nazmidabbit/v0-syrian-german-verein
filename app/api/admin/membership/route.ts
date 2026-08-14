import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mitgliedsantraege')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const baseColumns =
      'id, first_name, last_name, birth_date, birth_place, email, phone, profession, certificate, street, postal_code, city, membership_type, message, status, admin_note, processed_at, created_at';

    let result = await supabase
      .from('membership_applications')
      .select(`${baseColumns}, member_number`)
      .order('created_at', { ascending: false });

    // Fallback: Spalte member_number existiert noch nicht (Migration nicht ausgefuehrt)
    if (result.error) {
      result = (await supabase
        .from('membership_applications')
        .select(baseColumns)
        .order('created_at', { ascending: false })) as typeof result;
    }

    if (result.error) {
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    return NextResponse.json({ applications: result.data || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
