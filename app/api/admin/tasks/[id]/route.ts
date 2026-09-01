import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';
import {
  buildRecurringFollowUp,
  TASK_COLUMNS_WITH_USERS,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  TASK_STATUSES,
  type TaskRecord,
} from '@/lib/tasks';

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    titleAr: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    descriptionAr: z.string().trim().max(2000).optional(),
    assignedTo: z.string().uuid().optional(),
    dueAt: z.string().datetime().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    completionNote: z.string().trim().max(1000).optional(),
    reminderLeadHours: z.number().int().min(0).max(720).optional(),
    escalateToCreator: z.boolean().optional(),
    recurrence: z.enum(TASK_RECURRENCES).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'aufgaben')) {
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
    const { data: current } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: 'Aufgabe nicht gefunden.' }, { status: 404 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.title !== undefined) update.title = parsed.data.title;
    if (parsed.data.titleAr !== undefined) update.title_ar = parsed.data.titleAr;
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    if (parsed.data.descriptionAr !== undefined) update.description_ar = parsed.data.descriptionAr;
    if (parsed.data.assignedTo !== undefined) update.assigned_to = parsed.data.assignedTo;
    if (parsed.data.priority !== undefined) update.priority = parsed.data.priority;
    if (parsed.data.completionNote !== undefined) update.completion_note = parsed.data.completionNote;
    if (parsed.data.escalateToCreator !== undefined) update.escalate_to_creator = parsed.data.escalateToCreator;
    if (parsed.data.recurrence !== undefined) update.recurrence = parsed.data.recurrence;
    if (parsed.data.reminderLeadHours !== undefined) {
      update.reminder_lead_hours = parsed.data.reminderLeadHours;
      update.reminder_sent_at = null;
    }
    // Neue Frist: Erinnerungen duerfen erneut ausgeloest werden
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
      .select(TASK_COLUMNS_WITH_USERS)
      .single();

    if (error || !data) {
      console.error('Aufgabe konnte nicht gespeichert werden:', error?.code);
      return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 });
    }

    // Wiederkehrende Aufgabe: beim Erledigen den naechsten Termin anlegen
    if (parsed.data.status === 'done' && current.status !== 'done') {
      const payload = buildRecurringFollowUp(data as unknown as TaskRecord);
      if (payload) await supabase.from('tasks').insert(payload);
    }

    return NextResponse.json({ task: data });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'aufgaben')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: 'Ungültige ID.' }, { status: 400 });
    }

    const { error } = await getSupabase().from('tasks').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Aufgabe gelöscht.' });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
