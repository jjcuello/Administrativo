-- Migration v18 generated: 2026-03-10
-- Goal: single-run setup for ingresos catalog + alumno relation + metadata read access under RLS
-- Supersedes: v15, v16, v17 for fresh setups
-- Includes: v15 + v17 logic plus ingresos read/write RLS access hardening

BEGIN;

-- 1) ingresos -> alumno_id relationship
ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS alumno_id uuid;

DO $$
BEGIN
  IF to_regclass('public.alumnos') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ingresos_alumno_id_fkey'
        AND conrelid = 'public.ingresos'::regclass
    ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT ingresos_alumno_id_fkey
      FOREIGN KEY (alumno_id)
      REFERENCES public.alumnos(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ingresos_alumno_id ON public.ingresos(alumno_id);

-- 2) Fixed ingreso categories catalog
WITH categorias_seed(nombre, descripcion) AS (
  VALUES
    ('Mañana', 'Ingresos asociados al turno de mañana'),
    ('Tarde', 'Ingresos asociados al turno de tarde'),
    ('Nucleo', 'Ingresos por actividades de núcleo'),
    ('Particulares', 'Ingresos por clases particulares'),
    ('Virtuales', 'Ingresos por clases virtuales'),
    ('Club Deportivo', 'Ingresos provenientes del club deportivo'),
    ('Aporte Capital', 'Aportes de capital registrados como ingreso'),
    ('Donaciones', 'Donaciones y contribuciones')
)
UPDATE public.categorias_ingreso AS c
SET
  descripcion = s.descripcion,
  deleted_at = NULL,
  updated_at = now()
FROM categorias_seed AS s
WHERE lower(c.nombre) = lower(s.nombre)
  AND (c.deleted_at IS NOT NULL OR c.descripcion IS DISTINCT FROM s.descripcion);

WITH categorias_seed(nombre, descripcion) AS (
  VALUES
    ('Mañana', 'Ingresos asociados al turno de mañana'),
    ('Tarde', 'Ingresos asociados al turno de tarde'),
    ('Nucleo', 'Ingresos por actividades de núcleo'),
    ('Particulares', 'Ingresos por clases particulares'),
    ('Virtuales', 'Ingresos por clases virtuales'),
    ('Club Deportivo', 'Ingresos provenientes del club deportivo'),
    ('Aporte Capital', 'Aportes de capital registrados como ingreso'),
    ('Donaciones', 'Donaciones y contribuciones')
)
INSERT INTO public.categorias_ingreso (nombre, descripcion)
SELECT s.nombre, s.descripcion
FROM categorias_seed AS s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categorias_ingreso c
  WHERE lower(c.nombre) = lower(s.nombre)
    AND c.deleted_at IS NULL
);

-- 3) Ensure Patria account exists and is active
UPDATE public.cuentas_financieras
SET
  activo = COALESCE(activo, true),
  deleted_at = NULL,
  updated_at = now()
WHERE lower(nombre) = lower('Patria')
  AND (deleted_at IS NOT NULL OR activo IS NULL);

INSERT INTO public.cuentas_financieras (nombre, moneda, saldo_inicial, activo)
SELECT 'Patria', 'USD', 0, true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.cuentas_financieras
  WHERE lower(nombre) = lower('Patria')
    AND deleted_at IS NULL
);

-- 4) Harden read access for metadata tables under RLS
GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.categorias_ingreso') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.categorias_ingreso TO authenticated;

    DROP POLICY IF EXISTS categorias_ingreso_select_authenticated ON public.categorias_ingreso;
    CREATE POLICY categorias_ingreso_select_authenticated
      ON public.categorias_ingreso
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.cuentas_financieras') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.cuentas_financieras TO authenticated;

    DROP POLICY IF EXISTS cuentas_financieras_select_authenticated ON public.cuentas_financieras;
    CREATE POLICY cuentas_financieras_select_authenticated
      ON public.cuentas_financieras
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.alumnos') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.alumnos TO authenticated;

    DROP POLICY IF EXISTS alumnos_select_authenticated ON public.alumnos;
    CREATE POLICY alumnos_select_authenticated
      ON public.alumnos
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- 5) Allow ingresos read/write access for authenticated users under RLS
DO $$
BEGIN
  IF to_regclass('public.ingresos') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public.ingresos TO authenticated;

    DROP POLICY IF EXISTS ingresos_select_authenticated ON public.ingresos;
    CREATE POLICY ingresos_select_authenticated
      ON public.ingresos
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);

    DROP POLICY IF EXISTS ingresos_insert_authenticated ON public.ingresos;
    CREATE POLICY ingresos_insert_authenticated
      ON public.ingresos
      FOR INSERT
      TO authenticated
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS ingresos_update_authenticated ON public.ingresos;
    CREATE POLICY ingresos_update_authenticated
      ON public.ingresos
      FOR UPDATE
      TO authenticated
      USING (deleted_at IS NULL)
      WITH CHECK (deleted_at IS NULL);
  END IF;
END $$;

COMMIT;
