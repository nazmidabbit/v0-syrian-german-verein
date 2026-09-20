import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { SUBMISSION_STATUSES } from '@/lib/forms';

export const dynamic = 'force-dynamic';

// Absagen und Wiederanmelden aus der Teilnehmerliste heraus.
//
// Bewusst kein Loeschen: Wer absagt, bleibt mit seiner Nummer stehen. Sonst
// muesste man bereits gedruckte Ausweise nachziehen, und es waere nicht mehr
// nachvollziehbar, wer eingeladen war. Endgueltiges Loeschen (DSGVO, samt
// Fotos) bleibt der Ergebnisseite unter der Berechtigung "formulare".

const bodySchema = z
  .object({
    formId: z.string().uuid(),
    id: z.string().uuid(),
    status: z.enum(SUBMISSION_STATUSES),
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

    const { formId, id, status } = parsed.data;

    // Eine Absage nimmt einen bereits gesetzten Check-in zurueck — sonst
    // zaehlte jemand als anwesend, der abgesagt hat.
    const update: Record<string, unknown> = { status };
    if (status === 'cancelled') update.checked_in_at = null;

    const { data, error } = await getSupabase()
      .from('form_submissions')
      .update(update)
      .eq('id', id)
      .eq('form_id', formId)
      .select('id, data, created_at, status, checked_in_at, email')
      .single();

    if (error || !data) {
      console.error('Teilnehmer-Status:', error?.code);
      return NextResponse.json({ error: 'Teilnehmer nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ participant: data });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
