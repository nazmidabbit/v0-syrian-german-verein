import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !hasPermission(user, 'veranstaltungen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { id } = await params;
    const body = await request.json();
    const { title, titleAr, description, descriptionAr, date, imageUrls, videoUrls } = body;

    const { data: event, error } = await supabase
      .from('events')
      .update({
        title,
        title_ar: titleAr || '',
        description,
        description_ar: descriptionAr || '',
        date,
        image_urls: imageUrls || [],
        video_urls: videoUrls || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Event Update Fehler:', error);
      return NextResponse.json({ error: error.message || 'Fehler beim Aktualisieren.' }, { status: 500 });
    }

    if (!event) {
      return NextResponse.json({ error: 'Event nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Events.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !hasPermission(user, 'veranstaltungen')) {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { id } = await params;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Event nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Löschen des Events.' }, { status: 500 });
  }
}
