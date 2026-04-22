-- Migration v40 generated: 2026-03-27
-- Goal: allow proveedor-level accounting destination to include the Proveedores account.

BEGIN;

UPDATE public.proveedores
SET destino_contable_egresos = 'administrativo'
WHERE destino_contable_egresos IS NULL
   OR destino_contable_egresos NOT IN ('administrativo', 'operativo', 'proveedores');

ALTER TABLE public.proveedores
  DROP CONSTRAINT IF EXISTS chk_proveedores_destino_contable_egresos;

ALTER TABLE public.proveedores
  ADD CONSTRAINT chk_proveedores_destino_contable_egresos
  CHECK (destino_contable_egresos IN ('administrativo', 'operativo', 'proveedores'));

ALTER TABLE public.proveedores
  ALTER COLUMN destino_contable_egresos SET DEFAULT 'administrativo',
  ALTER COLUMN destino_contable_egresos SET NOT NULL;

COMMIT;
