-- Migration v16 generated: 2026-03-10
-- Goal: unblock ingresos metadata reads when RLS is enabled
-- Status: superseded for fresh setups by 20260310_schema_migration_v18_ingresos_setup_all_in_one.sql
-- Note: keep this file only for historical incremental rollout sequences.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.categorias_ingreso') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'categorias_ingreso'
        AND policyname = 'categorias_ingreso_select_authenticated'
    ) THEN
    CREATE POLICY categorias_ingreso_select_authenticated
      ON public.categorias_ingreso
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.cuentas_financieras') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'cuentas_financieras'
        AND policyname = 'cuentas_financieras_select_authenticated'
    ) THEN
    CREATE POLICY cuentas_financieras_select_authenticated
      ON public.cuentas_financieras
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.alumnos') IS NOT NULL
     AND NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'alumnos'
        AND policyname = 'alumnos_select_authenticated'
    ) THEN
    CREATE POLICY alumnos_select_authenticated
      ON public.alumnos
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

COMMIT;
