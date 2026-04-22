-- Migration v51 generated: 2026-04-22
-- Goal: close Supabase critical issue rls_disabled_in_public for core business tables.
-- Strategy:
--   1) Enable RLS on exposed public tables.
--   2) Remove anon access.
--   3) Ensure authenticated policies exist to preserve app operation.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;

-- proveedores ---------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.proveedores') IS NOT NULL THEN
    ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.proveedores FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.proveedores TO authenticated;

    DROP POLICY IF EXISTS proveedores_select_authenticated ON public.proveedores;
    CREATE POLICY proveedores_select_authenticated
      ON public.proveedores
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);

    DROP POLICY IF EXISTS proveedores_insert_authenticated ON public.proveedores;
    CREATE POLICY proveedores_insert_authenticated
      ON public.proveedores
      FOR INSERT
      TO authenticated
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS proveedores_update_authenticated ON public.proveedores;
    CREATE POLICY proveedores_update_authenticated
      ON public.proveedores
      FOR UPDATE
      TO authenticated
      USING (deleted_at IS NULL)
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS proveedores_delete_authenticated ON public.proveedores;
    CREATE POLICY proveedores_delete_authenticated
      ON public.proveedores
      FOR DELETE
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- categorias_ingreso -------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.categorias_ingreso') IS NOT NULL THEN
    ALTER TABLE public.categorias_ingreso ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.categorias_ingreso FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categorias_ingreso TO authenticated;

    DROP POLICY IF EXISTS categorias_ingreso_select_authenticated ON public.categorias_ingreso;
    CREATE POLICY categorias_ingreso_select_authenticated
      ON public.categorias_ingreso
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);

    DROP POLICY IF EXISTS categorias_ingreso_insert_authenticated ON public.categorias_ingreso;
    CREATE POLICY categorias_ingreso_insert_authenticated
      ON public.categorias_ingreso
      FOR INSERT
      TO authenticated
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS categorias_ingreso_update_authenticated ON public.categorias_ingreso;
    CREATE POLICY categorias_ingreso_update_authenticated
      ON public.categorias_ingreso
      FOR UPDATE
      TO authenticated
      USING (deleted_at IS NULL)
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS categorias_ingreso_delete_authenticated ON public.categorias_ingreso;
    CREATE POLICY categorias_ingreso_delete_authenticated
      ON public.categorias_ingreso
      FOR DELETE
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- ingresos -----------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ingresos') IS NOT NULL THEN
    ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.ingresos FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ingresos TO authenticated;

    DROP POLICY IF EXISTS ingresos_select_authenticated ON public.ingresos;
    CREATE POLICY ingresos_select_authenticated
      ON public.ingresos
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);

    DROP POLICY IF EXISTS ingresos_insert_authenticated ON public.ingresos;
    CREATE POLICY ingresos_insert_authenticated
      ON public.ingresos
      FOR INSERT
      TO authenticated
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS ingresos_update_authenticated ON public.ingresos;
    CREATE POLICY ingresos_update_authenticated
      ON public.ingresos
      FOR UPDATE
      TO authenticated
      USING (deleted_at IS NULL)
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS ingresos_delete_authenticated ON public.ingresos;
    CREATE POLICY ingresos_delete_authenticated
      ON public.ingresos
      FOR DELETE
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- periodos_escolares -------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.periodos_escolares') IS NOT NULL THEN
    ALTER TABLE public.periodos_escolares ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.periodos_escolares FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.periodos_escolares TO authenticated;

    DROP POLICY IF EXISTS periodos_escolares_select_authenticated ON public.periodos_escolares;
    CREATE POLICY periodos_escolares_select_authenticated
      ON public.periodos_escolares
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL);

    DROP POLICY IF EXISTS periodos_escolares_insert_authenticated ON public.periodos_escolares;
    CREATE POLICY periodos_escolares_insert_authenticated
      ON public.periodos_escolares
      FOR INSERT
      TO authenticated
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS periodos_escolares_update_authenticated ON public.periodos_escolares;
    CREATE POLICY periodos_escolares_update_authenticated
      ON public.periodos_escolares
      FOR UPDATE
      TO authenticated
      USING (deleted_at IS NULL)
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS periodos_escolares_delete_authenticated ON public.periodos_escolares;
    CREATE POLICY periodos_escolares_delete_authenticated
      ON public.periodos_escolares
      FOR DELETE
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- nominas_mensuales --------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales') IS NOT NULL THEN
    ALTER TABLE public.nominas_mensuales ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.nominas_mensuales FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nominas_mensuales TO authenticated;

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

    DROP POLICY IF EXISTS nominas_mensuales_delete_authenticated ON public.nominas_mensuales;
    CREATE POLICY nominas_mensuales_delete_authenticated
      ON public.nominas_mensuales
      FOR DELETE
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

-- nominas_mensuales_detalle ------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales_detalle') IS NOT NULL THEN
    ALTER TABLE public.nominas_mensuales_detalle ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.nominas_mensuales_detalle FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nominas_mensuales_detalle TO authenticated;

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

    DROP POLICY IF EXISTS nominas_mensuales_detalle_update_authenticated ON public.nominas_mensuales_detalle;
    CREATE POLICY nominas_mensuales_detalle_update_authenticated
      ON public.nominas_mensuales_detalle
      FOR UPDATE
      TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);

    DROP POLICY IF EXISTS nominas_mensuales_detalle_delete_authenticated ON public.nominas_mensuales_detalle;
    CREATE POLICY nominas_mensuales_detalle_delete_authenticated
      ON public.nominas_mensuales_detalle
      FOR DELETE
      TO authenticated
      USING (TRUE);
  END IF;
END $$;

-- personal_colegios --------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.personal_colegios') IS NOT NULL THEN
    ALTER TABLE public.personal_colegios ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.personal_colegios FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personal_colegios TO authenticated;

    DROP POLICY IF EXISTS personal_colegios_select_authenticated ON public.personal_colegios;
    CREATE POLICY personal_colegios_select_authenticated
      ON public.personal_colegios
      FOR SELECT
      TO authenticated
      USING (TRUE);

    DROP POLICY IF EXISTS personal_colegios_insert_authenticated ON public.personal_colegios;
    CREATE POLICY personal_colegios_insert_authenticated
      ON public.personal_colegios
      FOR INSERT
      TO authenticated
      WITH CHECK (TRUE);

    DROP POLICY IF EXISTS personal_colegios_update_authenticated ON public.personal_colegios;
    CREATE POLICY personal_colegios_update_authenticated
      ON public.personal_colegios
      FOR UPDATE
      TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);

    DROP POLICY IF EXISTS personal_colegios_delete_authenticated ON public.personal_colegios;
    CREATE POLICY personal_colegios_delete_authenticated
      ON public.personal_colegios
      FOR DELETE
      TO authenticated
      USING (TRUE);
  END IF;
END $$;

COMMIT;
