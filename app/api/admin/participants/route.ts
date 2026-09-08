import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

// Auswahlliste der Formulare fuer die Teilnehmer-Seite.
// Eigene Berechtigung "teilnehmer": wer praesentieren darf, muss deshalb
// noch lange keine Formulare bearbeiten oder Einsendungen loeschen duerfen.
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'teilnehmer')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { data, error } = await getSupabase()
      .from('forms')
      .select('id, title, slug, event_id, max_participants, form_submissions(count)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Formulare fuer Teilnehmer-Seite:', error.code);
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    // Zaehler aus dem eingebetteten Aggregat flach machen
    const forms = (data || []).map((f: Record<string, unknown>) => ({
      id: f.id,
      title: f.title,
      slug: f.slug,
      event_id: f.event_id,
      max_participants: f.max_participants,
      submission_count: (f.form_submissions as { count: number }[])?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ forms });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
