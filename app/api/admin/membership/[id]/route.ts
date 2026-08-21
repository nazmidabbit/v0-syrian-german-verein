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

    // Vorherigen Status holen — Annahme-Mail nur beim echten Wechsel auf 'approved'
    const { data: before } = await supabase
      .from('membership_applications')
      .select('status, email, first_name')
      .eq('id', id)
      .maybeSingle();

    if (!before) {
      return NextResponse.json({ error: 'Antrag nicht gefunden.' }, { status: 404 });
    }

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

    // Bei Annahme: Mitgliedsnummer atomar vergeben (bestehende Nummer bleibt erhalten)
    let memberNumber: number | null = null;
    if (parsed.data.status === 'approved') {
      const { data: num, error: numError } = await supabase.rpc('assign_member_number', { app_id: id });
      if (numError) {
        console.error('Mitgliedsnummer-Vergabe fehlgeschlagen:', numError.message);
      } else {
        memberNumber = num;
      }
    }

    // Bestaetigungs-Mail an Antragsteller — Fehler dabei duerfen die Annahme nicht scheitern lassen
    let emailSent = false;
    if (parsed.data.status === 'approved' && before.status !== 'approved' && process.env.SMTP_HOST) {
      try {
        const { sendMembershipApprovedEmail } = await import('@/lib/mailer');
        await sendMembershipApprovedEmail(before.email, before.first_name, memberNumber);
        emailSent = true;
      } catch (mailError) {
        console.error('Annahme-Mail fehlgeschlagen:', mailError);
      }
    }

    return NextResponse.json({ application, emailSent, memberNumber });
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

    // Foto-URL vor dem Loeschen merken (Spalte kann fehlen, wenn Migration nicht lief)
    let photoUrl = '';
    try {
      const { data: app } = await supabase
        .from('membership_applications')
        .select('photo_url')
        .eq('id', id)
        .maybeSingle();
      photoUrl = app?.photo_url || '';
    } catch {
      // photo_url existiert noch nicht — nichts zu entfernen
    }

    const { error } = await supabase
      .from('membership_applications')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    // DSGVO: Foto aus dem Storage entfernen — best effort
    if (photoUrl) {
      const marker = '/uploads/';
      const idx = photoUrl.indexOf(marker);
      if (idx !== -1) {
        const path = photoUrl.slice(idx + marker.length);
        const { error: removeError } = await supabase.storage.from('uploads').remove([path]);
        if (removeError) {
          console.error('Antrags-Foto konnte nicht geloescht werden:', removeError.message);
        }
      }
    }

    return NextResponse.json({ message: 'Antrag gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
