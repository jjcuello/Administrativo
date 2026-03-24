-- Migration v8 generated: 2026-02-19
-- Goal: stabilize VIP schema/read model and avoid ambiguous embeds in PostgREST

BEGIN;

-- 1) Canonical profesor column for VIP services
ALTER TABLE public.clases_particulares
  ADD COLUMN IF NOT EXISTS profesor_id uuid;

-- 2) Safe backfill from legacy columns (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clases_particulares' AND column_name = 'personal_id'
  ) THEN
    EXECUTE '
      UPDATE public.clases_particulares
      SET profesor_id = COALESCE(profesor_id, personal_id)
      WHERE personal_id IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clases_particulares' AND column_name = 'docente_id'
  ) THEN
    EXECUTE '
      UPDATE public.clases_particulares
      SET profesor_id = COALESCE(profesor_id, docente_id)
      WHERE docente_id IS NOT NULL
    ';
  END IF;
END $$;

-- 3) Ensure canonical FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clases_particulares_profesor_id_fkey'
      AND conrelid = 'public.clases_particulares'::regclass
  ) THEN
    ALTER TABLE public.clases_particulares
      ADD CONSTRAINT clases_particulares_profesor_id_fkey
      FOREIGN KEY (profesor_id)
      REFERENCES public.personal(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4) Helpful indexes for catalog reads/filters
CREATE INDEX IF NOT EXISTS idx_clases_particulares_profesor_id ON public.clases_particulares(profesor_id);
CREATE INDEX IF NOT EXISTS idx_clases_particulares_estado ON public.clases_particulares(estado);
CREATE INDEX IF NOT EXISTS idx_clases_particulares_modalidad ON public.clases_particulares(modalidad);

-- 5) Canonical read model without relationship ambiguity
CREATE OR REPLACE VIEW public.v_clases_particulares_catalogo AS
SELECT
  cp.id,
  cp.nombre,
  cp.modalidad,
  cp.profesor_id,
  cp.tarifa,
  cp.tipo_cobro,
  cp.estado,
  cp.created_at,
  p.nombres AS profesor_nombres,
  p.apellidos AS profesor_apellidos
FROM public.clases_particulares cp
LEFT JOIN public.personal p
  ON p.id = cp.profesor_id;

COMMIT;
