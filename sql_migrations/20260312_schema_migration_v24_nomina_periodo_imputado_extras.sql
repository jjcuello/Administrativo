-- Migration v24 generated: 2026-03-12
-- Goal: periodo de nómina imputado en egresos + soporte de extras y neto total en nómina.

BEGIN;

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS periodo_nomina_ym text;

DO $$
BEGIN
  IF to_regclass('public.egresos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'chk_egresos_periodo_nomina_ym'
         AND conrelid = 'public.egresos'::regclass
     ) THEN
    ALTER TABLE public.egresos
      ADD CONSTRAINT chk_egresos_periodo_nomina_ym
      CHECK (periodo_nomina_ym IS NULL OR periodo_nomina_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_egresos_periodo_nomina_ym
  ON public.egresos(periodo_nomina_ym)
  WHERE periodo_nomina_ym IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_egresos_nomina_lookup
  ON public.egresos(profesor_id, periodo_nomina_ym, fecha_pago)
  WHERE periodo_nomina_ym IS NOT NULL;

WITH categorias_nomina AS (
  SELECT id
  FROM public.categorias_egreso
  WHERE lower(translate(nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn')) LIKE '%nomina base%'
     OR lower(translate(nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn')) LIKE '%nomina extra%'
)
UPDATE public.egresos e
SET periodo_nomina_ym = to_char(date_trunc('month', e.fecha_pago::date), 'YYYY-MM')
FROM categorias_nomina cn
WHERE e.categoria_id = cn.id
  AND e.profesor_id IS NOT NULL
  AND e.fecha_pago IS NOT NULL
  AND e.periodo_nomina_ym IS NULL;

ALTER TABLE public.nominas_mensuales
  ADD COLUMN IF NOT EXISTS total_extras numeric(12,2);

ALTER TABLE public.nominas_mensuales
  ALTER COLUMN total_extras SET DEFAULT 0;

UPDATE public.nominas_mensuales
SET total_extras = 0
WHERE total_extras IS NULL;

ALTER TABLE public.nominas_mensuales
  ALTER COLUMN total_extras SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'chk_nominas_mensuales_total_extras_nonneg'
         AND conrelid = 'public.nominas_mensuales'::regclass
     ) THEN
    ALTER TABLE public.nominas_mensuales
      ADD CONSTRAINT chk_nominas_mensuales_total_extras_nonneg
      CHECK (total_extras >= 0);
  END IF;
END $$;

ALTER TABLE public.nominas_mensuales_detalle
  ADD COLUMN IF NOT EXISTS monto_extra numeric(12,2),
  ADD COLUMN IF NOT EXISTS comentario_extra text,
  ADD COLUMN IF NOT EXISTS neto_total numeric(12,2);

ALTER TABLE public.nominas_mensuales_detalle
  ALTER COLUMN monto_extra SET DEFAULT 0,
  ALTER COLUMN neto_total SET DEFAULT 0;

UPDATE public.nominas_mensuales_detalle
SET monto_extra = 0
WHERE monto_extra IS NULL;

UPDATE public.nominas_mensuales_detalle
SET neto_total = neto_base + COALESCE(monto_extra, 0)
WHERE neto_total IS NULL;

ALTER TABLE public.nominas_mensuales_detalle
  ALTER COLUMN monto_extra SET NOT NULL,
  ALTER COLUMN neto_total SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales_detalle') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'chk_nominas_mensuales_detalle_extra_nonneg'
         AND conrelid = 'public.nominas_mensuales_detalle'::regclass
     ) THEN
    ALTER TABLE public.nominas_mensuales_detalle
      ADD CONSTRAINT chk_nominas_mensuales_detalle_extra_nonneg
      CHECK (monto_extra >= 0 AND neto_total >= 0);
  END IF;
END $$;

COMMIT;
