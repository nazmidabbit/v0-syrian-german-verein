import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { id } = await params;
    const body = await request.json();
    const { title, titleAr, description, descriptionAr, date, imageUrls } = body;

    const { data: event, error } = await supabase
      .from('events')
      .update({
        title,
        title_ar: titleAr || '',
        description,
        description_ar: descriptionAr || '',
        date,
        image_urls: imageUrls || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !event) {
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
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
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
