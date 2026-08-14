-- Mitgliedsnummer: fortlaufend, vergeben bei Annahme des Antrags
-- Im Supabase Dashboard (SQL Editor) ausfuehren.

-- 1) Spalte + Eindeutigkeit
ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS member_number INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_member_number
  ON public.membership_applications (member_number)
  WHERE member_number IS NOT NULL;

-- 2) Sequenz fuer neue Nummern
CREATE SEQUENCE IF NOT EXISTS public.member_number_seq START 1;

-- 3) Bereits angenommene Antraege ohne Nummer bekommen fortlaufende Nummern
--    (aelteste Annahme zuerst)
WITH numbered AS (
  SELECT id,
         row_number() OVER (ORDER BY processed_at NULLS LAST, created_at) AS rn
  FROM public.membership_applications
  WHERE status = 'approved' AND member_number IS NULL
),
base AS (
  SELECT COALESCE(MAX(member_number), 0) AS max_num
  FROM public.membership_applications
)
UPDATE public.membership_applications m
SET member_number = numbered.rn + base.max_num
FROM numbered, base
WHERE m.id = numbered.id;

-- 4) Sequenz hinter die hoechste vergebene Nummer setzen
SELECT setval(
  'public.member_number_seq',
  COALESCE((SELECT MAX(member_number) FROM public.membership_applications), 0) + 1,
  false
);

-- 5) Atomare Vergabe-Funktion: vergibt nur, wenn noch keine Nummer existiert,
--    und gibt die (neue oder bestehende) Nummer zurueck
CREATE OR REPLACE FUNCTION public.assign_member_number(app_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  num INTEGER;
BEGIN
  SELECT member_number INTO num
  FROM public.membership_applications
  WHERE id = app_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF num IS NULL THEN
    num := nextval('public.member_number_seq');
    UPDATE public.membership_applications
    SET member_number = num
    WHERE id = app_id;
  END IF;

  RETURN num;
END;
$$;

-- Zugriff nur ueber Service-Role (API-Routen)
REVOKE ALL ON FUNCTION public.assign_member_number(UUID) FROM anon, authenticated;
