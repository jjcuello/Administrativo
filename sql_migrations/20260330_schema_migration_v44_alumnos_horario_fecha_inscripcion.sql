-- Migration v44 generated: 2026-03-30
-- Goal: add schedule description and academy enrollment date fields to alumnos.

BEGIN;

ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS horario_descripcion text,
  ADD COLUMN IF NOT EXISTS fecha_inscripcion_academia date;

COMMIT;
