-- Arbeitsbueros als Stammdaten + Erweiterung der Mitgliedsantraege (Foto, Wunsch-Buero)
-- Im Supabase Dashboard (SQL Editor) ausfuehren.

CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS aktivieren — alle Zugriffe laufen ausschliesslich ueber Service-Role in den API-Routen
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.offices FROM anon, authenticated;

-- Die 14 Arbeitsbueros aus der Vereinspraesentation (idempotent)
INSERT INTO public.offices (name, name_ar, sort_order) VALUES
  ('Verwaltung', 'المكتب الإداري', 1),
  ('Finanzen', 'المكتب المالي', 2),
  ('Kultur', 'المكتب الثقافي', 3),
  ('Soziales', 'المكتب الاجتماعي', 4),
  ('Öffentlichkeit', 'مكتب العلاقات العامة', 5),
  ('Medien', 'المكتب الإعلامي', 6),
  ('Recht', 'المكتب القانوني', 7),
  ('Talente', 'الكفاءات والتأهيل', 8),
  ('Projekte', 'المشاريع والتمويل', 9),
  ('Jugend', 'الشباب والرياضة', 10),
  ('Familie', 'المرأة والأسرة', 11),
  ('Integration', 'الاندماج والاستشارات', 12),
  ('Wirtschaft', 'المكتب الاقتصادي', 13),
  ('Medizinisches Büro', 'المكتب الطبي', 14)
ON CONFLICT (name) DO NOTHING;

-- Mitgliedsantraege erweitern: Wunsch-Buero + Foto.
-- Beitragsart wird vorerst nicht mehr abgefragt (kommt zurueck, sobald das
-- Vereinskonto/IBAN existiert) — daher NOT NULL entfernen. Der bestehende
-- CHECK-Constraint bleibt und laesst NULL durch.
ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL;

ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';

ALTER TABLE public.membership_applications
  ALTER COLUMN membership_type DROP NOT NULL;
