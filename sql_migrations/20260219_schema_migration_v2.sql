-- Migration v2 generated: 2026-02-19
-- Purpose: hardening + completion after initial migration
-- Safe/idempotent where possible

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Ensure audit columns on all detected tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='created_at') THEN
    ALTER TABLE public.alumnos ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='updated_at') THEN
    ALTER TABLE public.alumnos ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='created_by') THEN
    ALTER TABLE public.alumnos ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='deleted_at') THEN
    ALTER TABLE public.alumnos ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='created_at') THEN
    ALTER TABLE public.alumnos_extra_catedra ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='updated_at') THEN
    ALTER TABLE public.alumnos_extra_catedra ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='created_by') THEN
    ALTER TABLE public.alumnos_extra_catedra ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='deleted_at') THEN
    ALTER TABLE public.alumnos_extra_catedra ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='created_at') THEN
    ALTER TABLE public.alumnos_nucleos ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='updated_at') THEN
    ALTER TABLE public.alumnos_nucleos ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='created_by') THEN
    ALTER TABLE public.alumnos_nucleos ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='deleted_at') THEN
    ALTER TABLE public.alumnos_nucleos ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='created_at') THEN
    ALTER TABLE public.alumnos_virtuales ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='updated_at') THEN
    ALTER TABLE public.alumnos_virtuales ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='created_by') THEN
    ALTER TABLE public.alumnos_virtuales ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='deleted_at') THEN
    ALTER TABLE public.alumnos_virtuales ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='created_at') THEN
    ALTER TABLE public.aportes_capital ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='updated_at') THEN
    ALTER TABLE public.aportes_capital ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='created_by') THEN
    ALTER TABLE public.aportes_capital ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='deleted_at') THEN
    ALTER TABLE public.aportes_capital ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='created_at') THEN
    ALTER TABLE public.categorias_egreso ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='updated_at') THEN
    ALTER TABLE public.categorias_egreso ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='created_by') THEN
    ALTER TABLE public.categorias_egreso ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='deleted_at') THEN
    ALTER TABLE public.categorias_egreso ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='created_at') THEN
    ALTER TABLE public.categorias_producto ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='updated_at') THEN
    ALTER TABLE public.categorias_producto ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='created_by') THEN
    ALTER TABLE public.categorias_producto ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='deleted_at') THEN
    ALTER TABLE public.categorias_producto ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='created_at') THEN
    ALTER TABLE public.clases_particulares ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='updated_at') THEN
    ALTER TABLE public.clases_particulares ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='created_by') THEN
    ALTER TABLE public.clases_particulares ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='deleted_at') THEN
    ALTER TABLE public.clases_particulares ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='created_at') THEN
    ALTER TABLE public.clientes_particulares ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='updated_at') THEN
    ALTER TABLE public.clientes_particulares ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='created_by') THEN
    ALTER TABLE public.clientes_particulares ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='deleted_at') THEN
    ALTER TABLE public.clientes_particulares ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='created_at') THEN
    ALTER TABLE public.clubes ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='updated_at') THEN
    ALTER TABLE public.clubes ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='created_by') THEN
    ALTER TABLE public.clubes ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='deleted_at') THEN
    ALTER TABLE public.clubes ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='created_at') THEN
    ALTER TABLE public.colegios ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='updated_at') THEN
    ALTER TABLE public.colegios ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='created_by') THEN
    ALTER TABLE public.colegios ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='deleted_at') THEN
    ALTER TABLE public.colegios ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='created_at') THEN
    ALTER TABLE public.contratos ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='updated_at') THEN
    ALTER TABLE public.contratos ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='created_by') THEN
    ALTER TABLE public.contratos ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='deleted_at') THEN
    ALTER TABLE public.contratos ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='created_at') THEN
    ALTER TABLE public.cuentas_financieras ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='updated_at') THEN
    ALTER TABLE public.cuentas_financieras ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='created_by') THEN
    ALTER TABLE public.cuentas_financieras ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='deleted_at') THEN
    ALTER TABLE public.cuentas_financieras ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='created_at') THEN
    ALTER TABLE public.donaciones ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='updated_at') THEN
    ALTER TABLE public.donaciones ADD COLUMN updated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='created_by') THEN
    ALTER TABLE public.donaciones ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='deleted_at') THEN
    ALTER TABLE public.donaciones ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- 2) Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3) Attach updated_at trigger to all detected tables
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_alumnos_set_updated_at') THEN
      CREATE TRIGGER trg_alumnos_set_updated_at BEFORE UPDATE ON public.alumnos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_alumnos_extra_catedra_set_updated_at') THEN
      CREATE TRIGGER trg_alumnos_extra_catedra_set_updated_at BEFORE UPDATE ON public.alumnos_extra_catedra FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_alumnos_nucleos_set_updated_at') THEN
      CREATE TRIGGER trg_alumnos_nucleos_set_updated_at BEFORE UPDATE ON public.alumnos_nucleos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_virtuales' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_alumnos_virtuales_set_updated_at') THEN
      CREATE TRIGGER trg_alumnos_virtuales_set_updated_at BEFORE UPDATE ON public.alumnos_virtuales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_aportes_capital_set_updated_at') THEN
      CREATE TRIGGER trg_aportes_capital_set_updated_at BEFORE UPDATE ON public.aportes_capital FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_egreso' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_categorias_egreso_set_updated_at') THEN
      CREATE TRIGGER trg_categorias_egreso_set_updated_at BEFORE UPDATE ON public.categorias_egreso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categorias_producto' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_categorias_producto_set_updated_at') THEN
      CREATE TRIGGER trg_categorias_producto_set_updated_at BEFORE UPDATE ON public.categorias_producto FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_clases_particulares_set_updated_at') THEN
      CREATE TRIGGER trg_clases_particulares_set_updated_at BEFORE UPDATE ON public.clases_particulares FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clientes_particulares' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_clientes_particulares_set_updated_at') THEN
      CREATE TRIGGER trg_clientes_particulares_set_updated_at BEFORE UPDATE ON public.clientes_particulares FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_clubes_set_updated_at') THEN
      CREATE TRIGGER trg_clubes_set_updated_at BEFORE UPDATE ON public.clubes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_colegios_set_updated_at') THEN
      CREATE TRIGGER trg_colegios_set_updated_at BEFORE UPDATE ON public.colegios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_contratos_set_updated_at') THEN
      CREATE TRIGGER trg_contratos_set_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cuentas_financieras_set_updated_at') THEN
      CREATE TRIGGER trg_cuentas_financieras_set_updated_at BEFORE UPDATE ON public.cuentas_financieras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='donaciones' AND column_name='updated_at') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_donaciones_set_updated_at') THEN
      CREATE TRIGGER trg_donaciones_set_updated_at BEFORE UPDATE ON public.donaciones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

-- 4) Ensure FK indexes + constraints (missing ones only)
CREATE INDEX IF NOT EXISTS idx_alumnos_representante_id ON public.alumnos(representante_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_alumnos_representante_id') THEN
    ALTER TABLE public.alumnos ADD CONSTRAINT fk_alumnos_representante_id FOREIGN KEY (representante_id) REFERENCES public.representantes(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_alumnos_extra_catedra_periodo_id ON public.alumnos_extra_catedra(periodo_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_alumnos_extra_catedra_periodo_id') THEN
    ALTER TABLE public.alumnos_extra_catedra ADD CONSTRAINT fk_alumnos_extra_catedra_periodo_id FOREIGN KEY (periodo_id) REFERENCES public.periodos_escolares(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_nucleo_id ON public.alumnos_nucleos(nucleo_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_alumnos_nucleos_nucleo_id') THEN
    ALTER TABLE public.alumnos_nucleos ADD CONSTRAINT fk_alumnos_nucleos_nucleo_id FOREIGN KEY (nucleo_id) REFERENCES public.nucleos(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_servicio_id ON public.alumnos_nucleos(servicio_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_alumnos_nucleos_servicio_id') THEN
    ALTER TABLE public.alumnos_nucleos ADD CONSTRAINT fk_alumnos_nucleos_servicio_id FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aportes_capital_cuenta_destino_id ON public.aportes_capital(cuenta_destino_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_aportes_capital_cuenta_destino_id') THEN
    ALTER TABLE public.aportes_capital ADD CONSTRAINT fk_aportes_capital_cuenta_destino_id FOREIGN KEY (cuenta_destino_id) REFERENCES public.cuentas_financieras(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aportes_capital_periodo_id ON public.aportes_capital(periodo_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_aportes_capital_periodo_id') THEN
    ALTER TABLE public.aportes_capital ADD CONSTRAINT fk_aportes_capital_periodo_id FOREIGN KEY (periodo_id) REFERENCES public.periodos_escolares(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aportes_capital_socio_id ON public.aportes_capital(socio_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_aportes_capital_socio_id') THEN
    ALTER TABLE public.aportes_capital ADD CONSTRAINT fk_aportes_capital_socio_id FOREIGN KEY (socio_id) REFERENCES public.socios(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aportes_capital_transaccion_id ON public.aportes_capital(transaccion_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_aportes_capital_transaccion_id') THEN
    ALTER TABLE public.aportes_capital ADD CONSTRAINT fk_aportes_capital_transaccion_id FOREIGN KEY (transaccion_id) REFERENCES public.transacciones(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_clases_particulares_profesor_id ON public.clases_particulares(profesor_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_clases_particulares_profesor_id') THEN
    ALTER TABLE public.clases_particulares ADD CONSTRAINT fk_clases_particulares_profesor_id FOREIGN KEY (profesor_id) REFERENCES public.personal(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_contratos_periodo_id ON public.contratos(periodo_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_contratos_periodo_id') THEN
    ALTER TABLE public.contratos ADD CONSTRAINT fk_contratos_periodo_id FOREIGN KEY (periodo_id) REFERENCES public.periodos_escolares(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_donaciones_cuenta_destino_id ON public.donaciones(cuenta_destino_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_donaciones_cuenta_destino_id') THEN
    ALTER TABLE public.donaciones ADD CONSTRAINT fk_donaciones_cuenta_destino_id FOREIGN KEY (cuenta_destino_id) REFERENCES public.cuentas_financieras(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_donaciones_donante_id ON public.donaciones(donante_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_donaciones_donante_id') THEN
    ALTER TABLE public.donaciones ADD CONSTRAINT fk_donaciones_donante_id FOREIGN KEY (donante_id) REFERENCES public.donantes(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 5) Monetary/percentage sanity checks (only if column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='monto_mensual_pactado') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_extra_catedra_monto_mensual_pactado_nonneg') THEN
      ALTER TABLE public.alumnos_extra_catedra ADD CONSTRAINT chk_alumnos_extra_catedra_monto_mensual_pactado_nonneg CHECK (monto_mensual_pactado >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_extra_catedra' AND column_name='porcentaje_beca') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_extra_catedra_porcentaje_beca_nonneg') THEN
      ALTER TABLE public.alumnos_extra_catedra ADD CONSTRAINT chk_alumnos_extra_catedra_porcentaje_beca_nonneg CHECK (porcentaje_beca >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='alumnos_nucleos' AND column_name='porcentaje_beca') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_alumnos_nucleos_porcentaje_beca_nonneg') THEN
      ALTER TABLE public.alumnos_nucleos ADD CONSTRAINT chk_alumnos_nucleos_porcentaje_beca_nonneg CHECK (porcentaje_beca >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='aportes_capital' AND column_name='monto_usd') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_aportes_capital_monto_usd_nonneg') THEN
      ALTER TABLE public.aportes_capital ADD CONSTRAINT chk_aportes_capital_monto_usd_nonneg CHECK (monto_usd >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clases_particulares' AND column_name='tarifa') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_clases_particulares_tarifa_nonneg') THEN
      ALTER TABLE public.clases_particulares ADD CONSTRAINT chk_clases_particulares_tarifa_nonneg CHECK (tarifa >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='monto_unico_mensual') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_clubes_monto_unico_mensual_nonneg') THEN
      ALTER TABLE public.clubes ADD CONSTRAINT chk_clubes_monto_unico_mensual_nonneg CHECK (monto_unico_mensual >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='colegios' AND column_name='monto_fijo_mensual') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_colegios_monto_fijo_mensual_nonneg') THEN
      ALTER TABLE public.colegios ADD CONSTRAINT chk_colegios_monto_fijo_mensual_nonneg CHECK (monto_fijo_mensual >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contratos' AND column_name='monto_acordado_ciclo') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_contratos_monto_acordado_ciclo_nonneg') THEN
      ALTER TABLE public.contratos ADD CONSTRAINT chk_contratos_monto_acordado_ciclo_nonneg CHECK (monto_acordado_ciclo >= 0);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cuentas_financieras' AND column_name='saldo_inicial') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_cuentas_financieras_saldo_inicial_nonneg') THEN
      ALTER TABLE public.cuentas_financieras ADD CONSTRAINT chk_cuentas_financieras_saldo_inicial_nonneg CHECK (saldo_inicial >= 0);
    END IF;
  END IF;
END $$;

-- 6) Search indexes for common text fields
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_cedula ON public.alumnos_nucleos(cedula);
CREATE INDEX IF NOT EXISTS idx_alumnos_virtuales_email_lower ON public.alumnos_virtuales(lower(email));
CREATE INDEX IF NOT EXISTS idx_alumnos_name_trgm ON public.alumnos USING gin ((coalesce(apellidos,'') || ' ' || coalesce(nombres,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alumnos_extra_catedra_name_trgm ON public.alumnos_extra_catedra USING gin ((coalesce(nombre_completo,'') || ' ' || coalesce(nombre_representante,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_name_trgm ON public.alumnos_nucleos USING gin ((coalesce(nombre_completo,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alumnos_virtuales_name_trgm ON public.alumnos_virtuales USING gin ((coalesce(nombre_completo,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categorias_egreso_name_trgm ON public.categorias_egreso USING gin ((coalesce(nombre,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categorias_producto_name_trgm ON public.categorias_producto USING gin ((coalesce(nombre,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clases_particulares_name_trgm ON public.clases_particulares USING gin ((coalesce(nombre,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_particulares_name_trgm ON public.clientes_particulares USING gin ((coalesce(apellido_familia,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clubes_name_trgm ON public.clubes USING gin ((coalesce(nombre,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_colegios_name_trgm ON public.colegios USING gin ((coalesce(contacto_nombre,'') || ' ' || coalesce(nombre,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cuentas_financieras_name_trgm ON public.cuentas_financieras USING gin ((coalesce(nombre,'')) gin_trgm_ops);

-- 7) Optional templates (manual): ENUM + RLS
-- ENUM TEMPLATE (manual):
-- CREATE TYPE public.estado_enum AS ENUM ('activo','inactivo','suspendido');
-- ALTER TABLE public.alumnos ADD COLUMN estado_new public.estado_enum;
-- UPDATE public.alumnos SET estado_new = CASE lower(coalesce(estado,'')) WHEN 'activo' THEN 'activo'::public.estado_enum WHEN 'inactivo' THEN 'inactivo'::public.estado_enum ELSE 'suspendido'::public.estado_enum END;
-- ALTER TABLE public.alumnos DROP COLUMN estado;
-- ALTER TABLE public.alumnos RENAME COLUMN estado_new TO estado;

-- RLS TEMPLATE (manual):
-- ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY alumnos_select ON public.alumnos FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY alumnos_write ON public.alumnos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
