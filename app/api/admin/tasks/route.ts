import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';
import { TASK_COLUMNS_WITH_USERS, TASK_PRIORITIES, TASK_RECURRENCES, TASK_STATUSES } from '@/lib/tasks';
import { sendTaskAssignedEmail } from '@/lib/mailer';

const createSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    titleAr: z.string().trim().max(200).optional().default(''),
    description: z.string().trim().max(2000).optional().default(''),
    descriptionAr: z.string().trim().max(2000).optional().default(''),
    assignedTo: z.string().uuid(),
    dueAt: z.string().datetime(),
    priority: z.enum(TASK_PRIORITIES).optional().default('normal'),
    reminderLeadHours: z.number().int().min(0).max(720).optional().default(24),
    escalateToCreator: z.boolean().optional().default(false),
    recurrence: z.enum(TASK_RECURRENCES).optional().default('none'),
    notify: z.boolean().optional().default(true),
  })
  .strict();

const listSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  assignedTo: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'aufgaben')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsed = listSchema.safeParse({
      status: url.searchParams.get('status') || undefined,
      assignedTo: url.searchParams.get('assignedTo') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültiger Filter.' }, { status: 400 });
    }

    let query = getSupabase().from('tasks').select(TASK_COLUMNS_WITH_USERS);
    if (parsed.data.status) query = query.eq('status', parsed.data.status);
    if (parsed.data.assignedTo) query = query.eq('assigned_to', parsed.data.assignedTo);

    const { data, error } = await query.order('due_at', { ascending: true });

    if (error) {
      console.error('Aufgaben konnten nicht geladen werden:', error.code);
      return NextResponse.json({ error: 'Fehler beim Laden.' }, { status: 500 });
    }

    return NextResponse.json({ tasks: data || [] });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !hasPermission(authUser, 'aufgaben')) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 403 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Nur freigeschaltete Konten koennen Aufgaben uebernehmen
    const { data: assignee } = await supabase
      .from('users')
      .select('id, name, email, is_verified')
      .eq('id', parsed.data.assignedTo)
      .maybeSingle();

    if (!assignee || !assignee.is_verified) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden oder nicht freigeschaltet.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: parsed.data.title,
        title_ar: parsed.data.titleAr,
        description: parsed.data.description,
        description_ar: parsed.data.descriptionAr,
        assigned_to: parsed.data.assignedTo,
        created_by: authUser.id,
        due_at: parsed.data.dueAt,
        priority: parsed.data.priority,
        reminder_lead_hours: parsed.data.reminderLeadHours,
        escalate_to_creator: parsed.data.escalateToCreator,
        recurrence: parsed.data.recurrence,
      })
      .select(TASK_COLUMNS_WITH_USERS)
      .single();

    if (error || !data) {
      console.error('Aufgabe konnte nicht angelegt werden:', error?.code);
      return NextResponse.json({ error: 'Fehler beim Erstellen.' }, { status: 500 });
    }

    // Zuweisungs-Mail ist optional und darf das Anlegen nicht scheitern lassen
    let mailSent = false;
    if (parsed.data.notify && assignee.email && assignee.id !== authUser.id) {
      try {
        await sendTaskAssignedEmail(assignee.email, {
          title: parsed.data.title,
          description: parsed.data.description,
          dueAt: parsed.data.dueAt,
          assigneeName: assignee.name || '',
        });
        mailSent = true;
      } catch (mailError) {
        console.error('Zuweisungs-Mail fehlgeschlagen:', mailError);
      }
    }

    return NextResponse.json({ task: data, mailSent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
