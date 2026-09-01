import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

const idSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'formulare')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: form, error } = await supabase
      .from('forms')
      .select('id, title, title_ar, slug, is_active, max_participants, closes_at, waitlist_enabled, unique_by_email')
      .eq('id', id)
      .maybeSingle();

    if (error || !form) {
      return NextResponse.json({ error: 'Formular nicht gefunden.' }, { status: 404 });
    }

    const { data: fields } = await supabase
      .from('form_fields')
      .select('field_key, label, field_type, sort_order')
      .eq('form_id', id)
      .order('sort_order', { ascending: true });

    const { data: submissions } = await supabase
      .from('form_submissions')
      .select('id, data, created_at, status, checked_in_at, email')
      .eq('form_id', id)
      .order('created_at', { ascending: false })
      .limit(1000);

    const rows = submissions || [];
    // Teilnehmerzahlen fuer die Kopfzeile der Ergebnisseite
    const counts = {
      total: rows.length,
      confirmed: rows.filter((s) => s.status === 'confirmed').length,
      waitlist: rows.filter((s) => s.status === 'waitlist').length,
      cancelled: rows.filter((s) => s.status === 'cancelled').length,
      checkedIn: rows.filter((s) => Boolean(s.checked_in_at)).length,
    };

    return NextResponse.json({ form, fields: fields || [], submissions: rows, counts });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
