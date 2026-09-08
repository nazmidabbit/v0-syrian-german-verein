import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

const idSchema = z.string().uuid();

// Teilnehmer eines Formulars. Nur lesend — Aendern und Loeschen bleibt
// der Ergebnisseite unter der Berechtigung "formulare" vorbehalten.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'teilnehmer')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: form } = await supabase
      .from('forms')
      .select('id, title, title_ar, slug, max_participants, closes_at, event_id')
      .eq('id', id)
      .maybeSingle();

    if (!form) {
      return NextResponse.json({ error: 'Formular nicht gefunden.' }, { status: 404 });
    }

    const { data: fields } = await supabase
      .from('form_fields')
      .select('field_key, label, label_ar, field_type, sort_order')
      .eq('form_id', id)
      .order('sort_order', { ascending: true });

    const { data: submissions } = await supabase
      .from('form_submissions')
      .select('id, data, created_at, status, checked_in_at, email')
      .eq('form_id', id)
      .order('created_at', { ascending: true })
      .limit(1000);

    const rows = submissions || [];
    const counts = {
      total: rows.length,
      confirmed: rows.filter((s) => s.status === 'confirmed').length,
      waitlist: rows.filter((s) => s.status === 'waitlist').length,
      cancelled: rows.filter((s) => s.status === 'cancelled').length,
      checkedIn: rows.filter((s) => Boolean(s.checked_in_at)).length,
      withPhoto: rows.filter((s) =>
        Object.values((s.data as Record<string, unknown>) || {}).some(
          (v) => typeof v === 'string' && v.startsWith('http'),
        ),
      ).length,
    };

    // Verknuepfte Veranstaltung fuer die Kopfzeile
    let event = null;
    if (form.event_id) {
      const { data } = await supabase
        .from('events')
        .select('id, title, title_ar, date')
        .eq('id', form.event_id)
        .maybeSingle();
      event = data;
    }

    return NextResponse.json({ form, event, fields: fields || [], participants: rows, counts });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
