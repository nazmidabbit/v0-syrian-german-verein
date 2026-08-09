import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']),
    admin_note: z.string().trim().max(2000).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mitgliedsantraege')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: application, error } = await supabase
      .from('membership_applications')
      .update({
        status: parsed.data.status,
        admin_note: parsed.data.admin_note ?? '',
        processed_by: authUser.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status, admin_note, processed_at')
      .single();

    if (error || !application) {
      return NextResponse.json({ error: 'Antrag nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

// DSGVO: Antrag vollstaendig loeschen (Recht auf Loeschung)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'mitgliedsantraege')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('membership_applications')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Antrag gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
