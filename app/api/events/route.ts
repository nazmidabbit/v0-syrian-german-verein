import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '0', 10);

    let query = supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data: events, error } = await query;

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
