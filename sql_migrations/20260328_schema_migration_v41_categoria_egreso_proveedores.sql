-- Migration v41 generated: 2026-03-28
-- Goal: ensure "Proveedores" exists as active egreso category for accounting destination mapping.

BEGIN;

-- Reactivate soft-deleted category if present.
UPDATE public.categorias_egreso
SET
  deleted_at = NULL,
  updated_at = now()
WHERE lower(nombre) = lower('Proveedores')
  AND deleted_at IS NOT NULL;

-- Ensure active category exists.
INSERT INTO public.categorias_egreso (nombre)
SELECT 'Proveedores'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categorias_egreso c
  WHERE lower(c.nombre) = lower('Proveedores')
    AND c.deleted_at IS NULL
);

COMMIT;
