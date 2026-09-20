import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Vermerkt, dass der Ausweis einer Person weitergegeben wurde. Nur so laesst
// sich in der Teilnehmerliste sehen, wer seinen QR-Code noch nicht hat.

const bodySchema = z
  .object({
    formId: z.string().uuid(),
    id: z.string().uuid(),
    // false nimmt den Vermerk zurueck, falls versehentlich gesetzt
    shared: z.boolean().default(true),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'teilnehmer')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const { formId, id, shared } = parsed.data;
    const supabase = getSupabase();

    const { data: row, error } = await supabase
      .from('form_submissions')
      .select('id, data')
      .eq('form_id', formId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('QR-Vermerk lesen:', error.code);
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 });

    const current = (row.data as Record<string, unknown>) || {};
    // Das Datum des ersten Versands bleibt stehen — es zaehlt, dass die Person
    // ihren Ausweis hat, nicht wie oft er verschickt wurde
    const sharedAt = shared ? (current.qr_geteilt_am as string) || new Date().toISOString() : '';

    const { error: updateError } = await supabase
      .from('form_submissions')
      .update({ data: { ...current, qr_geteilt_am: sharedAt } })
      .eq('id', id);

    if (updateError) {
      console.error('QR-Vermerk schreiben:', updateError.code);
      return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sharedAt });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
