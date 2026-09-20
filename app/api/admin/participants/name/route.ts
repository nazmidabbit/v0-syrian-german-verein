import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Namen eines Teilnehmers berichtigen — lateinisch und arabisch.
//
// Die alte Schreibweise wird dabei in alias_ar aufbewahrt. Das Import-Skript
// sucht auch danach; ohne diesen Vermerk findet es die Person beim naechsten
// Lauf nicht wieder und legt sie ein zweites Mal an.

const NO_CONTROL_CHARS = new RegExp('^[^\\u0000-\\u001F\\u007F]*$');
const name = z.string().trim().max(120).regex(NO_CONTROL_CHARS);

const bodySchema = z
  .object({
    formId: z.string().uuid(),
    id: z.string().uuid(),
    first_name: name,
    last_name: name,
    name_ar: name,
  })
  .strict()
  .refine((b) => b.first_name || b.last_name || b.name_ar, {
    message: 'Mindestens ein Name muss gefüllt sein.',
  });

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'teilnehmer')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const { formId, id, first_name, last_name, name_ar } = parsed.data;
    const supabase = getSupabase();

    const { data: row, error } = await supabase
      .from('form_submissions')
      .select('id, data')
      .eq('form_id', formId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Namensaenderung lesen:', error.code);
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 });

    const current = (row.data as Record<string, string>) || {};
    const alteSchreibweisen = new Set(
      String(current.alias_ar || '')
        .split('·')
        .map((s) => s.trim())
        .filter(Boolean),
    );

    const altAr = (current.name_ar || '').trim();
    const altLat = `${current.first_name || ''} ${current.last_name || ''}`.trim();
    const neuLat = `${first_name} ${last_name}`.trim();
    if (altAr && altAr !== name_ar) alteSchreibweisen.add(altAr);
    if (altLat && altLat !== neuLat) alteSchreibweisen.add(altLat);

    const { data: updated, error: updateError } = await supabase
      .from('form_submissions')
      .update({
        data: {
          ...current,
          first_name,
          last_name,
          name_ar,
          alias_ar: [...alteSchreibweisen].join(' · '),
        },
      })
      .eq('id', id)
      .select('id, data, created_at, status, checked_in_at, email')
      .single();

    if (updateError || !updated) {
      console.error('Namensaenderung schreiben:', updateError?.code);
      return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 });
    }

    return NextResponse.json({ participant: updated });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
