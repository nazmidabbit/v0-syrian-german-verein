-- Neue optionale Felder: Geburtsort, Beruf & Abschluss/Qualifikation
-- Nur noetig, wenn die Tabelle membership_applications bereits existiert.
-- Im Supabase Dashboard (SQL Editor) ausfuehren.

ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS birth_place TEXT DEFAULT '';

ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT '';

ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS certificate TEXT DEFAULT '';
