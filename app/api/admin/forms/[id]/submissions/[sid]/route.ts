import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { SUBMISSION_STATUSES } from '@/lib/forms';

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    status: z.enum(SUBMISSION_STATUSES).optional(),
    // true = jetzt einchecken, false = Check-in zuruecknehmen
    checkedIn: z.boolean().optional(),
  })
  .strict();

// Teilnahme-Status setzen oder am Veranstaltungstag einchecken
export async function PATCH(
  request: Request,
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

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) update.status = parsed.data.status;
    if (parsed.data.checkedIn !== undefined) {
      update.checked_in_at = parsed.data.checkedIn ? new Date().toISOString() : null;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nichts zu ändern.' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('form_submissions')
      .update(update)
      .eq('id', sid)
      .eq('form_id', id)
      .select('id, data, created_at, status, checked_in_at, email')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Einsendung nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

// Storage-Pfad aus einer oeffentlichen Supabase-URL herausloesen
const PUBLIC_PREFIX = '/storage/v1/object/public/uploads/';

function storagePathFromUrl(url: string): string | null {
  const index = url.indexOf(PUBLIC_PREFIX);
  return index < 0 ? null : url.slice(index + PUBLIC_PREFIX.length);
}

// DSGVO: einzelne Einsendung endgueltig loeschen — samt hochgeladener Fotos,
// die sonst ueber ihre oeffentliche URL erreichbar blieben.
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

    const supabase = getSupabase();

    // Erst die Fotos einsammeln, solange der Datensatz noch existiert
    const { data: submission } = await supabase
      .from('form_submissions')
      .select('data')
      .eq('id', sid)
      .eq('form_id', id)
      .maybeSingle();

    const { data: photoFields } = await supabase
      .from('form_fields')
      .select('field_key')
      .eq('form_id', id)
      .eq('field_type', 'photo');

    const paths: string[] = [];
    for (const field of photoFields || []) {
      const value = (submission?.data as Record<string, unknown> | undefined)?.[field.field_key];
      if (typeof value !== 'string' || !value) continue;
      const path = storagePathFromUrl(value);
      if (path) paths.push(path);
    }

    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', sid)
      .eq('form_id', id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    // Datensatz ist weg — ein fehlgeschlagener Datei-Loeschlauf darf die
    // Antwort nicht mehr kippen, aber er gehoert ins Log.
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from('uploads').remove(paths);
      if (storageError) {
        console.error('Fotos der Einsendung nicht geloescht:', storageError.message);
      }
    }

    return NextResponse.json({ message: 'Einsendung gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
