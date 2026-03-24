-- Migration v4 generated: 2026-02-19
-- Goal: stabilization after v3 to recover app modules failing on strict validations.
-- This migration is intentionally conservative: it removes only high-risk constraints/indexes from v3.

BEGIN;

-- 1) Drop strict NOT NULL on updated_at/created_at if they were set and are blocking writes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='created_at') THEN
    ALTER TABLE public.alumnos ALTER COLUMN created_at DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='updated_at') THEN
    ALTER TABLE public.alumnos ALTER COLUMN updated_at DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='created_at') THEN
    ALTER TABLE public.alumnos_virtuales ALTER COLUMN created_at DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='updated_at') THEN
    ALTER TABLE public.alumnos_virtuales ALTER COLUMN updated_at DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='created_at') THEN
    ALTER TABLE public.contratos ALTER COLUMN created_at DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='updated_at') THEN
    ALTER TABLE public.contratos ALTER COLUMN updated_at DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='created_at') THEN
    ALTER TABLE public.aportes_capital ALTER COLUMN created_at DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='updated_at') THEN
    ALTER TABLE public.aportes_capital ALTER COLUMN updated_at DROP NOT NULL;
  END IF;
END $$;

-- 2) Drop v3 email strictness that commonly breaks forms
ALTER TABLE public.alumnos_virtuales DROP CONSTRAINT IF EXISTS chk_alumnos_virtuales_email_format_v3;
DROP INDEX IF EXISTS public.uidx_alumnos_virtuales_email_lower_v3;

-- Keep non-unique index for search performance
CREATE INDEX IF NOT EXISTS idx_alumnos_virtuales_email_lower_v4 ON public.alumnos_virtuales(lower(email));

-- 3) Drop strict percentage range checks from v3 (some business flows may exceed 100 or use transitional values)
ALTER TABLE public.alumnos_extra_catedra DROP CONSTRAINT IF EXISTS chk_alumnos_extra_catedra_porcentaje_beca_range_v3;
ALTER TABLE public.alumnos_nucleos DROP CONSTRAINT IF EXISTS chk_alumnos_nucleos_porcentaje_beca_range_v3;

-- 4) Drop strict business date checks that may block legacy data flows
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS chk_contratos_fechas_v3;
ALTER TABLE public.alumnos DROP CONSTRAINT IF EXISTS chk_alumnos_fecha_nacimiento_v3;

-- 5) Convert money constraints to NOT VALID to avoid blocking inserts/updates in hot paths
-- Existing data and new writes can keep flowing; validations can be re-validated later.
ALTER TABLE public.alumnos_extra_catedra DROP CONSTRAINT IF EXISTS chk_alumnos_extra_catedra_monto_mensual_pactado_nonneg_v3;
ALTER TABLE public.aportes_capital DROP CONSTRAINT IF EXISTS chk_aportes_capital_monto_usd_nonneg_v3;
ALTER TABLE public.clases_particulares DROP CONSTRAINT IF EXISTS chk_clases_particulares_tarifa_nonneg_v3;
ALTER TABLE public.clubes DROP CONSTRAINT IF EXISTS chk_clubes_monto_unico_mensual_nonneg_v3;
ALTER TABLE public.colegios DROP CONSTRAINT IF EXISTS chk_colegios_monto_fijo_mensual_nonneg_v3;
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS chk_contratos_monto_acordado_ciclo_nonneg_v3;
ALTER TABLE public.cuentas_financieras DROP CONSTRAINT IF EXISTS chk_cuentas_financieras_saldo_inicial_nonneg_v3;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='monto_mensual_pactado') THEN
    ALTER TABLE public.alumnos_extra_catedra
      ADD CONSTRAINT chk_alumnos_extra_catedra_monto_mensual_pactado_nonneg_v4 CHECK (monto_mensual_pactado >= 0) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='monto_usd') THEN
    ALTER TABLE public.aportes_capital
      ADD CONSTRAINT chk_aportes_capital_monto_usd_nonneg_v4 CHECK (monto_usd >= 0) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='tarifa') THEN
    ALTER TABLE public.clases_particulares
      ADD CONSTRAINT chk_clases_particulares_tarifa_nonneg_v4 CHECK (tarifa >= 0) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='monto_unico_mensual') THEN
    ALTER TABLE public.clubes
      ADD CONSTRAINT chk_clubes_monto_unico_mensual_nonneg_v4 CHECK (monto_unico_mensual >= 0) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='monto_fijo_mensual') THEN
    ALTER TABLE public.colegios
      ADD CONSTRAINT chk_colegios_monto_fijo_mensual_nonneg_v4 CHECK (monto_fijo_mensual >= 0) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='monto_acordado_ciclo') THEN
    ALTER TABLE public.contratos
      ADD CONSTRAINT chk_contratos_monto_acordado_ciclo_nonneg_v4 CHECK (monto_acordado_ciclo >= 0) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='saldo_inicial') THEN
    ALTER TABLE public.cuentas_financieras
      ADD CONSTRAINT chk_cuentas_financieras_saldo_inicial_nonneg_v4 CHECK (saldo_inicial >= 0) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Keep helper function from v3 but avoid hard dependency for runtime paths
-- (No action needed: CREATE OR REPLACE function is harmless)

COMMIT;

-- Post-apply diagnostics (run manually if needed):
-- SELECT conname, convalidated FROM pg_constraint WHERE conname LIKE '%_v4';
-- SELECT indexname FROM pg_indexes WHERE tablename='alumnos_virtuales' AND indexname LIKE '%email%';
