import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Vermerkt, dass der Ausweis einer Person weitergegeben wurde. Nur so laesst
// sich in der Teilnehmerliste sehen, wer seinen QR-Code noch nicht hat.
//
// Nimmt eine einzelne Person oder mehrere auf einmal — der Sammelversand
// schickt bis zu dreissig Ausweise in einem Rutsch, und dafuer soll nicht
// jeder einzeln beim Server anklopfen.

const bodySchema = z
  .object({
    formId: z.string().uuid(),
    id: z.string().uuid().optional(),
    ids: z.array(z.string().uuid()).min(1).max(200).optional(),
    // false nimmt den Vermerk zurueck, falls versehentlich gesetzt
    shared: z.boolean().default(true),
  })
  .strict()
  .refine((body) => body.id || body.ids, { message: 'id oder ids noetig' });

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

    const { formId, shared } = parsed.data;
    const ids = [...new Set([...(parsed.data.ids || []), ...(parsed.data.id ? [parsed.data.id] : [])])];
    const supabase = getSupabase();

    const { data: rows, error } = await supabase
      .from('form_submissions')
      .select('id, data')
      .eq('form_id', formId)
      .in('id', ids);

    if (error) {
      console.error('QR-Vermerk lesen:', error.code);
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const results = await Promise.all(
      rows.map(async (row) => {
        const current = (row.data as Record<string, unknown>) || {};
        // Das Datum des ersten Versands bleibt stehen — es zaehlt, dass die
        // Person ihren Ausweis hat, nicht wie oft er verschickt wurde
        const sharedAt = shared ? (current.qr_geteilt_am as string) || now : '';

        const { error: updateError } = await supabase
          .from('form_submissions')
          .update({ data: { ...current, qr_geteilt_am: sharedAt } })
          .eq('id', row.id);

        return { id: row.id, sharedAt, ok: !updateError };
      }),
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      console.error('QR-Vermerk schreiben fehlgeschlagen:', failed.length, 'von', results.length);
      return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      // Einzelabfragen erwarten weiterhin ein sharedAt
      sharedAt: results[0]?.sharedAt || '',
      updated: results.map((r) => ({ id: r.id, sharedAt: r.sharedAt })),
    });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
