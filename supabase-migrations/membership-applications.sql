-- Mitgliedsantraege (Membership applications)
-- Im Supabase Dashboard (SQL Editor) ausfuehren.

CREATE TABLE IF NOT EXISTS public.membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('regular','family','student')),
  message TEXT DEFAULT '',
  -- DSGVO: Einwilligungen mit Zeitstempel dokumentieren
  privacy_consent_at TIMESTAMPTZ NOT NULL,
  statutes_consent_at TIMESTAMPTZ NOT NULL,
  -- Missbrauchs-Analyse ohne Klartext-IP (nur gesalzener Hash)
  ip_hash TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT DEFAULT '',
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pro E-Mail nur ein offener Antrag (verhindert Duplikate auch bei Race Conditions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_pending_email
  ON public.membership_applications (lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_membership_status
  ON public.membership_applications (status, created_at DESC);

-- RLS aktivieren — alle Zugriffe laufen ausschliesslich ueber Service-Role in den API-Routen
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.membership_applications FROM anon, authenticated;
