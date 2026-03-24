-- Migration v9 (precheck) generated: 2026-02-19
-- Goal: verify integrity/consistency before applying new structural changes
-- Scope: read-only diagnostics over key tables from current schema snapshot

BEGIN;

SET LOCAL statement_timeout = '60s';

-- =========================================================
-- 1) Metadata sanity: duplicated column metadata rows
-- =========================================================
SELECT
  'duplicated_column_metadata' AS check_name,
  table_name,
  column_name,
  COUNT(*) AS appearances
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'alumnos',
    'alumnos_extra_catedra',
    'alumnos_nucleos',
    'alumnos_virtuales',
    'aportes_capital',
    'categorias_egreso',
    'categorias_producto',
    'clases_particulares',
    'clientes_particulares'
  )
GROUP BY table_name, column_name
HAVING COUNT(*) > 1
ORDER BY table_name, column_name;

-- =========================================================
-- 2) FK inventory for target tables
-- =========================================================
SELECT
  'fk_inventory' AS check_name,
  tc.table_name,
  kcu.column_name,
  tc.constraint_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'alumnos',
    'alumnos_extra_catedra',
    'alumnos_nucleos',
    'alumnos_virtuales',
    'aportes_capital',
    'categorias_egreso',
    'categorias_producto',
    'clases_particulares',
    'clientes_particulares'
  )
ORDER BY tc.table_name, kcu.column_name, tc.constraint_name;

-- =========================================================
-- 3) Potential duplicated FK semantics (same table/column/ref)
-- =========================================================
WITH fk_defs AS (
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
)
SELECT
  'duplicated_fk_semantics' AS check_name,
  table_name,
  column_name,
  referenced_table,
  referenced_column,
  COUNT(*) AS fk_count,
  STRING_AGG(constraint_name, ', ' ORDER BY constraint_name) AS constraints
FROM fk_defs
GROUP BY table_name, column_name, referenced_table, referenced_column
HAVING COUNT(*) > 1
ORDER BY table_name, column_name;

-- =========================================================
-- 4) FK columns without supporting index (performance/risk)
-- =========================================================
WITH fk_cols AS (
  SELECT
    con.oid AS constraint_oid,
    rel.relname AS table_name,
    att.attname AS column_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  JOIN unnest(con.conkey) AS col(attnum) ON true
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = col.attnum
  WHERE con.contype = 'f'
    AND nsp.nspname = 'public'
    AND rel.relname IN (
      'alumnos',
      'alumnos_extra_catedra',
      'alumnos_nucleos',
      'alumnos_virtuales',
      'aportes_capital',
      'categorias_egreso',
      'categorias_producto',
      'clases_particulares',
      'clientes_particulares'
    )
),
idx_cov AS (
  SELECT DISTINCT
    rel.relname AS table_name,
    att.attname AS column_name
  FROM pg_index idx
  JOIN pg_class rel ON rel.oid = idx.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  JOIN unnest(idx.indkey) AS ik(attnum) ON true
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ik.attnum
  WHERE nsp.nspname = 'public'
)
SELECT
  'fk_without_index' AS check_name,
  fk.table_name,
  fk.column_name
FROM fk_cols fk
LEFT JOIN idx_cov ix
  ON ix.table_name = fk.table_name
 AND ix.column_name = fk.column_name
WHERE ix.column_name IS NULL
ORDER BY fk.table_name, fk.column_name;

-- =========================================================
-- 5) Data integrity: orphan counters (only if tables exist)
-- =========================================================
CREATE TEMP TABLE IF NOT EXISTS _v9_orphan_results (
  source_table text,
  source_column text,
  target_table text,
  target_column text,
  orphan_count bigint
) ON COMMIT DROP;

TRUNCATE _v9_orphan_results;

DO $$
BEGIN
  -- alumnos.representante_id -> representantes.id
  IF to_regclass('public.alumnos') IS NOT NULL
     AND to_regclass('public.representantes') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'alumnos', 'representante_id', 'representantes', 'id', COUNT(*)
    FROM public.alumnos a
    LEFT JOIN public.representantes r ON r.id = a.representante_id
    WHERE a.representante_id IS NOT NULL AND r.id IS NULL;
  END IF;

  -- alumnos_extra_catedra.periodo_id -> periodos_escolares.id
  IF to_regclass('public.alumnos_extra_catedra') IS NOT NULL
     AND to_regclass('public.periodos_escolares') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'alumnos_extra_catedra', 'periodo_id', 'periodos_escolares', 'id', COUNT(*)
    FROM public.alumnos_extra_catedra aec
    LEFT JOIN public.periodos_escolares pe ON pe.id = aec.periodo_id
    WHERE aec.periodo_id IS NOT NULL AND pe.id IS NULL;
  END IF;

  -- alumnos_nucleos.nucleo_id -> nucleos.id
  IF to_regclass('public.alumnos_nucleos') IS NOT NULL
     AND to_regclass('public.nucleos') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'alumnos_nucleos', 'nucleo_id', 'nucleos', 'id', COUNT(*)
    FROM public.alumnos_nucleos an
    LEFT JOIN public.nucleos n ON n.id = an.nucleo_id
    WHERE an.nucleo_id IS NOT NULL AND n.id IS NULL;
  END IF;

  -- alumnos_nucleos.servicio_id -> servicios.id
  IF to_regclass('public.alumnos_nucleos') IS NOT NULL
     AND to_regclass('public.servicios') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'alumnos_nucleos', 'servicio_id', 'servicios', 'id', COUNT(*)
    FROM public.alumnos_nucleos an
    LEFT JOIN public.servicios s ON s.id = an.servicio_id
    WHERE an.servicio_id IS NOT NULL AND s.id IS NULL;
  END IF;

  -- aportes_capital.cuenta_destino_id -> cuentas_financieras.id
  IF to_regclass('public.aportes_capital') IS NOT NULL
     AND to_regclass('public.cuentas_financieras') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'aportes_capital', 'cuenta_destino_id', 'cuentas_financieras', 'id', COUNT(*)
    FROM public.aportes_capital ac
    LEFT JOIN public.cuentas_financieras cf ON cf.id = ac.cuenta_destino_id
    WHERE ac.cuenta_destino_id IS NOT NULL AND cf.id IS NULL;
  END IF;

  -- aportes_capital.periodo_id -> periodos_escolares.id
  IF to_regclass('public.aportes_capital') IS NOT NULL
     AND to_regclass('public.periodos_escolares') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'aportes_capital', 'periodo_id', 'periodos_escolares', 'id', COUNT(*)
    FROM public.aportes_capital ac
    LEFT JOIN public.periodos_escolares pe ON pe.id = ac.periodo_id
    WHERE ac.periodo_id IS NOT NULL AND pe.id IS NULL;
  END IF;

  -- aportes_capital.socio_id -> socios.id
  IF to_regclass('public.aportes_capital') IS NOT NULL
     AND to_regclass('public.socios') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'aportes_capital', 'socio_id', 'socios', 'id', COUNT(*)
    FROM public.aportes_capital ac
    LEFT JOIN public.socios so ON so.id = ac.socio_id
    WHERE ac.socio_id IS NOT NULL AND so.id IS NULL;
  END IF;

  -- aportes_capital.transaccion_id -> transacciones.id
  IF to_regclass('public.aportes_capital') IS NOT NULL
     AND to_regclass('public.transacciones') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'aportes_capital', 'transaccion_id', 'transacciones', 'id', COUNT(*)
    FROM public.aportes_capital ac
    LEFT JOIN public.transacciones t ON t.id = ac.transaccion_id
    WHERE ac.transaccion_id IS NOT NULL AND t.id IS NULL;
  END IF;

  -- clases_particulares.profesor_id -> personal.id
  IF to_regclass('public.clases_particulares') IS NOT NULL
     AND to_regclass('public.personal') IS NOT NULL THEN
    INSERT INTO _v9_orphan_results
    SELECT 'clases_particulares', 'profesor_id', 'personal', 'id', COUNT(*)
    FROM public.clases_particulares cp
    LEFT JOIN public.personal p ON p.id = cp.profesor_id
    WHERE cp.profesor_id IS NOT NULL AND p.id IS NULL;
  END IF;
END $$;

SELECT
  'orphan_counts' AS check_name,
  source_table,
  source_column,
  target_table,
  target_column,
  orphan_count
FROM _v9_orphan_results
ORDER BY source_table, source_column;

-- =========================================================
-- 6) Soft-delete and status profiling
-- =========================================================
SELECT 'alumnos_estado_profile' AS check_name, COALESCE(estado, '<NULL>') AS value, COUNT(*) AS total
FROM public.alumnos
GROUP BY COALESCE(estado, '<NULL>')
ORDER BY total DESC;

SELECT 'alumnos_extra_catedra_estatus_profile' AS check_name, COALESCE(estatus, '<NULL>') AS value, COUNT(*) AS total
FROM public.alumnos_extra_catedra
GROUP BY COALESCE(estatus, '<NULL>')
ORDER BY total DESC;

SELECT 'alumnos_nucleos_estatus_profile' AS check_name, COALESCE(estatus, '<NULL>') AS value, COUNT(*) AS total
FROM public.alumnos_nucleos
GROUP BY COALESCE(estatus, '<NULL>')
ORDER BY total DESC;

SELECT 'clases_particulares_estado_profile' AS check_name, COALESCE(estado, '<NULL>') AS value, COUNT(*) AS total
FROM public.clases_particulares
GROUP BY COALESCE(estado, '<NULL>')
ORDER BY total DESC;

-- =========================================================
-- 7) Consolidated output (single result set for Supabase SQL Editor)
-- =========================================================
SELECT jsonb_build_object(
  'duplicated_fk_semantics',
  COALESCE((
    SELECT jsonb_agg(to_jsonb(x))
    FROM (
      WITH fk_defs AS (
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type = 'FOREIGN KEY'
      )
      SELECT
        table_name,
        column_name,
        referenced_table,
        referenced_column,
        COUNT(*) AS fk_count,
        STRING_AGG(constraint_name, ', ' ORDER BY constraint_name) AS constraints
      FROM fk_defs
      GROUP BY table_name, column_name, referenced_table, referenced_column
      HAVING COUNT(*) > 1
      ORDER BY table_name, column_name
    ) x
  ), '[]'::jsonb),

  'fk_without_index',
  COALESCE((
    SELECT jsonb_agg(to_jsonb(x))
    FROM (
      WITH fk_cols AS (
        SELECT
          rel.relname AS table_name,
          att.attname AS column_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN unnest(con.conkey) AS col(attnum) ON true
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = col.attnum
        WHERE con.contype = 'f'
          AND nsp.nspname = 'public'
          AND rel.relname IN (
            'alumnos',
            'alumnos_extra_catedra',
            'alumnos_nucleos',
            'alumnos_virtuales',
            'aportes_capital',
            'categorias_egreso',
            'categorias_producto',
            'clases_particulares',
            'clientes_particulares'
          )
      ),
      idx_cov AS (
        SELECT DISTINCT
          rel.relname AS table_name,
          att.attname AS column_name
        FROM pg_index idx
        JOIN pg_class rel ON rel.oid = idx.indrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN unnest(idx.indkey) AS ik(attnum) ON true
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ik.attnum
        WHERE nsp.nspname = 'public'
      )
      SELECT
        fk.table_name,
        fk.column_name
      FROM fk_cols fk
      LEFT JOIN idx_cov ix
        ON ix.table_name = fk.table_name
       AND ix.column_name = fk.column_name
      WHERE ix.column_name IS NULL
      ORDER BY fk.table_name, fk.column_name
    ) x
  ), '[]'::jsonb),

  'orphan_counts',
  COALESCE((
    SELECT jsonb_agg(to_jsonb(x))
    FROM (
      SELECT
        source_table,
        source_column,
        target_table,
        target_column,
        orphan_count
      FROM _v9_orphan_results
      ORDER BY source_table, source_column
    ) x
  ), '[]'::jsonb),

  'status_profiles',
  jsonb_build_object(
    'alumnos_estado_profile', COALESCE((
      SELECT jsonb_agg(to_jsonb(x))
      FROM (
        SELECT COALESCE(estado, '<NULL>') AS value, COUNT(*) AS total
        FROM public.alumnos
        GROUP BY COALESCE(estado, '<NULL>')
        ORDER BY total DESC
      ) x
    ), '[]'::jsonb),
    'alumnos_extra_catedra_estatus_profile', COALESCE((
      SELECT jsonb_agg(to_jsonb(x))
      FROM (
        SELECT COALESCE(estatus, '<NULL>') AS value, COUNT(*) AS total
        FROM public.alumnos_extra_catedra
        GROUP BY COALESCE(estatus, '<NULL>')
        ORDER BY total DESC
      ) x
    ), '[]'::jsonb),
    'alumnos_nucleos_estatus_profile', COALESCE((
      SELECT jsonb_agg(to_jsonb(x))
      FROM (
        SELECT COALESCE(estatus, '<NULL>') AS value, COUNT(*) AS total
        FROM public.alumnos_nucleos
        GROUP BY COALESCE(estatus, '<NULL>')
        ORDER BY total DESC
      ) x
    ), '[]'::jsonb),
    'clases_particulares_estado_profile', COALESCE((
      SELECT jsonb_agg(to_jsonb(x))
      FROM (
        SELECT COALESCE(estado, '<NULL>') AS value, COUNT(*) AS total
        FROM public.clases_particulares
        GROUP BY COALESCE(estado, '<NULL>')
        ORDER BY total DESC
      ) x
    ), '[]'::jsonb)
  )
) AS precheck_report;

-- Keep script strictly diagnostic (no persistent writes)
ROLLBACK;
