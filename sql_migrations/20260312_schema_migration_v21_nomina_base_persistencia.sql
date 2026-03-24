-- Migration v21 generated: 2026-03-12
-- Goal: persist monthly payroll base output (header + employee detail)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.nominas_mensuales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_ym text NOT NULL,
  fecha_cierre date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'cerrada',
  total_base numeric(12,2) NOT NULL DEFAULT 0,
  total_descuentos numeric(12,2) NOT NULL DEFAULT 0,
  total_neto numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.nominas_mensuales
  ADD COLUMN IF NOT EXISTS periodo_ym text,
  ADD COLUMN IF NOT EXISTS fecha_cierre date,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS total_base numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_descuentos numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_neto numeric(12,2),
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.nominas_mensuales
  ALTER COLUMN fecha_cierre SET DEFAULT CURRENT_DATE,
  ALTER COLUMN estado SET DEFAULT 'cerrada',
  ALTER COLUMN total_base SET DEFAULT 0,
  ALTER COLUMN total_descuentos SET DEFAULT 0,
  ALTER COLUMN total_neto SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.nominas_mensuales SET fecha_cierre = CURRENT_DATE WHERE fecha_cierre IS NULL;
UPDATE public.nominas_mensuales SET estado = 'cerrada' WHERE estado IS NULL;
UPDATE public.nominas_mensuales SET total_base = 0 WHERE total_base IS NULL;
UPDATE public.nominas_mensuales SET total_descuentos = 0 WHERE total_descuentos IS NULL;
UPDATE public.nominas_mensuales SET total_neto = 0 WHERE total_neto IS NULL;
UPDATE public.nominas_mensuales SET created_at = now() WHERE created_at IS NULL;
UPDATE public.nominas_mensuales SET updated_at = now() WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_nominas_mensuales_periodo_ym'
      AND conrelid = 'public.nominas_mensuales'::regclass
  ) THEN
    ALTER TABLE public.nominas_mensuales
      ADD CONSTRAINT chk_nominas_mensuales_periodo_ym
      CHECK (periodo_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_nominas_mensuales_totales_nonneg'
      AND conrelid = 'public.nominas_mensuales'::regclass
  ) THEN
    ALTER TABLE public.nominas_mensuales
      ADD CONSTRAINT chk_nominas_mensuales_totales_nonneg
      CHECK (total_base >= 0 AND total_descuentos >= 0 AND total_neto >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_nominas_mensuales_estado'
      AND conrelid = 'public.nominas_mensuales'::regclass
  ) THEN
    ALTER TABLE public.nominas_mensuales
      ADD CONSTRAINT chk_nominas_mensuales_estado
      CHECK (estado IN ('borrador', 'cerrada'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_nominas_mensuales_periodo_activo
  ON public.nominas_mensuales(periodo_ym)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_nominas_mensuales_fecha_cierre
  ON public.nominas_mensuales(fecha_cierre);

CREATE TABLE IF NOT EXISTS public.nominas_mensuales_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomina_id uuid NOT NULL REFERENCES public.nominas_mensuales(id) ON UPDATE CASCADE ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  grupo text NOT NULL,
  base_mensual numeric(12,2) NOT NULL DEFAULT 0,
  descuento_inasistencias numeric(12,2) NOT NULL DEFAULT 0,
  descuento_cantina numeric(12,2) NOT NULL DEFAULT 0,
  descuento_total numeric(12,2) NOT NULL DEFAULT 0,
  neto_base numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nominas_mensuales_detalle
  ADD COLUMN IF NOT EXISTS nomina_id uuid,
  ADD COLUMN IF NOT EXISTS personal_id uuid,
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS base_mensual numeric(12,2),
  ADD COLUMN IF NOT EXISTS descuento_inasistencias numeric(12,2),
  ADD COLUMN IF NOT EXISTS descuento_cantina numeric(12,2),
  ADD COLUMN IF NOT EXISTS descuento_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS neto_base numeric(12,2),
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.nominas_mensuales_detalle
  ALTER COLUMN base_mensual SET DEFAULT 0,
  ALTER COLUMN descuento_inasistencias SET DEFAULT 0,
  ALTER COLUMN descuento_cantina SET DEFAULT 0,
  ALTER COLUMN descuento_total SET DEFAULT 0,
  ALTER COLUMN neto_base SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.nominas_mensuales_detalle SET base_mensual = 0 WHERE base_mensual IS NULL;
UPDATE public.nominas_mensuales_detalle SET descuento_inasistencias = 0 WHERE descuento_inasistencias IS NULL;
UPDATE public.nominas_mensuales_detalle SET descuento_cantina = 0 WHERE descuento_cantina IS NULL;
UPDATE public.nominas_mensuales_detalle SET descuento_total = 0 WHERE descuento_total IS NULL;
UPDATE public.nominas_mensuales_detalle SET neto_base = 0 WHERE neto_base IS NULL;
UPDATE public.nominas_mensuales_detalle SET created_at = now() WHERE created_at IS NULL;
UPDATE public.nominas_mensuales_detalle SET updated_at = now() WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_nominas_mensuales_detalle_grupo'
      AND conrelid = 'public.nominas_mensuales_detalle'::regclass
  ) THEN
    ALTER TABLE public.nominas_mensuales_detalle
      ADD CONSTRAINT chk_nominas_mensuales_detalle_grupo
      CHECK (grupo IN ('docente', 'administrativo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_nominas_mensuales_detalle_nonneg'
      AND conrelid = 'public.nominas_mensuales_detalle'::regclass
  ) THEN
    ALTER TABLE public.nominas_mensuales_detalle
      ADD CONSTRAINT chk_nominas_mensuales_detalle_nonneg
      CHECK (
        base_mensual >= 0
        AND descuento_inasistencias >= 0
        AND descuento_cantina >= 0
        AND descuento_total >= 0
        AND neto_base >= 0
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_nominas_mensuales_detalle_nomina_personal
  ON public.nominas_mensuales_detalle(nomina_id, personal_id);

CREATE INDEX IF NOT EXISTS idx_nominas_mensuales_detalle_nomina_id
  ON public.nominas_mensuales_detalle(nomina_id);

CREATE INDEX IF NOT EXISTS idx_nominas_mensuales_detalle_personal_id
  ON public.nominas_mensuales_detalle(personal_id);

COMMIT;