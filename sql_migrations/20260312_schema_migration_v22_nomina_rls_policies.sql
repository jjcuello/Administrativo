-- Migration v22 generated: 2026-03-12
-- Goal: unblock Nómina mensual writes under RLS for authenticated users
-- Fixes error: new row violates row-level security policy for table "nominas_mensuales"

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE public.nominas_mensuales TO authenticated;

    DROP POLICY IF EXISTS nominas_mensuales_select_authenticated ON public.nominas_mensuales;
    CREATE POLICY nominas_mensuales_select_authenticated
      ON public.nominas_mensuales
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);

    DROP POLICY IF EXISTS nominas_mensuales_insert_authenticated ON public.nominas_mensuales;
    CREATE POLICY nominas_mensuales_insert_authenticated
      ON public.nominas_mensuales
      FOR INSERT
      TO authenticated
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS nominas_mensuales_update_authenticated ON public.nominas_mensuales;
    CREATE POLICY nominas_mensuales_update_authenticated
      ON public.nominas_mensuales
      FOR UPDATE
      TO authenticated
      USING (deleted_at IS NULL)
      WITH CHECK (deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales_detalle') IS NOT NULL THEN
    GRANT SELECT, INSERT, DELETE ON TABLE public.nominas_mensuales_detalle TO authenticated;

    DROP POLICY IF EXISTS nominas_mensuales_detalle_select_authenticated ON public.nominas_mensuales_detalle;
    CREATE POLICY nominas_mensuales_detalle_select_authenticated
      ON public.nominas_mensuales_detalle
      FOR SELECT
      TO authenticated
      USING (TRUE);

    DROP POLICY IF EXISTS nominas_mensuales_detalle_insert_authenticated ON public.nominas_mensuales_detalle;
    CREATE POLICY nominas_mensuales_detalle_insert_authenticated
      ON public.nominas_mensuales_detalle
      FOR INSERT
      TO authenticated
      WITH CHECK (TRUE);

    DROP POLICY IF EXISTS nominas_mensuales_detalle_delete_authenticated ON public.nominas_mensuales_detalle;
    CREATE POLICY nominas_mensuales_detalle_delete_authenticated
      ON public.nominas_mensuales_detalle
      FOR DELETE
      TO authenticated
      USING (TRUE);
  END IF;
END $$;

COMMIT;
