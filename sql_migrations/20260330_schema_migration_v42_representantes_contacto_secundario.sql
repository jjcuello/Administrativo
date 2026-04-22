-- Migration v42 generated: 2026-03-30
-- Goal: add optional secondary representative contact fields without impacting existing data.

BEGIN;

ALTER TABLE public.representantes
  ADD COLUMN IF NOT EXISTS representante2_nombre_apellido text,
  ADD COLUMN IF NOT EXISTS representante2_telefono text;

COMMIT;
