-- Migration v14 generated: 2026-02-19
-- Goal: create ingresos module base tables (categorias_ingreso, ingresos)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.categorias_ingreso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_categorias_ingreso_nombre
  ON public.categorias_ingreso (lower(nombre))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ingresos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  descripcion text NOT NULL,
  monto_usd numeric NOT NULL DEFAULT 0,
  metodo_ingreso text,
  estado text NOT NULL DEFAULT 'confirmado',
  categoria_id uuid,
  cuenta_destino_id uuid,
  transaccion_id uuid,
  periodo_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS fecha_ingreso date,
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS monto_usd numeric,
  ADD COLUMN IF NOT EXISTS metodo_ingreso text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS categoria_id uuid,
  ADD COLUMN IF NOT EXISTS cuenta_destino_id uuid,
  ADD COLUMN IF NOT EXISTS transaccion_id uuid,
  ADD COLUMN IF NOT EXISTS periodo_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.ingresos
  ALTER COLUMN fecha_ingreso SET DEFAULT CURRENT_DATE,
  ALTER COLUMN monto_usd SET DEFAULT 0,
  ALTER COLUMN estado SET DEFAULT 'confirmado',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.ingresos SET fecha_ingreso = CURRENT_DATE WHERE fecha_ingreso IS NULL;
UPDATE public.ingresos SET monto_usd = 0 WHERE monto_usd IS NULL;
UPDATE public.ingresos SET estado = 'confirmado' WHERE estado IS NULL;
UPDATE public.ingresos SET created_at = now() WHERE created_at IS NULL;
UPDATE public.ingresos SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE public.ingresos
  ALTER COLUMN fecha_ingreso SET NOT NULL,
  ALTER COLUMN descripcion SET NOT NULL,
  ALTER COLUMN monto_usd SET NOT NULL,
  ALTER COLUMN estado SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_ingresos_monto_nonneg'
      AND conrelid = 'public.ingresos'::regclass
  ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT chk_ingresos_monto_nonneg
      CHECK (monto_usd >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_ingresos_estado'
      AND conrelid = 'public.ingresos'::regclass
  ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT chk_ingresos_estado
      CHECK (estado IN ('confirmado', 'pendiente', 'anulado'));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.categorias_ingreso') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ingresos_categoria_id_fkey'
        AND conrelid = 'public.ingresos'::regclass
    ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT ingresos_categoria_id_fkey
      FOREIGN KEY (categoria_id)
      REFERENCES public.categorias_ingreso(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.cuentas_financieras') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ingresos_cuenta_destino_id_fkey'
        AND conrelid = 'public.ingresos'::regclass
    ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT ingresos_cuenta_destino_id_fkey
      FOREIGN KEY (cuenta_destino_id)
      REFERENCES public.cuentas_financieras(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.transacciones') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ingresos_transaccion_id_fkey'
        AND conrelid = 'public.ingresos'::regclass
    ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT ingresos_transaccion_id_fkey
      FOREIGN KEY (transaccion_id)
      REFERENCES public.transacciones(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.periodos_escolares') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ingresos_periodo_id_fkey'
        AND conrelid = 'public.ingresos'::regclass
    ) THEN
    ALTER TABLE public.ingresos
      ADD CONSTRAINT ingresos_periodo_id_fkey
      FOREIGN KEY (periodo_id)
      REFERENCES public.periodos_escolares(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON public.ingresos(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_ingresos_estado ON public.ingresos(estado);
CREATE INDEX IF NOT EXISTS idx_ingresos_categoria_id ON public.ingresos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_cuenta_destino_id ON public.ingresos(cuenta_destino_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_deleted_at ON public.ingresos(deleted_at);

COMMIT;
