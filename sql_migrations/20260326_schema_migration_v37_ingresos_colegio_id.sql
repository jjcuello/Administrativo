-- Migration v37 generated: 2026-03-26
-- Goal: allow ingresos to reference colegios directly for categories such as "Mañana".

BEGIN;

ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS colegio_id uuid;

DO $$
BEGIN
  IF to_regclass('public.colegios') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ingresos_colegio_id_fkey'
        AND conrelid = 'public.ingresos'::regclass
    ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT ingresos_colegio_id_fkey
      FOREIGN KEY (colegio_id)
      REFERENCES public.colegios(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ingresos_colegio_id ON public.ingresos(colegio_id);

COMMIT;