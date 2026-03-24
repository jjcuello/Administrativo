-- Migration v29: ampliar datos laborales de personal
-- Fecha: 2026-03-16
-- Objetivo: permitir capturar más información de trabajo y contacto por empleado.

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
      ADD COLUMN IF NOT EXISTS telefono text,
      ADD COLUMN IF NOT EXISTS email text,
      ADD COLUMN IF NOT EXISTS direccion text,
      ADD COLUMN IF NOT EXISTS fecha_ingreso date,
      ADD COLUMN IF NOT EXISTS fecha_egreso date,
      ADD COLUMN IF NOT EXISTS tipo_contrato text,
      ADD COLUMN IF NOT EXISTS jornada_laboral text,
      ADD COLUMN IF NOT EXISTS horario_laboral text,
      ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre text,
      ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono text,
      ADD COLUMN IF NOT EXISTS observaciones_laborales text;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ck_personal_fechas_laborales'
    ) THEN
      ALTER TABLE public.personal
        ADD CONSTRAINT ck_personal_fechas_laborales
        CHECK (
          fecha_egreso IS NULL
          OR fecha_ingreso IS NULL
          OR fecha_egreso >= fecha_ingreso
        );
    END IF;

    CREATE INDEX IF NOT EXISTS idx_personal_email_lower
      ON public.personal (lower(email));

    CREATE INDEX IF NOT EXISTS idx_personal_fecha_ingreso
      ON public.personal (fecha_ingreso);
  ELSE
    RAISE NOTICE 'Tabla public.personal no existe; se omite migración v29.';
  END IF;
END $$;

COMMIT;
