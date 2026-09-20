import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Einlasskontrolle: QR-Code oder Teilnehmernummer nachschlagen und einchecken.
// Laeuft unter derselben Berechtigung wie die Teilnehmer-Seite — am Eingang
// steht selten jemand, der Formulare bearbeiten darf.

const bodySchema = z
  .object({
    formId: z.string().uuid(),
    // QR-Inhalt, Nummer oder ID — die Aufloesung macht der Server
    code: z.string().min(1).max(300),
    action: z.enum(['lookup', 'checkin', 'undo']).default('lookup'),
  })
  .strict();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Der QR-Code enthaelt eine Adresse wie https://…/admin/einlass?c=<id>.
// Wer stattdessen die Nummer eintippt, kommt hier mit "42" an.
function resolveCode(raw: string): { id?: string; nr?: string } {
  const code = raw.trim();

  if (UUID.test(code)) return { id: code };

  if (/^\d{1,6}$/.test(code)) return { nr: String(Number(code)) };

  if (/^https?:\/\//i.test(code)) {
    try {
      const url = new URL(code);
      const fromQuery = url.searchParams.get('c') || '';
      if (UUID.test(fromQuery)) return { id: fromQuery };
      if (/^\d{1,6}$/.test(fromQuery)) return { nr: String(Number(fromQuery)) };

      const last = url.pathname.split('/').filter(Boolean).pop() || '';
      if (UUID.test(last)) return { id: last };
    } catch {
      // kein gueltiger Link — faellt unten durch
    }
  }

  return {};
}

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

    const { formId, code, action } = parsed.data;
    const target = resolveCode(code);
    if (!target.id && !target.nr) {
      return NextResponse.json({ found: false, reason: 'unreadable' });
    }

    const supabase = getSupabase();
    const query = supabase
      .from('form_submissions')
      .select('id, data, status, checked_in_at')
      .eq('form_id', formId);

    const { data: found, error } = target.id
      ? await query.eq('id', target.id).maybeSingle()
      : await query.eq('data->>teilnehmer_nr', target.nr).maybeSingle();

    if (error) {
      console.error('Einlass-Suche:', error.code);
      return NextResponse.json({ error: 'Fehler beim Suchen.' }, { status: 500 });
    }
    // Unbekannter Code: die Person steht nicht auf der Liste
    if (!found) return NextResponse.json({ found: false, reason: 'unknown' });

    let participant = found;
    const wasCheckedIn = Boolean(found.checked_in_at);

    // Ein zweiter Scan derselben Person darf den ersten Zeitpunkt nicht
    // ueberschreiben — sonst ist nicht mehr zu sehen, wann sie kam.
    if ((action === 'checkin' && !wasCheckedIn) || action === 'undo') {
      const { data: updated, error: updateError } = await supabase
        .from('form_submissions')
        .update({ checked_in_at: action === 'undo' ? null : new Date().toISOString() })
        .eq('id', found.id)
        .select('id, data, status, checked_in_at')
        .single();

      if (updateError) {
        console.error('Einlass-Check-in:', updateError.code);
        return NextResponse.json({ error: 'Check-in fehlgeschlagen.' }, { status: 500 });
      }
      participant = updated;
    }

    const { count: checkedIn } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId)
      .not('checked_in_at', 'is', null);

    return NextResponse.json({
      found: true,
      alreadyCheckedIn: action === 'checkin' && wasCheckedIn,
      participant,
      checkedIn: checkedIn || 0,
    });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
