-- Migration v50 generated: 2026-04-17
-- Goal: agregar soporte persistente para "Otras Deducciones" en detalle de nomina.

BEGIN;

ALTER TABLE public.nominas_mensuales_detalle
  ADD COLUMN IF NOT EXISTS descuento_otras numeric(12,2);

ALTER TABLE public.nominas_mensuales_detalle
  ALTER COLUMN descuento_otras SET DEFAULT 0;

UPDATE public.nominas_mensuales_detalle
SET descuento_otras = 0
WHERE descuento_otras IS NULL;

ALTER TABLE public.nominas_mensuales_detalle
  ALTER COLUMN descuento_otras SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales_detalle') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'chk_nominas_mensuales_detalle_descuento_otras_nonneg'
         AND conrelid = 'public.nominas_mensuales_detalle'::regclass
     ) THEN
    ALTER TABLE public.nominas_mensuales_detalle
      ADD CONSTRAINT chk_nominas_mensuales_detalle_descuento_otras_nonneg
      CHECK (descuento_otras >= 0);
  END IF;
END $$;

COMMIT;
