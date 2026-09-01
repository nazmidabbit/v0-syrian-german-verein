-- Formulare als Veranstaltungs-Anmeldung: Teilnehmerzahl, Warteliste,
-- Anmeldeschluss, Check-in und Foto-Upload als Feldtyp.
-- Setzt forms.sql voraus. Im Supabase Dashboard (SQL Editor) ausfuehren.

-- 1) Anmelde-Einstellungen am Formular
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  -- NULL = unbegrenzt
  ADD COLUMN IF NOT EXISTS max_participants INTEGER,
  -- NULL = kein Anmeldeschluss
  ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ,
  -- Bei Ueberbuchung auf Warteliste statt Ablehnung
  ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Dieselbe E-Mail darf sich nur einmal anmelden
  ADD COLUMN IF NOT EXISTS unique_by_email BOOLEAN NOT NULL DEFAULT false;

-- 2) Teilnahme-Status je Einsendung
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  -- Normalisierte E-Mail (klein) fuer Doppelanmeldungs-Pruefung und Export.
  -- Redundant zu data, aber nur so indizierbar.
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS form_submissions_status_check;
ALTER TABLE public.form_submissions ADD CONSTRAINT form_submissions_status_check
  CHECK (status IN ('confirmed','waitlist','cancelled'));

-- 3) Foto als neunter Feldtyp zulassen
ALTER TABLE public.form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;
ALTER TABLE public.form_fields ADD CONSTRAINT form_fields_field_type_check
  CHECK (
    field_type IN ('text','textarea','email','tel','date','number','select','checkbox','photo')
  );

-- 4) Indizes fuer Teilnehmerzahl, Doppelpruefung und Event-Verknuepfung
CREATE INDEX IF NOT EXISTS idx_form_submissions_status
  ON public.form_submissions (form_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_email
  ON public.form_submissions (form_id, email) WHERE email <> '';
CREATE INDEX IF NOT EXISTS idx_forms_event
  ON public.forms (event_id) WHERE event_id IS NOT NULL;
