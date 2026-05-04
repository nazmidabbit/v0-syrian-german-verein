-- Wahl-System: Tabellen + RLS
-- Im Supabase Dashboard (SQL Editor) ausfuehren.

-- 1) Wahlen
CREATE TABLE IF NOT EXISTS public.elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT DEFAULT '',
  description TEXT DEFAULT '',
  description_ar TEXT DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Kandidaten
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  bio_ar TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidates_election ON public.candidates(election_id);

-- 3) Stimmen — UNIQUE(election_id, user_id) erzwingt 1 Stimme pro User pro Wahl
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (election_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_election_candidate ON public.votes(election_id, candidate_id);

-- RLS aktivieren — alle Zugriffe laufen ueber Service-Role in den API-Routen
ALTER TABLE public.elections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes      ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.elections, public.candidates, public.votes FROM anon, authenticated;
