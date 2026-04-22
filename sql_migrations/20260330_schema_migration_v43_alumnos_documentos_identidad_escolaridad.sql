-- Migration v43 generated: 2026-03-30
-- Goal: add identity/passport/school fields to alumnos without affecting existing records.

BEGIN;

ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS cedula_identidad_numero text,
  ADD COLUMN IF NOT EXISTS cedula_identidad_imagen_path text,
  ADD COLUMN IF NOT EXISTS pasaporte_numero text,
  ADD COLUMN IF NOT EXISTS pasaporte_imagen_path text,
  ADD COLUMN IF NOT EXISTS colegio text,
  ADD COLUMN IF NOT EXISTS grado text;

COMMIT;
