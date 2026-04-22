-- Migration v53 generated: 2026-04-22
-- Goal: resolve Security Advisor errors after v52:
--   - policy_exists_rls_disabled (cuentas_financieras)
--   - security_definer_view (2 views)
--   - rls_disabled_in_public (batch of public tables)

BEGIN;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'transacciones',
    'alumnos_nucleos',
    'inscripciones_eventos',
    'pagos_nucleos',
    'alumnos_virtuales',
    'personal',
    'eventos',
    'egresos',
    'aportes_capital',
    'categorias_egreso',
    'categorias_producto',
    'clubes',
    'alumnos_extra_catedra',
    'colegios',
    'contratos',
    'cuentas_financieras',
    'clientes_particulares',
    'donaciones',
    'donantes',
    'nominas_pendientes',
    'nucleos',
    'paquetes_particulares',
    'paquetes_virtuales',
    'personal_administrativo',
    'plan_pagos_alumno',
    'prestamos',
    'servicios',
    'socios',
    'ventas'
  ];
  v_has_deleted_at boolean;
  v_using_clause text;
  v_with_check_clause text;
  p_select text;
  p_insert text;
  p_update text;
  p_delete text;
BEGIN
  GRANT USAGE ON SCHEMA public TO authenticated;

  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE NOTICE 'Table public.% does not exist, skipping.', v_table;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', v_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', v_table);

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'deleted_at'
    )
    INTO v_has_deleted_at;

    IF v_has_deleted_at THEN
      v_using_clause := 'deleted_at IS NULL';
      v_with_check_clause := 'deleted_at IS NULL';
    ELSE
      v_using_clause := 'TRUE';
      v_with_check_clause := 'TRUE';
    END IF;

    p_select := v_table || '_select_authenticated';
    p_insert := v_table || '_insert_authenticated';
    p_update := v_table || '_update_authenticated';
    p_delete := v_table || '_delete_authenticated';

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_select, v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      p_select,
      v_table,
      v_using_clause
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_insert, v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
      p_insert,
      v_table,
      v_with_check_clause
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_update, v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      p_update,
      v_table,
      v_using_clause,
      v_with_check_clause
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_delete, v_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
      p_delete,
      v_table,
      v_using_clause
    );
  END LOOP;
END $$;

-- Fix SECURITY DEFINER views by switching to invoker context.
DO $$
BEGIN
  IF to_regclass('public.vista_resumen_utilidades') IS NOT NULL THEN
    ALTER VIEW public.vista_resumen_utilidades SET (security_invoker = true);
  END IF;

  IF to_regclass('public.v_clases_particulares_catalogo') IS NOT NULL THEN
    ALTER VIEW public.v_clases_particulares_catalogo SET (security_invoker = true);
  END IF;
END $$;

COMMIT;
