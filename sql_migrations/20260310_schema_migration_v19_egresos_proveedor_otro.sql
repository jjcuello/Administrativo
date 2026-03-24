-- Migration v19 generated: 2026-03-10
-- Goal: add dedicated free-text provider field for egresos (proveedor_otro)
-- Notes:
--   - Backfills from legacy beneficiario only when proveedor_id is null.
--   - Keeps beneficiario untouched for historical compatibility.

BEGIN;

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS proveedor_otro text;

UPDATE public.egresos
SET proveedor_otro = btrim(beneficiario)
WHERE (proveedor_otro IS NULL OR btrim(proveedor_otro) = '')
  AND proveedor_id IS NULL
  AND beneficiario IS NOT NULL
  AND btrim(beneficiario) <> '';

COMMIT;
