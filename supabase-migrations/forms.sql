-- Dynamischer Formular-Baukasten: Formulare, Felddefinitionen, Einsendungen
-- Im Supabase Dashboard (SQL Editor) ausfuehren.

CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_ar TEXT DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  -- Neue Formulare starten als Entwurf und werden erst nach der
  -- Felddefinition aktiviert (nur aktive sind oeffentlich erreichbar)
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  label_ar TEXT DEFAULT '',
  field_type TEXT NOT NULL CHECK (
    field_type IN ('text','textarea','email','tel','date','number','select','checkbox')
  ),
  -- Auswahl-Optionen (nur field_type = 'select'): parallele Arrays DE/AR
  options JSONB NOT NULL DEFAULT '[]',
  options_ar JSONB NOT NULL DEFAULT '[]',
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (form_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  -- Werte als JSON-Objekt {field_key: wert}, serverseitig validiert
  data JSONB NOT NULL DEFAULT '{}',
  -- DSGVO: Einwilligung in die Datenschutzerklaerung mit Zeitstempel
  privacy_consent_at TIMESTAMPTZ,
  -- Missbrauchs-Analyse ohne Klartext-IP (nur gesalzener Hash)
  ip_hash TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nachruestung fuer Installationen, die forms.sql bereits ausgefuehrt haben
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_form_fields_form
  ON public.form_fields (form_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form
  ON public.form_submissions (form_id, created_at DESC);

-- RLS aktivieren — alle Zugriffe laufen ausschliesslich ueber Service-Role in den API-Routen
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.forms FROM anon, authenticated;
REVOKE ALL ON public.form_fields FROM anon, authenticated;
REVOKE ALL ON public.form_submissions FROM anon, authenticated;
