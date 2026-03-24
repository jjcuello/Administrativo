-- Migration v36 generated: 2026-03-18
-- Goal: rename egreso category "Honorarios Administrativos" to "Gastos Administrativos"
-- while preserving historical egresos references.

BEGIN;

-- 1) Reactivate canonical name if it already exists soft-deleted.
UPDATE public.categorias_egreso
SET
  deleted_at = NULL,
  updated_at = now()
WHERE lower(nombre) = lower('Gastos Administrativos')
  AND deleted_at IS NOT NULL;

-- 2) If canonical active row does not exist yet, reuse one old row by renaming it.
WITH old_pick AS (
  SELECT id
  FROM public.categorias_egreso
  WHERE lower(nombre) = lower('Honorarios Administrativos')
  ORDER BY id DESC
  LIMIT 1
)
UPDATE public.categorias_egreso AS c
SET
  nombre = 'Gastos Administrativos',
  deleted_at = NULL,
  updated_at = now()
WHERE c.id IN (SELECT id FROM old_pick)
  AND NOT EXISTS (
    SELECT 1
    FROM public.categorias_egreso x
    WHERE lower(x.nombre) = lower('Gastos Administrativos')
      AND x.deleted_at IS NULL
  );

-- 3) Ensure canonical category exists.
INSERT INTO public.categorias_egreso (nombre)
SELECT 'Gastos Administrativos'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categorias_egreso x
  WHERE lower(x.nombre) = lower('Gastos Administrativos')
    AND x.deleted_at IS NULL
);

-- 4) Remap egresos that still point to active old alias rows.
WITH canonical_new AS (
  SELECT id
  FROM public.categorias_egreso
  WHERE lower(nombre) = lower('Gastos Administrativos')
    AND deleted_at IS NULL
  ORDER BY id DESC
  LIMIT 1
),
old_rows AS (
  SELECT id
  FROM public.categorias_egreso
  WHERE lower(nombre) = lower('Honorarios Administrativos')
    AND deleted_at IS NULL
)
UPDATE public.egresos AS e
SET categoria_id = (SELECT id FROM canonical_new)
WHERE e.categoria_id IN (SELECT id FROM old_rows)
  AND EXISTS (SELECT 1 FROM canonical_new);

-- 5) Retire old alias from active catalog (after remap).
UPDATE public.categorias_egreso AS c
SET
  deleted_at = now(),
  updated_at = now()
WHERE lower(c.nombre) = lower('Honorarios Administrativos')
  AND c.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.categorias_egreso x
    WHERE lower(x.nombre) = lower('Gastos Administrativos')
      AND x.deleted_at IS NULL
  );

COMMIT;
