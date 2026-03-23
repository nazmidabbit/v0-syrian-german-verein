import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '0', 10);

    let query = supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data: news, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Laden der Nachrichten.' }, { status: 500 });
    }

    return NextResponse.json({ news: news || [] });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Laden der Nachrichten.' }, { status: 500 });
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
    const { title, titleAr, content, contentAr, imageUrl } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Titel und Inhalt sind erforderlich.' },
        { status: 400 }
      );
    }

    const { data: newsItem, error } = await supabase
      .from('news')
      .insert({
        title,
        title_ar: titleAr || '',
        content,
        content_ar: contentAr || '',
        image_url: imageUrl || '',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Erstellen der Nachricht.' }, { status: 500 });
    }

    return NextResponse.json({ news: newsItem }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Erstellen der Nachricht.' }, { status: 500 });
  }
}
