// Aufgabenverwaltung: Status/Prioritaet/Wiederholung, Fristen-Helfer und
// die Regeln fuer die E-Mail-Erinnerungen.
// Wird von Client (Aufgaben-Seiten) und Server (API + Cron) genutzt.

// Spaltenliste fuer alle Aufgaben-Abfragen (ohne die internen Erinnerungs-Zeitstempel)
export const TASK_COLUMNS =
  'id, title, title_ar, description, description_ar, assigned_to, created_by, due_at, priority, status, completed_at, completion_note, reminder_lead_hours, escalate_to_creator, recurrence, created_at, updated_at';

// Zusaetzlich mit Zustaendiger/Ersteller (FK-Embed) - fuer die Admin-Ansicht
export const TASK_COLUMNS_WITH_USERS =
  `${TASK_COLUMNS}, assignee:users!tasks_assigned_to_fkey(id, name, email), creator:users!tasks_created_by_fkey(id, name, email)`;

export const TASK_STATUSES = ['open', 'in_progress', 'done', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export const TASK_RECURRENCES = ['none', 'daily', 'weekly', 'monthly'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

// Noch zu erledigen - nur diese Aufgaben erzeugen Erinnerungen
export const ACTIVE_STATUSES: TaskStatus[] = ['open', 'in_progress'];

// Erinnerungs-Regeln fuer ueberfaellige Aufgaben
export const OVERDUE_REMINDER_INTERVAL_HOURS = 24;
export const MAX_OVERDUE_REMINDERS = 5;

// Admin-Oberflaeche ist durchgaengig deutsch (wie die uebrigen Admin-Seiten)
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Offen',
  in_progress: 'In Arbeit',
  done: 'Erledigt',
  cancelled: 'Abgebrochen',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
};

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  none: 'Einmalig',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
};

// Auswahl fuer die Vorab-Erinnerung (Stunden vor der Frist)
export const REMINDER_LEAD_OPTIONS = [
  { value: 0, label: 'Keine Vorab-Erinnerung' },
  { value: 1, label: '1 Stunde vorher' },
  { value: 6, label: '6 Stunden vorher' },
  { value: 24, label: '1 Tag vorher' },
  { value: 48, label: '2 Tage vorher' },
  { value: 72, label: '3 Tage vorher' },
  { value: 168, label: '1 Woche vorher' },
];

export interface TaskRecord {
  id: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  assigned_to: string;
  created_by: string | null;
  due_at: string;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  completion_note: string;
  reminder_lead_hours: number;
  reminder_sent_at: string | null;
  overdue_reminder_count: number;
  last_overdue_reminder_at: string | null;
  escalate_to_creator: boolean;
  recurrence: TaskRecurrence;
  created_at: string;
  updated_at: string;
}

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as TaskStatus);
}

// Ueberfaellig = Frist verstrichen und noch nicht erledigt/abgebrochen
export function isOverdue(task: Pick<TaskRecord, 'due_at' | 'status'>, now: Date = new Date()): boolean {
  return isActiveStatus(task.status) && new Date(task.due_at).getTime() < now.getTime();
}

// Naechste Frist bei wiederkehrenden Aufgaben. Monatlich wird auf den
// letzten Tag des Folgemonats begrenzt (31.01. -> 28./29.02.), damit der
// Termin nicht in den uebernaechsten Monat springt.
export function nextDueDate(dueAt: string, recurrence: TaskRecurrence): string | null {
  if (recurrence === 'none') return null;

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  if (recurrence === 'daily') {
    due.setUTCDate(due.getUTCDate() + 1);
    return due.toISOString();
  }

  if (recurrence === 'weekly') {
    due.setUTCDate(due.getUTCDate() + 7);
    return due.toISOString();
  }

  const day = due.getUTCDate();
  due.setUTCDate(1);
  due.setUTCMonth(due.getUTCMonth() + 1);
  const daysInMonth = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0)).getUTCDate();
  due.setUTCDate(Math.min(day, daysInMonth));
  return due.toISOString();
}

// Zeitpunkt der Vorab-Erinnerung; null, wenn keine gewuenscht ist
export function reminderDueAt(dueAt: string, leadHours: number): string | null {
  if (!leadHours) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  return new Date(due.getTime() - leadHours * 3600_000).toISOString();
}

// Einheitliche Datums-/Zeitausgabe fuer Oberflaeche und E-Mails
export function formatDueDate(dueAt: string, locale: 'de' | 'ar' = 'de'): string {
  return new Date(dueAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

// Datensatz der Folge-Aufgabe einer wiederkehrenden Aufgabe.
// null, wenn die Aufgabe einmalig ist oder die Frist unbrauchbar ist.
// Erinnerungs-Zaehler starten bewusst wieder bei null.
export function buildRecurringFollowUp(task: TaskRecord): Record<string, unknown> | null {
  const nextDue = nextDueDate(task.due_at, task.recurrence);
  if (!nextDue) return null;

  return {
    title: task.title,
    title_ar: task.title_ar || '',
    description: task.description || '',
    description_ar: task.description_ar || '',
    assigned_to: task.assigned_to,
    created_by: task.created_by,
    due_at: nextDue,
    priority: task.priority,
    status: 'open',
    reminder_lead_hours: task.reminder_lead_hours,
    escalate_to_creator: task.escalate_to_creator,
    recurrence: task.recurrence,
  };
}
