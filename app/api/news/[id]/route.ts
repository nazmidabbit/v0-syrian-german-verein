import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, canEdit } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !canEdit(user.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { id } = await params;
    const body = await request.json();
    const { title, titleAr, content, contentAr, imageUrl, videoUrls, link } = body;

    const { data: newsItem, error } = await supabase
      .from('news')
      .update({
        title,
        title_ar: titleAr || '',
        content,
        content_ar: contentAr || '',
        image_url: imageUrl || '',
        video_urls: videoUrls || [],
        link: link || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('News Update Fehler:', error);
      return NextResponse.json({ error: error.message || 'Fehler beim Aktualisieren.' }, { status: 500 });
    }

    if (!newsItem) {
      return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ news: newsItem });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Nachricht.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !canEdit(user.role)) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { id } = await params;

    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Nachricht nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Nachricht gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Löschen der Nachricht.' }, { status: 500 });
  }
}
