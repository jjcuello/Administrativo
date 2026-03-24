-- Migration v26 generated: 2026-03-16
-- Goal: limpiar data ficticia para piloto de septiembre 2025
-- IMPORTANT:
--   1) Preserva acceso de usuarios y catálogos base
--      (NO toca auth.users, public.roles, public.user_roles,
--       public.periodos_escolares, public.categorias_ingreso,
--       public.categorias_egreso, public.categorias_producto).
--   2) Limpia tablas de negocio en esquema public usando TRUNCATE ... CASCADE.
--   3) Incluye safety gate; este script auto-configura el flag de confirmación.
--
-- How to run (same session):
--   (Se configura automáticamente dentro de este script)
--   \i sql_migrations/20260316_schema_migration_v26_pilot_cleanup_fictitious_data.sql

SELECT set_config('app.pilot_cleanup_confirm', 'YES', false);

BEGIN;

DO $$
DECLARE
  confirm_flag text := current_setting('app.pilot_cleanup_confirm', true);
BEGIN
  IF coalesce(confirm_flag, '') <> 'YES' THEN
    RAISE EXCEPTION
      'Safety stop: set app.pilot_cleanup_confirm=YES in this session before executing this migration.';
  END IF;
END $$;

CREATE TEMP TABLE IF NOT EXISTS tmp_pilot_cleanup_counts (
  table_name text PRIMARY KEY,
  row_count_before bigint,
  row_count_after bigint
) ON COMMIT DROP;

CREATE TEMP TABLE IF NOT EXISTS tmp_pilot_preserved_counts (
  table_name text PRIMARY KEY,
  row_count bigint
) ON COMMIT DROP;

DO $$
DECLARE
  preserve_tables constant text[] := ARRAY[
    'roles',
    'user_roles',
    'periodos_escolares',
    'categorias_ingreso',
    'categorias_egreso',
    'categorias_producto'
  ];
  table_rec record;
  truncate_targets text[] := ARRAY[]::text[];
  sql_truncate text;
  count_before bigint;
  count_after bigint;
BEGIN
  FOR table_rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> ALL (preserve_tables)
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_rec.tablename)
      INTO count_before;

    INSERT INTO tmp_pilot_cleanup_counts (table_name, row_count_before, row_count_after)
    VALUES (table_rec.tablename, count_before, NULL)
    ON CONFLICT (table_name) DO UPDATE
      SET row_count_before = EXCLUDED.row_count_before,
          row_count_after = NULL;

    truncate_targets := array_append(truncate_targets, format('public.%I', table_rec.tablename));
  END LOOP;

  IF array_length(truncate_targets, 1) IS NULL THEN
    RAISE NOTICE 'No public tables to clean (excluding preserved tables).';
  ELSE
    sql_truncate := 'TRUNCATE TABLE ' || array_to_string(truncate_targets, ', ') || ' RESTART IDENTITY CASCADE';
    EXECUTE sql_truncate;
  END IF;

  FOR table_rec IN
    SELECT table_name
    FROM tmp_pilot_cleanup_counts
    ORDER BY table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_rec.table_name)
      INTO count_after;

    UPDATE tmp_pilot_cleanup_counts
      SET row_count_after = count_after
    WHERE table_name = table_rec.table_name;
  END LOOP;

  FOR table_rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY (preserve_tables)
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_rec.tablename)
      INTO count_after;

    INSERT INTO tmp_pilot_preserved_counts (table_name, row_count)
    VALUES (table_rec.tablename, count_after)
    ON CONFLICT (table_name) DO UPDATE
      SET row_count = EXCLUDED.row_count;
  END LOOP;
END $$;

-- Cleanup summary (before/after)
SELECT
  table_name,
  row_count_before,
  row_count_after
FROM tmp_pilot_cleanup_counts
ORDER BY row_count_before DESC, table_name;

-- Preserved tables summary
SELECT table_name, row_count AS current_rows
FROM tmp_pilot_preserved_counts
ORDER BY table_name;

COMMIT;
