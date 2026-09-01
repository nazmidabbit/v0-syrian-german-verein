import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '0', 10);

    // Verknuepftes Anmeldeformular mitladen (forms.event_id -> events.id).
    // Solange event-registration.sql nicht eingespielt ist, gibt es die
    // Verknuepfung nicht — dann ohne sie laden statt die Seite zu brechen.
    const buildQuery = (columns: string) => {
      const query = supabase.from('events').select(columns).order('date', { ascending: false });
      return limit > 0 ? query.limit(limit) : query;
    };

    let { data: events, error } = await buildQuery(
      '*, registration_forms:forms!forms_event_id_fkey(slug, is_active, closes_at)',
    );

    if (error) {
      console.warn('Events ohne Anmelde-Verknuepfung geladen:', error.message);
      ({ data: events, error } = await buildQuery('*'));
    }

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden der Events.' }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Events.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !hasPermission(user, 'veranstaltungen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { title, titleAr, description, descriptionAr, date, imageUrls, videoUrls } = body;

    if (!title || !description || !date) {
      return NextResponse.json(
        { error: 'Titel, Beschreibung und Datum sind erforderlich.' },
        { status: 400 }
      );
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title,
        title_ar: titleAr || '',
        description,
        description_ar: descriptionAr || '',
        date,
        image_urls: imageUrls || [],
        video_urls: videoUrls || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Erstellen des Events.' }, { status: 500 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen des Events.' }, { status: 500 });
  }
}
