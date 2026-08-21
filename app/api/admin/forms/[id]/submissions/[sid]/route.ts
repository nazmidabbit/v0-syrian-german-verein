import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

const idSchema = z.string().uuid();

// DSGVO: einzelne Einsendung endgueltig loeschen
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'formulare')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id, sid } = await params;
    if (!idSchema.safeParse(id).success || !idSchema.safeParse(sid).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const { error } = await getSupabase()
      .from('form_submissions')
      .delete()
      .eq('id', sid)
      .eq('form_id', id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Einsendung gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
