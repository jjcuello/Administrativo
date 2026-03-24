-- Migration v35 generated: 2026-03-18
-- Goal: add internal transfer categories for ingresos and egresos catalogs.
-- Notes:
--   - Keeps the model simple for traspasos entre cuentas propias.
--   - Reactivates soft-deleted rows when the category already exists.

BEGIN;

WITH categorias_seed(nombre, descripcion) AS (
  VALUES (
    'Transferencia Interna',
    'Traspasos entre cuentas propias que no representan ingresos operativos'
  )
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
  VALUES (
    'Transferencia Interna',
    'Traspasos entre cuentas propias que no representan ingresos operativos'
  )
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

WITH categorias_seed(nombre) AS (
  VALUES ('Transferencia Interna')
)
UPDATE public.categorias_egreso AS c
SET
  deleted_at = NULL,
  updated_at = now()
FROM categorias_seed AS s
WHERE lower(c.nombre) = lower(s.nombre)
  AND c.deleted_at IS NOT NULL;

WITH categorias_seed(nombre) AS (
  VALUES ('Transferencia Interna')
)
INSERT INTO public.categorias_egreso (nombre)
SELECT s.nombre
FROM categorias_seed AS s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categorias_egreso c
  WHERE lower(c.nombre) = lower(s.nombre)
    AND c.deleted_at IS NULL
);

COMMIT;
