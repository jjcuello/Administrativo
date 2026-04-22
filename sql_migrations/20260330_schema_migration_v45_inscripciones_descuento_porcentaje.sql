-- Migration v45 generated: 2026-03-30
-- Goal: support per-class discount percentage on inscripciones for alumnos.

BEGIN;

ALTER TABLE public.inscripciones
  ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric(5,2);

UPDATE public.inscripciones
SET descuento_porcentaje = 0
WHERE descuento_porcentaje IS NULL;

ALTER TABLE public.inscripciones
  ALTER COLUMN descuento_porcentaje SET DEFAULT 0;

ALTER TABLE public.inscripciones
  DROP CONSTRAINT IF EXISTS chk_inscripciones_descuento_porcentaje_rango;

ALTER TABLE public.inscripciones
  ADD CONSTRAINT chk_inscripciones_descuento_porcentaje_rango
  CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100);

COMMIT;
