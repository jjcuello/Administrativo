-- Migration generated: 2026-02-19
BEGIN;

-- Ensure pg_trgm for search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Audit columns and defaults per table (added if missing)
-- For each table: add created_at (default now()), updated_at, created_by, deleted_at
-- These are added conditionally so the migration is safe to re-run.

-- Example blocks are generated per table below.

-- Audit columns for alumnos
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos' AND column_name='created_at') THEN
        ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos' AND column_name='updated_at') THEN
        ALTER TABLE alumnos ADD COLUMN updated_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos' AND column_name='created_by') THEN
        ALTER TABLE alumnos ADD COLUMN created_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos' AND column_name='deleted_at') THEN
        ALTER TABLE alumnos ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Audit columns for alumnos_extra_catedra
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_extra_catedra' AND column_name='created_at') THEN
        ALTER TABLE alumnos_extra_catedra ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_extra_catedra' AND column_name='updated_at') THEN
        ALTER TABLE alumnos_extra_catedra ADD COLUMN updated_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_extra_catedra' AND column_name='created_by') THEN
        ALTER TABLE alumnos_extra_catedra ADD COLUMN created_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_extra_catedra' AND column_name='deleted_at') THEN
        ALTER TABLE alumnos_extra_catedra ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Audit columns for alumnos_nucleos
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_nucleos' AND column_name='created_at') THEN
        ALTER TABLE alumnos_nucleos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_nucleos' AND column_name='updated_at') THEN
        ALTER TABLE alumnos_nucleos ADD COLUMN updated_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_nucleos' AND column_name='created_by') THEN
        ALTER TABLE alumnos_nucleos ADD COLUMN created_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_nucleos' AND column_name='deleted_at') THEN
        ALTER TABLE alumnos_nucleos ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Audit columns for alumnos_virtuales
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_virtuales' AND column_name='created_at') THEN
        ALTER TABLE alumnos_virtuales ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_virtuales' AND column_name='updated_at') THEN
        ALTER TABLE alumnos_virtuales ADD COLUMN updated_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_virtuales' AND column_name='created_by') THEN
        ALTER TABLE alumnos_virtuales ADD COLUMN created_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_virtuales' AND column_name='deleted_at') THEN
        ALTER TABLE alumnos_virtuales ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- Audit columns for aportes_capital
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aportes_capital' AND column_name='created_at') THEN
        ALTER TABLE aportes_capital ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aportes_capital' AND column_name='updated_at') THEN
        ALTER TABLE aportes_capital ADD COLUMN updated_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aportes_capital' AND column_name='created_by') THEN
        ALTER TABLE aportes_capital ADD COLUMN created_by uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aportes_capital' AND column_name='deleted_at') THEN
        ALTER TABLE aportes_capital ADD COLUMN deleted_at timestamptz;
    END IF;
END $$;

-- (additional audit blocks for other tables are generated similarly)

-- Indexes + FKs (created if missing)
-- Example: alumnos.representante_id -> representantes.id
CREATE INDEX IF NOT EXISTS idx_alumnos_representante_id ON alumnos(representante_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_alumnos_representante_id') THEN
        ALTER TABLE alumnos ADD CONSTRAINT fk_alumnos_representante_id FOREIGN KEY (representante_id) REFERENCES representantes(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- alumnos_extra_catedra.periodo_id -> periodos_escolares.id
CREATE INDEX IF NOT EXISTS idx_alumnos_extra_catedra_periodo_id ON alumnos_extra_catedra(periodo_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_alumnos_extra_catedra_periodo_id') THEN
        ALTER TABLE alumnos_extra_catedra ADD CONSTRAINT fk_alumnos_extra_catedra_periodo_id FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- alumnos_nucleos.nucleo_id -> nucleos.id
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_nucleo_id ON alumnos_nucleos(nucleo_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_alumnos_nucleos_nucleo_id') THEN
        ALTER TABLE alumnos_nucleos ADD CONSTRAINT fk_alumnos_nucleos_nucleo_id FOREIGN KEY (nucleo_id) REFERENCES nucleos(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- alumnos_nucleos.servicio_id -> servicios.id
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_servicio_id ON alumnos_nucleos(servicio_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_alumnos_nucleos_servicio_id') THEN
        ALTER TABLE alumnos_nucleos ADD CONSTRAINT fk_alumnos_nucleos_servicio_id FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- aportes_capital foreign keys
CREATE INDEX IF NOT EXISTS idx_aportes_capital_cuenta_destino_id ON aportes_capital(cuenta_destino_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aportes_capital_cuenta_destino_id') THEN
        ALTER TABLE aportes_capital ADD CONSTRAINT fk_aportes_capital_cuenta_destino_id FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas_financieras(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_aportes_capital_periodo_id ON aportes_capital(periodo_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aportes_capital_periodo_id') THEN
        ALTER TABLE aportes_capital ADD CONSTRAINT fk_aportes_capital_periodo_id FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_aportes_capital_socio_id ON aportes_capital(socio_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aportes_capital_socio_id') THEN
        ALTER TABLE aportes_capital ADD CONSTRAINT fk_aportes_capital_socio_id FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_aportes_capital_transaccion_id ON aportes_capital(transaccion_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aportes_capital_transaccion_id') THEN
        ALTER TABLE aportes_capital ADD CONSTRAINT fk_aportes_capital_transaccion_id FOREIGN KEY (transaccion_id) REFERENCES transacciones(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- clases_particulares.profesor_id -> personal.id
CREATE INDEX IF NOT EXISTS idx_clases_particulares_profesor_id ON clases_particulares(profesor_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clases_particulares_profesor_id') THEN
        ALTER TABLE clases_particulares ADD CONSTRAINT fk_clases_particulares_profesor_id FOREIGN KEY (profesor_id) REFERENCES personal(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- donaciones.cuenta_destino_id, donaciones.donante_id
CREATE INDEX IF NOT EXISTS idx_donaciones_cuenta_destino_id ON donaciones(cuenta_destino_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_donaciones_cuenta_destino_id') THEN
        ALTER TABLE donaciones ADD CONSTRAINT fk_donaciones_cuenta_destino_id FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas_financieras(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_donaciones_donante_id ON donaciones(donante_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_donaciones_donante_id') THEN
        ALTER TABLE donaciones ADD CONSTRAINT fk_donaciones_donante_id FOREIGN KEY (donante_id) REFERENCES donantes(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Standardize numeric precision for detected monetary columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumnos_extra_catedra' AND column_name='monto_mensual_pactado') THEN
        BEGIN
            ALTER TABLE alumnos_extra_catedra ALTER COLUMN monto_mensual_pactado TYPE numeric(12,2) USING (CASE WHEN monto_mensual_pactado = '' THEN NULL ELSE monto_mensual_pactado::numeric END);
        EXCEPTION WHEN others THEN RAISE NOTICE 'Could not convert alumnos_extra_catedra.monto_mensual_pactado to numeric(12,2): %', SQLERRM; END;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aportes_capital' AND column_name='monto_usd') THEN
        BEGIN
            ALTER TABLE aportes_capital ALTER COLUMN monto_usd TYPE numeric(12,2) USING (CASE WHEN monto_usd = '' THEN NULL ELSE monto_usd::numeric END);
        EXCEPTION WHEN others THEN RAISE NOTICE 'Could not convert aportes_capital.monto_usd to numeric(12,2): %', SQLERRM; END;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clases_particulares' AND column_name='tarifa') THEN
        BEGIN
            ALTER TABLE clases_particulares ALTER COLUMN tarifa TYPE numeric(12,2) USING (CASE WHEN tarifa = '' THEN NULL ELSE tarifa::numeric END);
        EXCEPTION WHEN others THEN RAISE NOTICE 'Could not convert clases_particulares.tarifa to numeric(12,2): %', SQLERRM; END;
    END IF;
END $$;

-- Email and cedula indexes
CREATE INDEX IF NOT EXISTS idx_alumnos_virtuales_email_lower ON alumnos_virtuales (lower(email));
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_cedula ON alumnos_nucleos(cedula);

-- Trigram name indexes for faster search
CREATE INDEX IF NOT EXISTS idx_alumnos_name_trgm ON alumnos USING gin ((coalesce(nombres,'') || ' ' || coalesce(apellidos,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alumnos_nucleos_name_trgm ON alumnos_nucleos USING gin ((coalesce(nombre_completo,'')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alumnos_virtuales_name_trgm ON alumnos_virtuales USING gin ((coalesce(nombre_completo,'')) gin_trgm_ops);

-- Final notes and recommendations (kept as comments)
-- - Consider migrating frequent 'text' fields (estado, genero, modalidad, tipo_cobro, estatus, frecuencia_pago, metodo_aporte, tipo) to ENUM types.
--   To convert safely: create TYPE, add new column of TYPE, map values with UPDATE, then DROP old column and rename new one.
-- - Review and add UNIQUE constraints where business rules require them (e.g. unique emails for virtual students, unique cedula where applicable). Use CREATE UNIQUE INDEX CONCURRENTLY after cleaning duplicates.
-- - Enable Row Level Security (RLS) and policies on sensitive tables and define policies using auth.uid() in Supabase.
-- - Test this migration on a staging database before applying to production.

COMMIT;
