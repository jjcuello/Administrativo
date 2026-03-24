-- Migration v5 generated: 2026-02-19
-- Goal: support many-to-many assignment between personal and colegios/clubs

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.personal_colegios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON UPDATE CASCADE ON DELETE CASCADE,
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON UPDATE CASCADE ON DELETE CASCADE,
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (personal_id, colegio_id)
);

-- If table already existed with an older shape, add missing columns safely
ALTER TABLE public.personal_colegios
  ADD COLUMN IF NOT EXISTS principal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_personal_colegios_personal_id ON public.personal_colegios(personal_id);
CREATE INDEX IF NOT EXISTS idx_personal_colegios_colegio_id ON public.personal_colegios(colegio_id);
CREATE INDEX IF NOT EXISTS idx_personal_colegios_principal ON public.personal_colegios(principal);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_personal_colegios_personal_colegio ON public.personal_colegios(personal_id, colegio_id);

-- Optional backfill from legacy column if it exists: personal.colegio_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'personal' AND column_name = 'colegio_id'
  ) THEN
    INSERT INTO public.personal_colegios (personal_id, colegio_id, principal)
    SELECT p.id, p.colegio_id, true
    FROM public.personal p
    WHERE p.colegio_id IS NOT NULL
    ON CONFLICT (personal_id, colegio_id) DO NOTHING;
  END IF;
END $$;

COMMIT;
