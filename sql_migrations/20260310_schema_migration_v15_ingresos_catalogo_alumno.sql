-- Migration v15 generated: 2026-03-10
-- Goal: enforce ingresos catalog, add Patria account, and link ingresos to alumnos
-- Status: superseded for fresh setups by 20260310_schema_migration_v18_ingresos_setup_all_in_one.sql
-- Note: keep this file only for historical incremental rollout sequences.

BEGIN;

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

COMMIT;
