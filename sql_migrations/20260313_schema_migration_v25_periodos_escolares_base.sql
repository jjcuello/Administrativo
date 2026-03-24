-- Migration v25 generated: 2026-03-13
-- Goal: formalize school-year separation with a canonical period table,
--       automatic assignment for transactional records, and backfill of legacy data.
-- Notes:
--   - Reuses existing periodo_id where tables already point to public.periodos_escolares.
--   - Adds periodo_escolar_id where the table had no explicit school-year reference.
--   - Uses logical separation (single DB, period-linked data), not physical DB split.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.periodos_escolares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  nombre text,
  fecha_inicio date,
  fecha_fin date,
  estado text NOT NULL DEFAULT 'abierto',
  es_actual boolean NOT NULL DEFAULT false,
  fecha_cierre timestamptz,
  fecha_consolidacion timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.periodos_escolares
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS fecha_fin date,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS es_actual boolean,
  ADD COLUMN IF NOT EXISTS fecha_cierre timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_consolidacion timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.periodos_escolares
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN estado SET DEFAULT 'abierto',
  ALTER COLUMN es_actual SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.periodos_escolares
SET estado = 'abierto'
WHERE estado IS NULL OR btrim(estado) = '';

UPDATE public.periodos_escolares
SET es_actual = false
WHERE es_actual IS NULL;

UPDATE public.periodos_escolares
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.periodos_escolares
SET updated_at = now()
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.periodo_escolar_inicio_fecha(p_fecha date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_fecha IS NULL THEN NULL
    WHEN EXTRACT(MONTH FROM p_fecha) >= 9 THEN make_date(EXTRACT(YEAR FROM p_fecha)::int, 9, 1)
    ELSE make_date((EXTRACT(YEAR FROM p_fecha)::int - 1), 9, 1)
  END;
$$;

CREATE OR REPLACE FUNCTION public.periodo_escolar_fin_fecha(p_fecha date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_fecha IS NULL THEN NULL
    WHEN EXTRACT(MONTH FROM p_fecha) >= 9 THEN make_date((EXTRACT(YEAR FROM p_fecha)::int + 1), 8, 31)
    ELSE make_date(EXTRACT(YEAR FROM p_fecha)::int, 8, 31)
  END;
$$;

CREATE OR REPLACE FUNCTION public.periodo_escolar_codigo(p_fecha date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_fecha IS NULL THEN NULL
    WHEN EXTRACT(MONTH FROM p_fecha) >= 9
      THEN EXTRACT(YEAR FROM p_fecha)::int::text || '-' || (EXTRACT(YEAR FROM p_fecha)::int + 1)::text
    ELSE (EXTRACT(YEAR FROM p_fecha)::int - 1)::text || '-' || EXTRACT(YEAR FROM p_fecha)::int::text
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_periodo_escolar(p_fecha date)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_codigo text;
  v_nombre text;
  v_fecha_inicio date;
  v_fecha_fin date;
  v_estado text;
BEGIN
  IF p_fecha IS NULL THEN
    RETURN NULL;
  END IF;

  v_codigo := public.periodo_escolar_codigo(p_fecha);
  v_fecha_inicio := public.periodo_escolar_inicio_fecha(p_fecha);
  v_fecha_fin := public.periodo_escolar_fin_fecha(p_fecha);
  v_nombre := 'Año escolar ' || replace(v_codigo, '-', ' - ');
  v_estado := CASE
    WHEN CURRENT_DATE < v_fecha_inicio THEN 'planificado'
    WHEN CURRENT_DATE > v_fecha_fin THEN 'cerrado'
    ELSE 'abierto'
  END;

  SELECT p.id
  INTO v_id
  FROM public.periodos_escolares p
  WHERE p.deleted_at IS NULL
    AND (
      p.codigo = v_codigo
      OR (p.fecha_inicio IS NOT NULL AND p.fecha_fin IS NOT NULL AND p_fecha BETWEEN p.fecha_inicio AND p.fecha_fin)
    )
  ORDER BY p.es_actual DESC, p.fecha_inicio DESC NULLS LAST, p.created_at ASC
  LIMIT 1;

  IF v_id IS NULL THEN
    BEGIN
      INSERT INTO public.periodos_escolares (
        codigo,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado,
        es_actual,
        created_at,
        updated_at
      )
      VALUES (
        v_codigo,
        v_nombre,
        v_fecha_inicio,
        v_fecha_fin,
        v_estado,
        false,
        now(),
        now()
      )
      RETURNING id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT p.id
      INTO v_id
      FROM public.periodos_escolares p
      WHERE p.deleted_at IS NULL
        AND p.codigo = v_codigo
      ORDER BY p.created_at ASC
      LIMIT 1;
    END;
  ELSE
    UPDATE public.periodos_escolares
    SET codigo = COALESCE(codigo, v_codigo),
        nombre = COALESCE(nombre, v_nombre),
        fecha_inicio = COALESCE(fecha_inicio, v_fecha_inicio),
        fecha_fin = COALESCE(fecha_fin, v_fecha_fin),
        estado = COALESCE(NULLIF(btrim(estado), ''), v_estado),
        updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

UPDATE public.periodos_escolares
SET fecha_inicio = make_date(split_part(codigo, '-', 1)::int, 9, 1)
WHERE (fecha_inicio IS NULL)
  AND codigo ~ '^[0-9]{4}-[0-9]{4}$';

UPDATE public.periodos_escolares
SET fecha_fin = make_date(split_part(codigo, '-', 2)::int, 8, 31)
WHERE (fecha_fin IS NULL)
  AND codigo ~ '^[0-9]{4}-[0-9]{4}$';

UPDATE public.periodos_escolares
SET codigo = public.periodo_escolar_codigo(fecha_inicio)
WHERE (codigo IS NULL OR btrim(codigo) = '')
  AND fecha_inicio IS NOT NULL;

UPDATE public.periodos_escolares
SET nombre = 'Año escolar ' || replace(codigo, '-', ' - ')
WHERE (nombre IS NULL OR btrim(nombre) = '')
  AND codigo IS NOT NULL;

UPDATE public.periodos_escolares
SET estado = CASE
  WHEN fecha_inicio IS NULL OR fecha_fin IS NULL THEN estado
  WHEN CURRENT_DATE < fecha_inicio THEN 'planificado'
  WHEN CURRENT_DATE > fecha_fin THEN 'cerrado'
  ELSE 'abierto'
END
WHERE estado IS NULL OR btrim(estado) = '';

UPDATE public.periodos_escolares
SET es_actual = false
WHERE deleted_at IS NULL;

WITH periodo_actual AS (
  SELECT id
  FROM public.periodos_escolares
  WHERE deleted_at IS NULL
    AND fecha_inicio IS NOT NULL
    AND fecha_fin IS NOT NULL
    AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
  ORDER BY fecha_inicio DESC
  LIMIT 1
)
UPDATE public.periodos_escolares p
SET es_actual = true,
    updated_at = now()
FROM periodo_actual pa
WHERE p.id = pa.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_periodos_escolares_codigo'
      AND conrelid = 'public.periodos_escolares'::regclass
  ) THEN
    ALTER TABLE public.periodos_escolares
      ADD CONSTRAINT chk_periodos_escolares_codigo
      CHECK (
        codigo IS NULL
        OR (
          codigo ~ '^[0-9]{4}-[0-9]{4}$'
          AND split_part(codigo, '-', 2)::int = split_part(codigo, '-', 1)::int + 1
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_periodos_escolares_fechas'
      AND conrelid = 'public.periodos_escolares'::regclass
  ) THEN
    ALTER TABLE public.periodos_escolares
      ADD CONSTRAINT chk_periodos_escolares_fechas
      CHECK (fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin >= fecha_inicio);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_periodos_escolares_estado'
      AND conrelid = 'public.periodos_escolares'::regclass
  ) THEN
    ALTER TABLE public.periodos_escolares
      ADD CONSTRAINT chk_periodos_escolares_estado
      CHECK (estado IN ('planificado', 'abierto', 'cerrado', 'archivado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_periodos_escolares_fecha_inicio
  ON public.periodos_escolares(fecha_inicio);

CREATE INDEX IF NOT EXISTS idx_periodos_escolares_fecha_fin
  ON public.periodos_escolares(fecha_fin);

CREATE INDEX IF NOT EXISTS idx_periodos_escolares_estado
  ON public.periodos_escolares(estado);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uidx_periodos_escolares_codigo_activo'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.periodos_escolares
    WHERE deleted_at IS NULL
      AND codigo IS NOT NULL
    GROUP BY lower(codigo)
    HAVING COUNT(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uidx_periodos_escolares_codigo_activo ON public.periodos_escolares (lower(codigo)) WHERE deleted_at IS NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uidx_periodos_escolares_es_actual'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.periodos_escolares
    WHERE deleted_at IS NULL AND es_actual IS TRUE
    GROUP BY es_actual
    HAVING COUNT(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uidx_periodos_escolares_es_actual ON public.periodos_escolares (es_actual) WHERE es_actual IS TRUE AND deleted_at IS NULL';
  END IF;
END $$;

CREATE TEMP TABLE IF NOT EXISTS _v25_periodo_fechas (
  fecha date PRIMARY KEY
) ON COMMIT DROP;

TRUNCATE _v25_periodo_fechas;

DO $$
BEGIN
  IF to_regclass('public.ingresos') IS NOT NULL THEN
    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT fecha_ingreso
    FROM public.ingresos
    WHERE fecha_ingreso IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.egresos') IS NOT NULL THEN
    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT fecha_pago
    FROM public.egresos
    WHERE fecha_pago IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT to_date(periodo_nomina_ym || '-01', 'YYYY-MM-DD')
    FROM public.egresos
    WHERE periodo_nomina_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.nominas_mensuales') IS NOT NULL THEN
    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT to_date(periodo_ym || '-01', 'YYYY-MM-DD')
    FROM public.nominas_mensuales
    WHERE periodo_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.inscripciones') IS NOT NULL THEN
    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT fecha_inscripcion
    FROM public.inscripciones
    WHERE fecha_inscripcion IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.contratos') IS NOT NULL THEN
    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT fecha_inicio
    FROM public.contratos
    WHERE fecha_inicio IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.alumnos_extra_catedra') IS NOT NULL THEN
    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT fecha_inscripcion
    FROM public.alumnos_extra_catedra
    WHERE fecha_inscripcion IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.aportes_capital') IS NOT NULL THEN
    INSERT INTO _v25_periodo_fechas (fecha)
    SELECT DISTINCT fecha_aporte
    FROM public.aportes_capital
    WHERE fecha_aporte IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

SELECT public.ensure_periodo_escolar(fecha)
FROM _v25_periodo_fechas
WHERE fecha IS NOT NULL;

SELECT public.ensure_periodo_escolar(CURRENT_DATE);

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS periodo_escolar_id uuid;

ALTER TABLE public.nominas_mensuales
  ADD COLUMN IF NOT EXISTS periodo_escolar_id uuid;

ALTER TABLE public.inscripciones
  ADD COLUMN IF NOT EXISTS periodo_escolar_id uuid;

DO $$
BEGIN
  IF to_regclass('public.egresos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'egresos_periodo_escolar_id_fkey'
         AND conrelid = 'public.egresos'::regclass
     ) THEN
    ALTER TABLE public.egresos
      ADD CONSTRAINT egresos_periodo_escolar_id_fkey
      FOREIGN KEY (periodo_escolar_id)
      REFERENCES public.periodos_escolares(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.nominas_mensuales') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'nominas_mensuales_periodo_escolar_id_fkey'
         AND conrelid = 'public.nominas_mensuales'::regclass
     ) THEN
    ALTER TABLE public.nominas_mensuales
      ADD CONSTRAINT nominas_mensuales_periodo_escolar_id_fkey
      FOREIGN KEY (periodo_escolar_id)
      REFERENCES public.periodos_escolares(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.inscripciones') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'inscripciones_periodo_escolar_id_fkey'
         AND conrelid = 'public.inscripciones'::regclass
     ) THEN
    ALTER TABLE public.inscripciones
      ADD CONSTRAINT inscripciones_periodo_escolar_id_fkey
      FOREIGN KEY (periodo_escolar_id)
      REFERENCES public.periodos_escolares(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_egresos_periodo_escolar_id
  ON public.egresos(periodo_escolar_id);

CREATE INDEX IF NOT EXISTS idx_nominas_mensuales_periodo_escolar_id
  ON public.nominas_mensuales(periodo_escolar_id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_periodo_escolar_id
  ON public.inscripciones(periodo_escolar_id);

UPDATE public.ingresos
SET periodo_id = public.ensure_periodo_escolar(COALESCE(fecha_ingreso, created_at::date))
WHERE periodo_id IS NULL
  AND COALESCE(fecha_ingreso, created_at::date) IS NOT NULL;

UPDATE public.contratos
SET periodo_id = public.ensure_periodo_escolar(COALESCE(fecha_inicio, created_at::date))
WHERE periodo_id IS NULL
  AND COALESCE(fecha_inicio, created_at::date) IS NOT NULL;

UPDATE public.alumnos_extra_catedra
SET periodo_id = public.ensure_periodo_escolar(COALESCE(fecha_inscripcion, created_at::date))
WHERE periodo_id IS NULL
  AND COALESCE(fecha_inscripcion, created_at::date) IS NOT NULL;

UPDATE public.aportes_capital
SET periodo_id = public.ensure_periodo_escolar(COALESCE(fecha_aporte, created_at::date))
WHERE periodo_id IS NULL
  AND COALESCE(fecha_aporte, created_at::date) IS NOT NULL;

UPDATE public.egresos
SET periodo_escolar_id = public.ensure_periodo_escolar(
  COALESCE(
    CASE
      WHEN periodo_nomina_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN to_date(periodo_nomina_ym || '-01', 'YYYY-MM-DD')
      ELSE NULL
    END,
    fecha_pago,
    created_at::date
  )
)
WHERE periodo_escolar_id IS NULL
  AND COALESCE(
    CASE
      WHEN periodo_nomina_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN to_date(periodo_nomina_ym || '-01', 'YYYY-MM-DD')
      ELSE NULL
    END,
    fecha_pago,
    created_at::date
  ) IS NOT NULL;

UPDATE public.nominas_mensuales
SET periodo_escolar_id = public.ensure_periodo_escolar(
  COALESCE(
    CASE
      WHEN periodo_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN to_date(periodo_ym || '-01', 'YYYY-MM-DD')
      ELSE NULL
    END,
    fecha_cierre,
    created_at::date
  )
)
WHERE periodo_escolar_id IS NULL
  AND COALESCE(
    CASE
      WHEN periodo_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN to_date(periodo_ym || '-01', 'YYYY-MM-DD')
      ELSE NULL
    END,
    fecha_cierre,
    created_at::date
  ) IS NOT NULL;

UPDATE public.inscripciones
SET periodo_escolar_id = public.ensure_periodo_escolar(COALESCE(fecha_inscripcion, created_at::date))
WHERE periodo_escolar_id IS NULL
  AND COALESCE(fecha_inscripcion, created_at::date) IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_periodo_escolar_en_transacciones()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_fecha date;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'ingresos' THEN
      IF NEW.periodo_id IS NULL
         OR (
           TG_OP = 'UPDATE'
           AND NEW.periodo_id IS NOT DISTINCT FROM OLD.periodo_id
           AND (
             NEW.fecha_ingreso IS DISTINCT FROM OLD.fecha_ingreso
             OR NEW.created_at IS DISTINCT FROM OLD.created_at
           )
         ) THEN
        v_fecha := COALESCE(NEW.fecha_ingreso, NEW.created_at::date);
        NEW.periodo_id := public.ensure_periodo_escolar(v_fecha);
      END IF;

    WHEN 'contratos' THEN
      IF NEW.periodo_id IS NULL
         OR (
           TG_OP = 'UPDATE'
           AND NEW.periodo_id IS NOT DISTINCT FROM OLD.periodo_id
           AND (
             NEW.fecha_inicio IS DISTINCT FROM OLD.fecha_inicio
             OR NEW.created_at IS DISTINCT FROM OLD.created_at
           )
         ) THEN
        v_fecha := COALESCE(NEW.fecha_inicio, NEW.created_at::date);
        NEW.periodo_id := public.ensure_periodo_escolar(v_fecha);
      END IF;

    WHEN 'alumnos_extra_catedra' THEN
      IF NEW.periodo_id IS NULL
         OR (
           TG_OP = 'UPDATE'
           AND NEW.periodo_id IS NOT DISTINCT FROM OLD.periodo_id
           AND (
             NEW.fecha_inscripcion IS DISTINCT FROM OLD.fecha_inscripcion
             OR NEW.created_at IS DISTINCT FROM OLD.created_at
           )
         ) THEN
        v_fecha := COALESCE(NEW.fecha_inscripcion, NEW.created_at::date);
        NEW.periodo_id := public.ensure_periodo_escolar(v_fecha);
      END IF;

    WHEN 'aportes_capital' THEN
      IF NEW.periodo_id IS NULL
         OR (
           TG_OP = 'UPDATE'
           AND NEW.periodo_id IS NOT DISTINCT FROM OLD.periodo_id
           AND (
             NEW.fecha_aporte IS DISTINCT FROM OLD.fecha_aporte
             OR NEW.created_at IS DISTINCT FROM OLD.created_at
           )
         ) THEN
        v_fecha := COALESCE(NEW.fecha_aporte, NEW.created_at::date);
        NEW.periodo_id := public.ensure_periodo_escolar(v_fecha);
      END IF;

    WHEN 'egresos' THEN
      IF NEW.periodo_escolar_id IS NULL
         OR (
           TG_OP = 'UPDATE'
           AND NEW.periodo_escolar_id IS NOT DISTINCT FROM OLD.periodo_escolar_id
           AND (
             NEW.periodo_nomina_ym IS DISTINCT FROM OLD.periodo_nomina_ym
             OR NEW.fecha_pago IS DISTINCT FROM OLD.fecha_pago
             OR NEW.created_at IS DISTINCT FROM OLD.created_at
           )
         ) THEN
        v_fecha := COALESCE(
          CASE
            WHEN NEW.periodo_nomina_ym IS NOT NULL AND NEW.periodo_nomina_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
              THEN to_date(NEW.periodo_nomina_ym || '-01', 'YYYY-MM-DD')
            ELSE NULL
          END,
          NEW.fecha_pago,
          NEW.created_at::date
        );
        NEW.periodo_escolar_id := public.ensure_periodo_escolar(v_fecha);
      END IF;

    WHEN 'nominas_mensuales' THEN
      IF NEW.periodo_escolar_id IS NULL
         OR (
           TG_OP = 'UPDATE'
           AND NEW.periodo_escolar_id IS NOT DISTINCT FROM OLD.periodo_escolar_id
           AND (
             NEW.periodo_ym IS DISTINCT FROM OLD.periodo_ym
             OR NEW.fecha_cierre IS DISTINCT FROM OLD.fecha_cierre
             OR NEW.created_at IS DISTINCT FROM OLD.created_at
           )
         ) THEN
        v_fecha := COALESCE(
          CASE
            WHEN NEW.periodo_ym IS NOT NULL AND NEW.periodo_ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
              THEN to_date(NEW.periodo_ym || '-01', 'YYYY-MM-DD')
            ELSE NULL
          END,
          NEW.fecha_cierre,
          NEW.created_at::date
        );
        NEW.periodo_escolar_id := public.ensure_periodo_escolar(v_fecha);
      END IF;

    WHEN 'inscripciones' THEN
      IF NEW.periodo_escolar_id IS NULL
         OR (
           TG_OP = 'UPDATE'
           AND NEW.periodo_escolar_id IS NOT DISTINCT FROM OLD.periodo_escolar_id
           AND (
             NEW.fecha_inscripcion IS DISTINCT FROM OLD.fecha_inscripcion
             OR NEW.created_at IS DISTINCT FROM OLD.created_at
           )
         ) THEN
        v_fecha := COALESCE(NEW.fecha_inscripcion, NEW.created_at::date);
        NEW.periodo_escolar_id := public.ensure_periodo_escolar(v_fecha);
      END IF;
  END CASE;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.ingresos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_ingresos_assign_periodo_escolar ON public.ingresos;
    CREATE TRIGGER trg_ingresos_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.ingresos
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_en_transacciones();
  END IF;

  IF to_regclass('public.contratos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_contratos_assign_periodo_escolar ON public.contratos;
    CREATE TRIGGER trg_contratos_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.contratos
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_en_transacciones();
  END IF;

  IF to_regclass('public.alumnos_extra_catedra') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_alumnos_extra_catedra_assign_periodo_escolar ON public.alumnos_extra_catedra;
    CREATE TRIGGER trg_alumnos_extra_catedra_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.alumnos_extra_catedra
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_en_transacciones();
  END IF;

  IF to_regclass('public.aportes_capital') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_aportes_capital_assign_periodo_escolar ON public.aportes_capital;
    CREATE TRIGGER trg_aportes_capital_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.aportes_capital
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_en_transacciones();
  END IF;

  IF to_regclass('public.egresos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_egresos_assign_periodo_escolar ON public.egresos;
    CREATE TRIGGER trg_egresos_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.egresos
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_en_transacciones();
  END IF;

  IF to_regclass('public.nominas_mensuales') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_nominas_mensuales_assign_periodo_escolar ON public.nominas_mensuales;
    CREATE TRIGGER trg_nominas_mensuales_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.nominas_mensuales
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_en_transacciones();
  END IF;

  IF to_regclass('public.inscripciones') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_inscripciones_assign_periodo_escolar ON public.inscripciones;
    CREATE TRIGGER trg_inscripciones_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.inscripciones
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_en_transacciones();
  END IF;
END $$;

COMMIT;