-- Migration v39 generated: 2026-03-27
-- Goal: persist default accounting destination for egresos at proveedor level.

BEGIN;

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS destino_contable_egresos text;

UPDATE public.proveedores
SET destino_contable_egresos = 'administrativo'
WHERE destino_contable_egresos IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_proveedores_destino_contable_egresos'
      AND conrelid = 'public.proveedores'::regclass
  ) THEN
    ALTER TABLE public.proveedores
      ADD CONSTRAINT chk_proveedores_destino_contable_egresos
      CHECK (destino_contable_egresos IN ('administrativo', 'operativo'));
  END IF;
END $$;

ALTER TABLE public.proveedores
  ALTER COLUMN destino_contable_egresos SET DEFAULT 'administrativo',
  ALTER COLUMN destino_contable_egresos SET NOT NULL;

-- Business default requested: Agua Tecoteca should post to operating expenses.
UPDATE public.proveedores
SET destino_contable_egresos = 'operativo',
    updated_at = now()
WHERE (
  nombre_comercial ILIKE '%agua tecoteca%'
  OR nombre ILIKE '%agua tecoteca%'
)
AND deleted_at IS NULL;

COMMIT;
