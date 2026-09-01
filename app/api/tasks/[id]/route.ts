import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { buildRecurringFollowUp, TASK_COLUMNS, TASK_PRIORITIES, type TaskRecord } from '@/lib/tasks';

const idSchema = z.string().uuid();

// Zustaendige duerfen den Bearbeitungsstand pflegen; Titel, Frist & Co.
// nur, wenn sie die Aufgabe selbst angelegt haben (siehe Pruefung unten).
const patchSchema = z
  .object({
    status: z.enum(['open', 'in_progress', 'done']).optional(),
    completionNote: z.string().trim().max(1000).optional(),
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    dueAt: z.string().datetime().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    reminderLeadHours: z.number().int().min(0).max(720).optional(),
  })
  .strict();

const OWNER_ONLY_FIELDS = ['title', 'description', 'dueAt', 'priority', 'reminderLeadHours'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
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
    const { data: task } = await supabase
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    // Nur die zustaendige Person sieht und aendert ihre Aufgabe
    if (!task || task.assigned_to !== authUser.id) {
      return NextResponse.json({ error: 'Aufgabe nicht gefunden.' }, { status: 404 });
    }

    const isOwnTask = task.created_by === authUser.id;
    if (!isOwnTask && OWNER_ONLY_FIELDS.some((field) => parsed.data[field] !== undefined)) {
      return NextResponse.json(
        { error: 'Zugewiesene Aufgaben können nur im Status geändert werden.' },
        { status: 403 },
      );
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    if (parsed.data.priority !== undefined) update.priority = parsed.data.priority;
    if (parsed.data.completionNote !== undefined) update.completion_note = parsed.data.completionNote;
    if (parsed.data.reminderLeadHours !== undefined) {
      update.reminder_lead_hours = parsed.data.reminderLeadHours;
    }
    // Neue Frist: Vorab-Erinnerung darf erneut ausgeloest werden
    if (parsed.data.dueAt !== undefined) {
      update.due_at = parsed.data.dueAt;
      update.reminder_sent_at = null;
      update.overdue_reminder_count = 0;
      update.last_overdue_reminder_at = null;
    }
    if (parsed.data.status !== undefined) {
      update.status = parsed.data.status;
      update.completed_at = parsed.data.status === 'done' ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', id)
      .select(TASK_COLUMNS)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 });
    }

    // Wiederkehrende Aufgabe: beim Erledigen den naechsten Termin anlegen
    let followUp = null;
    if (parsed.data.status === 'done' && task.status !== 'done') {
      const payload = buildRecurringFollowUp(data as unknown as TaskRecord);
      if (payload) {
        const { data: created } = await supabase
          .from('tasks')
          .insert(payload)
          .select(TASK_COLUMNS)
          .single();
        followUp = created;
      }
    }

    return NextResponse.json({ task: data, followUp });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

// Loeschen nur fuer selbst angelegte Aufgaben - zugewiesene bleiben bestehen
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: task } = await supabase
      .from('tasks')
      .select('id, assigned_to, created_by')
      .eq('id', id)
      .maybeSingle();

    if (!task || task.assigned_to !== authUser.id) {
      return NextResponse.json({ error: 'Aufgabe nicht gefunden.' }, { status: 404 });
    }
    if (task.created_by !== authUser.id) {
      return NextResponse.json(
        { error: 'Zugewiesene Aufgaben können nicht gelöscht werden.' },
        { status: 403 },
      );
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Aufgabe gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
