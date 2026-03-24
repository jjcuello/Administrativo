-- Migration v32: agregar cédula del titular bancario en personal
-- Fecha: 2026-03-16
-- Objetivo: soportar campo "Cédula titular" en sección Datos Banco de Gestión > Personal.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'personal'
  ) THEN
    ALTER TABLE public.personal
      ADD COLUMN IF NOT EXISTS banco_cedula_titular text;
  ELSE
    RAISE NOTICE 'Tabla public.personal no existe; se omite migración v32.';
  END IF;
END $$;

COMMIT;
