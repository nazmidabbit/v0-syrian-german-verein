-- Aufgabenverwaltung: Aufgaben mit Frist, Status und E-Mail-Erinnerungen
-- Im Supabase Dashboard (SQL Editor) ausfuehren.

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_ar TEXT DEFAULT '',
  -- Zustaendige Person: loescht sich das Konto, verschwindet auch die Aufgabe
  assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- Frist; Pflichtfeld, da Erinnerungen daran haengen
  due_at TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  completed_at TIMESTAMPTZ,
  completion_note TEXT DEFAULT '',
  -- Vorab-Erinnerung X Stunden vor der Frist (0 = keine Vorab-Erinnerung)
  reminder_lead_hours INTEGER NOT NULL DEFAULT 24 CHECK (reminder_lead_hours BETWEEN 0 AND 720),
  reminder_sent_at TIMESTAMPTZ,
  -- Ueberfaellig-Erinnerungen: hoechstens eine pro Tag und gedeckelt (siehe lib/tasks.ts)
  overdue_reminder_count INTEGER NOT NULL DEFAULT 0,
  last_overdue_reminder_at TIMESTAMPTZ,
  -- Kopie der Ueberfaellig-Mail an die erstellende Person (Eskalation)
  escalate_to_creator BOOLEAN NOT NULL DEFAULT false,
  -- Wiederholung: beim Erledigen wird die naechste Aufgabe automatisch angelegt
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- "Meine Aufgaben" (nach Zustaendigem) und der Erinnerungs-Job (nach Frist)
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks (assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks (status, due_at);

-- RLS aktivieren - alle Zugriffe laufen ausschliesslich ueber Service-Role in den API-Routen
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tasks FROM anon, authenticated;
