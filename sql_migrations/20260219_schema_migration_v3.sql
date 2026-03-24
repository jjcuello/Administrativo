-- Migration v3 generated: 2026-02-19
-- Goal: data quality hardening after v1/v2
-- Notes: idempotent blocks, conservative changes (no forced RLS enable).

BEGIN;

-- 0) Helper function for email validation
CREATE OR REPLACE FUNCTION public.is_valid_email(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT value ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$';
$$;

-- 1) Backfill and normalize audit timestamps
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.alumnos SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.alumnos SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.alumnos_extra_catedra SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos_extra_catedra ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.alumnos_extra_catedra SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos_extra_catedra ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.alumnos_nucleos SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos_nucleos ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.alumnos_nucleos SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos_nucleos ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.alumnos_virtuales SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos_virtuales ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.alumnos_virtuales SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.alumnos_virtuales ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.aportes_capital SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.aportes_capital ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.aportes_capital SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.aportes_capital ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.categorias_egreso SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.categorias_egreso ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.categorias_egreso SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.categorias_egreso ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.categorias_producto SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.categorias_producto ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.categorias_producto SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.categorias_producto ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.clases_particulares SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.clases_particulares ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.clases_particulares SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.clases_particulares ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.clientes_particulares SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.clientes_particulares ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.clientes_particulares SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.clientes_particulares ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.clubes SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.clubes ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.clubes SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.clubes ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.colegios SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.colegios ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.colegios SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.colegios ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.contratos SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.contratos ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.contratos SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.contratos ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.cuentas_financieras SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.cuentas_financieras ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.cuentas_financieras SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.cuentas_financieras ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='created_at') THEN
    EXECUTE 'UPDATE public.donaciones SET created_at = now() WHERE created_at IS NULL';
    EXECUTE 'ALTER TABLE public.donaciones ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='updated_at') THEN
    EXECUTE 'UPDATE public.donaciones SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.donaciones ALTER COLUMN updated_at SET DEFAULT now()';
  END IF;
END $$;

-- 2) Tighten timestamp nullability when safe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos_extra_catedra WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos_extra_catedra ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos_extra_catedra WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos_extra_catedra ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos_nucleos WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos_nucleos ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos_nucleos WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos_nucleos ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos_virtuales WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos_virtuales ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.alumnos_virtuales WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.alumnos_virtuales ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.aportes_capital WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.aportes_capital ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.aportes_capital WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.aportes_capital ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.categorias_egreso WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.categorias_egreso ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.categorias_egreso WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.categorias_egreso ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.categorias_producto WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.categorias_producto ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.categorias_producto WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.categorias_producto ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.clases_particulares WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.clases_particulares ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.clases_particulares WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.clases_particulares ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.clientes_particulares WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.clientes_particulares ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.clientes_particulares WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.clientes_particulares ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.clubes WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.clubes ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.clubes WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.clubes ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.colegios WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.colegios ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.colegios WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.colegios ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.contratos WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.contratos ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.contratos WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.contratos ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.cuentas_financieras WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.cuentas_financieras ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.cuentas_financieras WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.cuentas_financieras ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='created_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.donaciones WHERE created_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.donaciones ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM public.donaciones WHERE updated_at IS NULL LIMIT 1) THEN
      ALTER TABLE public.donaciones ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END IF;
END $$;

-- 3) Standardize money precision and non-negative checks
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='monto_mensual_pactado') THEN
    BEGIN
      ALTER TABLE public.alumnos_extra_catedra ALTER COLUMN monto_mensual_pactado TYPE numeric(12,2) USING monto_mensual_pactado::numeric;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo convertir public.alumnos_extra_catedra.monto_mensual_pactado a numeric(12,2): %', SQLERRM;
    END;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_extra_catedra_monto_mensual_pactado_nonneg_v3') THEN
      ALTER TABLE public.alumnos_extra_catedra ADD CONSTRAINT chk_alumnos_extra_catedra_monto_mensual_pactado_nonneg_v3 CHECK (monto_mensual_pactado >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='monto_usd') THEN
    BEGIN
      ALTER TABLE public.aportes_capital ALTER COLUMN monto_usd TYPE numeric(12,2) USING monto_usd::numeric;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo convertir public.aportes_capital.monto_usd a numeric(12,2): %', SQLERRM;
    END;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_aportes_capital_monto_usd_nonneg_v3') THEN
      ALTER TABLE public.aportes_capital ADD CONSTRAINT chk_aportes_capital_monto_usd_nonneg_v3 CHECK (monto_usd >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='tarifa') THEN
    BEGIN
      ALTER TABLE public.clases_particulares ALTER COLUMN tarifa TYPE numeric(12,2) USING tarifa::numeric;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo convertir public.clases_particulares.tarifa a numeric(12,2): %', SQLERRM;
    END;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_clases_particulares_tarifa_nonneg_v3') THEN
      ALTER TABLE public.clases_particulares ADD CONSTRAINT chk_clases_particulares_tarifa_nonneg_v3 CHECK (tarifa >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='monto_unico_mensual') THEN
    BEGIN
      ALTER TABLE public.clubes ALTER COLUMN monto_unico_mensual TYPE numeric(12,2) USING monto_unico_mensual::numeric;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo convertir public.clubes.monto_unico_mensual a numeric(12,2): %', SQLERRM;
    END;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_clubes_monto_unico_mensual_nonneg_v3') THEN
      ALTER TABLE public.clubes ADD CONSTRAINT chk_clubes_monto_unico_mensual_nonneg_v3 CHECK (monto_unico_mensual >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='monto_fijo_mensual') THEN
    BEGIN
      ALTER TABLE public.colegios ALTER COLUMN monto_fijo_mensual TYPE numeric(12,2) USING monto_fijo_mensual::numeric;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo convertir public.colegios.monto_fijo_mensual a numeric(12,2): %', SQLERRM;
    END;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_colegios_monto_fijo_mensual_nonneg_v3') THEN
      ALTER TABLE public.colegios ADD CONSTRAINT chk_colegios_monto_fijo_mensual_nonneg_v3 CHECK (monto_fijo_mensual >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='monto_acordado_ciclo') THEN
    BEGIN
      ALTER TABLE public.contratos ALTER COLUMN monto_acordado_ciclo TYPE numeric(12,2) USING monto_acordado_ciclo::numeric;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo convertir public.contratos.monto_acordado_ciclo a numeric(12,2): %', SQLERRM;
    END;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_contratos_monto_acordado_ciclo_nonneg_v3') THEN
      ALTER TABLE public.contratos ADD CONSTRAINT chk_contratos_monto_acordado_ciclo_nonneg_v3 CHECK (monto_acordado_ciclo >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='saldo_inicial') THEN
    BEGIN
      ALTER TABLE public.cuentas_financieras ALTER COLUMN saldo_inicial TYPE numeric(12,2) USING saldo_inicial::numeric;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'No se pudo convertir public.cuentas_financieras.saldo_inicial a numeric(12,2): %', SQLERRM;
    END;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_cuentas_financieras_saldo_inicial_nonneg_v3') THEN
      ALTER TABLE public.cuentas_financieras ADD CONSTRAINT chk_cuentas_financieras_saldo_inicial_nonneg_v3 CHECK (saldo_inicial >= 0);
    END IF;
  END IF;
END $$;

-- 4) Percentage constraints (0..100)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='porcentaje_beca') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_extra_catedra_porcentaje_beca_range_v3') THEN
      ALTER TABLE public.alumnos_extra_catedra ADD CONSTRAINT chk_alumnos_extra_catedra_porcentaje_beca_range_v3 CHECK (porcentaje_beca >= 0 AND porcentaje_beca <= 100);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='porcentaje_beca') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_nucleos_porcentaje_beca_range_v3') THEN
      ALTER TABLE public.alumnos_nucleos ADD CONSTRAINT chk_alumnos_nucleos_porcentaje_beca_range_v3 CHECK (porcentaje_beca >= 0 AND porcentaje_beca <= 100);
    END IF;
  END IF;
END $$;

-- 5) Email normalization + format checks + unique lower(email) when no duplicates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='email') THEN
    EXECUTE 'UPDATE public.alumnos_virtuales SET email=lower(trim(email)) WHERE email IS NOT NULL';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_virtuales_email_format_v3') THEN
      ALTER TABLE public.alumnos_virtuales ADD CONSTRAINT chk_alumnos_virtuales_email_format_v3 CHECK (email IS NULL OR public.is_valid_email(email));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='uidx_alumnos_virtuales_email_lower_v3') THEN
      IF NOT EXISTS (SELECT 1 FROM public.alumnos_virtuales WHERE email IS NOT NULL GROUP BY lower(email) HAVING count(*)>1 LIMIT 1) THEN
        CREATE UNIQUE INDEX uidx_alumnos_virtuales_email_lower_v3 ON public.alumnos_virtuales(lower(email)) WHERE email IS NOT NULL;
      ELSE
        RAISE NOTICE 'Duplicados detectados en public.alumnos_virtuales.email; no se crea índice único';
      END IF;
    END IF;
  END IF;
END $$;

-- 6) Additional business checks for known tables
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='fecha_inicio')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='fecha_fin') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_contratos_fechas_v3') THEN
      ALTER TABLE public.contratos ADD CONSTRAINT chk_contratos_fechas_v3 CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio);
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='fecha_nacimiento') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_fecha_nacimiento_v3') THEN
      ALTER TABLE public.alumnos ADD CONSTRAINT chk_alumnos_fecha_nacimiento_v3 CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento <= CURRENT_DATE);
    END IF;
  END IF;
END $$;

-- 7) Helpful composite indexes for frequent filtering
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='estado') THEN
    CREATE INDEX IF NOT EXISTS idx_alumnos_estado_created_at_v3 ON public.alumnos(estado, created_at DESC);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='periodo_id') THEN
    CREATE INDEX IF NOT EXISTS idx_contratos_periodo_created_at_v3 ON public.contratos(periodo_id, created_at DESC);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='socio_id') THEN
    CREATE INDEX IF NOT EXISTS idx_aportes_capital_socio_fecha_v3 ON public.aportes_capital(socio_id, fecha_aporte DESC);
  END IF;
END $$;

-- 8) Optional RLS snippet (commented to avoid accidental lockout)
-- ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY alumnos_read_auth_v3 ON public.alumnos FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY alumnos_write_auth_v3 ON public.alumnos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
