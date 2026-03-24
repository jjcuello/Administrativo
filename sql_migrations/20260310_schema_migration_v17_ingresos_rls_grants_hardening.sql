-- Migration v17 generated: 2026-03-10
-- Goal: harden metadata read access for ingresos under RLS (policies + grants)
-- Status: superseded for fresh setups by 20260310_schema_migration_v18_ingresos_setup_all_in_one.sql
-- Note: keep this file only for historical incremental rollout sequences.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.categorias_ingreso') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.categorias_ingreso TO authenticated;

    DROP POLICY IF EXISTS categorias_ingreso_select_authenticated ON public.categorias_ingreso;
    CREATE POLICY categorias_ingreso_select_authenticated
      ON public.categorias_ingreso
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.cuentas_financieras') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.cuentas_financieras TO authenticated;

    DROP POLICY IF EXISTS cuentas_financieras_select_authenticated ON public.cuentas_financieras;
    CREATE POLICY cuentas_financieras_select_authenticated
      ON public.cuentas_financieras
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.alumnos') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.alumnos TO authenticated;

    DROP POLICY IF EXISTS alumnos_select_authenticated ON public.alumnos;
    CREATE POLICY alumnos_select_authenticated
      ON public.alumnos
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

COMMIT;
