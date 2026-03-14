import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

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
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { title, titleAr, description, descriptionAr, date, imageUrls } = body;

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
