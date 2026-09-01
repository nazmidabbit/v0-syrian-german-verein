import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { TASK_COLUMNS, TASK_PRIORITIES, TASK_RECURRENCES } from '@/lib/tasks';

// Eigene Aufgabe anlegen: keine Zuweisung an Dritte, kein Eskalations-Flag
const createSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional().default(''),
    dueAt: z.string().datetime(),
    priority: z.enum(TASK_PRIORITIES).optional().default('normal'),
    reminderLeadHours: z.number().int().min(0).max(720).optional().default(24),
    recurrence: z.enum(TASK_RECURRENCES).optional().default('none'),
  })
  .strict();

// Aufgaben der angemeldeten Person - jedes freigeschaltete Konto darf das
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const { data, error } = await getSupabase()
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('assigned_to', authUser.id)
      .order('due_at', { ascending: true });

    if (error) {
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
    if (!authUser) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('tasks')
      .insert({
        title: parsed.data.title,
        description: parsed.data.description,
        assigned_to: authUser.id,
        created_by: authUser.id,
        due_at: parsed.data.dueAt,
        priority: parsed.data.priority,
        reminder_lead_hours: parsed.data.reminderLeadHours,
        recurrence: parsed.data.recurrence,
      })
      .select(TASK_COLUMNS)
      .single();

    if (error || !data) {
      console.error('Aufgabe konnte nicht angelegt werden:', error?.code);
      return NextResponse.json({ error: 'Fehler beim Erstellen.' }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}
