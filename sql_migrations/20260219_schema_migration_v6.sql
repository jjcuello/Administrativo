-- Migration v6 generated: 2026-02-19
-- Goal: harden inscripciones schema to the canonical columns used by the app

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.inscripciones
  ADD COLUMN IF NOT EXISTS grupo_id uuid,
  ADD COLUMN IF NOT EXISTS clase_vip_id uuid,
  ADD COLUMN IF NOT EXISTS fecha_inscripcion date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activa'::text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'grupos_tardes_id'
  ) THEN
    EXECUTE '
      UPDATE public.inscripciones
      SET grupo_id = COALESCE(grupo_id, grupos_tardes_id)
      WHERE grupos_tardes_id IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'grupo_tarde_id'
  ) THEN
    EXECUTE '
      UPDATE public.inscripciones
      SET grupo_id = COALESCE(grupo_id, grupo_tarde_id)
      WHERE grupo_tarde_id IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'clase_particular_id'
  ) THEN
    EXECUTE '
      UPDATE public.inscripciones
      SET clase_vip_id = COALESCE(clase_vip_id, clase_particular_id)
      WHERE clase_particular_id IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'clases_particulares_id'
  ) THEN
    EXECUTE '
      UPDATE public.inscripciones
      SET clase_vip_id = COALESCE(clase_vip_id, clases_particulares_id)
      WHERE clases_particulares_id IS NOT NULL
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inscripciones_alumno_id_fkey'
      AND conrelid = 'public.inscripciones'::regclass
  ) THEN
    ALTER TABLE public.inscripciones
      ADD CONSTRAINT inscripciones_alumno_id_fkey
      FOREIGN KEY (alumno_id)
      REFERENCES public.alumnos(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inscripciones_grupo_id_fkey'
      AND conrelid = 'public.inscripciones'::regclass
  ) THEN
    ALTER TABLE public.inscripciones
      ADD CONSTRAINT inscripciones_grupo_id_fkey
      FOREIGN KEY (grupo_id)
      REFERENCES public.grupos_tardes(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inscripciones_clase_vip_id_fkey'
      AND conrelid = 'public.inscripciones'::regclass
  ) THEN
    ALTER TABLE public.inscripciones
      ADD CONSTRAINT inscripciones_clase_vip_id_fkey
      FOREIGN KEY (clase_vip_id)
      REFERENCES public.clases_particulares(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.inscripciones
  DROP CONSTRAINT IF EXISTS chk_inscripciones_actividad_unica,
  DROP CONSTRAINT IF EXISTS chk_inscripciones_estado;

ALTER TABLE public.inscripciones
  ADD CONSTRAINT chk_inscripciones_actividad_unica
  CHECK (num_nonnulls(grupo_id, clase_vip_id) = 1)
  NOT VALID;

ALTER TABLE public.inscripciones
  ADD CONSTRAINT chk_inscripciones_estado
  CHECK (estado IN ('activa', 'retirada', 'pausada', 'anulada'))
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno_id ON public.inscripciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_grupo_id ON public.inscripciones(grupo_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_clase_vip_id ON public.inscripciones(clase_vip_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON public.inscripciones(estado);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_inscripciones_alumno_grupo_activa
  ON public.inscripciones(alumno_id, grupo_id)
  WHERE estado = 'activa' AND grupo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_inscripciones_alumno_vip_activa
  ON public.inscripciones(alumno_id, clase_vip_id)
  WHERE estado = 'activa' AND clase_vip_id IS NOT NULL;

COMMIT;
