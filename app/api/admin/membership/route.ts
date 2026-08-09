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
    const { data: applications, error } = await supabase
      .from('membership_applications')
      .select(
        'id, first_name, last_name, birth_date, email, phone, street, postal_code, city, membership_type, message, status, admin_note, processed_at, created_at',
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    return NextResponse.json({ applications: applications || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
