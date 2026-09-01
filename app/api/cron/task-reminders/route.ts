import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { getAuthUser, hasPermission } from '@/lib/auth';
import {
  ACTIVE_STATUSES,
  MAX_OVERDUE_REMINDERS,
  OVERDUE_REMINDER_INTERVAL_HOURS,
  TASK_COLUMNS_WITH_USERS,
} from '@/lib/tasks';
import { sendTaskDueSoonEmail, sendTaskOverdueEmail } from '@/lib/mailer';

// Der Job braucht zusaetzlich die internen Erinnerungs-Zeitstempel
const REMINDER_COLUMNS = `${TASK_COLUMNS_WITH_USERS}, reminder_sent_at, overdue_reminder_count, last_overdue_reminder_at`;

// Aufgaben, deren Frist weiter als 30 Tage entfernt ist, sind noch kein Thema
const HORIZON_DAYS = 30;
const MAX_TASKS_PER_RUN = 500;

interface UserRef {
  id: string;
  name: string | null;
  email: string | null;
}

interface ReminderTask {
  id: string;
  title: string;
  description: string;
  due_at: string;
  reminder_lead_hours: number;
  reminder_sent_at: string | null;
  overdue_reminder_count: number;
  last_overdue_reminder_at: string | null;
  escalate_to_creator: boolean;
  assignee: UserRef | null;
  creator: UserRef | null;
}

// Konstante Laufzeit, damit das Secret nicht per Timing erraten werden kann
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Zugriff entweder per CRON_SECRET (externer Scheduler) oder
// als angemeldete Person mit der Berechtigung "aufgaben" (Knopf im Admin).
async function isAuthorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization') || '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : request.headers.get('x-cron-secret') || '';
    if (provided && secretMatches(provided, secret)) return true;
  }

  const authUser = await getAuthUser();
  return Boolean(authUser && hasPermission(authUser, 'aufgaben'));
}

async function runReminders() {
  const supabase = getSupabase();
  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .select(REMINDER_COLUMNS)
    .in('status', ACTIVE_STATUSES)
    .lte('due_at', horizon)
    .order('due_at', { ascending: true })
    .limit(MAX_TASKS_PER_RUN);

  if (error) {
    throw new Error(`Aufgaben konnten nicht geladen werden: ${error.code}`);
  }

  const tasks = (data || []) as unknown as ReminderTask[];
  let dueSoonSent = 0;
  let overdueSent = 0;
  let failed = 0;

  for (const task of tasks) {
    const email = task.assignee?.email;
    if (!email) continue;

    const mailData = {
      title: task.title,
      description: task.description || '',
      dueAt: task.due_at,
      assigneeName: task.assignee?.name || '',
    };
    const dueTime = new Date(task.due_at).getTime();

    try {
      if (dueTime <= now.getTime()) {
        // Ueberfaellig: hoechstens eine Mail pro Intervall und insgesamt gedeckelt
        if (task.overdue_reminder_count >= MAX_OVERDUE_REMINDERS) continue;

        const last = task.last_overdue_reminder_at ? new Date(task.last_overdue_reminder_at).getTime() : 0;
        if (now.getTime() - last < OVERDUE_REMINDER_INTERVAL_HOURS * 3600_000) continue;

        const cc = task.escalate_to_creator && task.creator?.email && task.creator.email !== email
          ? task.creator.email
          : undefined;

        await sendTaskOverdueEmail(email, mailData, cc);
        await supabase
          .from('tasks')
          .update({
            overdue_reminder_count: task.overdue_reminder_count + 1,
            last_overdue_reminder_at: now.toISOString(),
          })
          .eq('id', task.id);
        overdueSent++;
        continue;
      }

      // Vorab-Erinnerung: einmalig, sobald das Zeitfenster erreicht ist
      if (!task.reminder_lead_hours || task.reminder_sent_at) continue;
      if (dueTime - task.reminder_lead_hours * 3600_000 > now.getTime()) continue;

      await sendTaskDueSoonEmail(email, mailData);
      await supabase.from('tasks').update({ reminder_sent_at: now.toISOString() }).eq('id', task.id);
      dueSoonSent++;
    } catch (mailError) {
      // Eine fehlgeschlagene Mail darf den restlichen Lauf nicht stoppen
      console.error('Erinnerung fehlgeschlagen für Aufgabe', task.id, mailError);
      failed++;
    }
  }

  return { checked: tasks.length, dueSoonSent, overdueSent, failed };
}

async function handle(request: Request) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
    }

    const result = await runReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Erinnerungs-Job fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

// GET fuer Scheduler (Vercel Cron, curl), POST fuer den Knopf im Admin-Bereich
export const GET = handle;
export const POST = handle;
