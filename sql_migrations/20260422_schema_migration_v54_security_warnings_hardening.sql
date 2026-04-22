-- Migration v54 generated: 2026-04-22
-- Goal: reduce Security Advisor warnings after v53.
-- Covers:
--   - function_search_path_mutable
--   - rls_policy_always_true
--   - public_bucket_allows_listing
-- Note:
--   - auth_leaked_password_protection must be enabled in Supabase Auth settings (dashboard).

BEGIN;

-- 1) function_search_path_mutable ------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS regproc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'periodo_escolar_inicio_fecha',
        'periodo_escolar_fin_fecha',
        'periodo_escolar_codigo',
        'set_updated_at',
        'is_valid_email',
        'ensure_periodo_escolar',
        'assign_periodo_escolar_en_transacciones',
        'assign_periodo_escolar_egresos_por_fecha_pago'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.regproc);
  END LOOP;
END $$;

-- 2) rls_policy_always_true -------------------------------------------------
-- Tighten INSERT/UPDATE/DELETE policies created in v53 so expressions are not TRUE.
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
    'ventas',
    'personal_colegios',
    'nominas_mensuales_detalle'
  ];
  v_has_deleted_at boolean;
  v_using_clause text;
  v_with_check_clause text;
  p_insert text;
  p_update text;
  p_delete text;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND column_name = 'deleted_at'
    )
    INTO v_has_deleted_at;

    v_using_clause := '((select auth.role()) = ''authenticated'')';
    v_with_check_clause := '((select auth.role()) = ''authenticated'')';

    IF v_has_deleted_at THEN
      v_using_clause := v_using_clause || ' AND deleted_at IS NULL';
      v_with_check_clause := v_with_check_clause || ' AND deleted_at IS NULL';
    END IF;

    p_insert := v_table || '_insert_authenticated';
    p_update := v_table || '_update_authenticated';
    p_delete := v_table || '_delete_authenticated';

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

-- Replace legacy permissive ALL policies flagged by linter.
DO $$
BEGIN
  IF to_regclass('public.clases_particulares') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Permitir todo en clases_particulares" ON public.clases_particulares;
    CREATE POLICY "Permitir todo en clases_particulares"
      ON public.clases_particulares
      FOR ALL
      TO authenticated
      USING ((select auth.role()) = 'authenticated')
      WITH CHECK ((select auth.role()) = 'authenticated');
  END IF;

  IF to_regclass('public.grupos_tardes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Permitir todo en grupos_tardes" ON public.grupos_tardes;
    CREATE POLICY "Permitir todo en grupos_tardes"
      ON public.grupos_tardes
      FOR ALL
      TO authenticated
      USING ((select auth.role()) = 'authenticated')
      WITH CHECK ((select auth.role()) = 'authenticated');
  END IF;

  IF to_regclass('public.inscripciones') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Permitir todo en inscripciones" ON public.inscripciones;
    CREATE POLICY "Permitir todo en inscripciones"
      ON public.inscripciones
      FOR ALL
      TO authenticated
      USING ((select auth.role()) = 'authenticated')
      WITH CHECK ((select auth.role()) = 'authenticated');
  END IF;

  IF to_regclass('public.representantes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Permitir todo en representantes" ON public.representantes;
    CREATE POLICY "Permitir todo en representantes"
      ON public.representantes
      FOR ALL
      TO authenticated
      USING ((select auth.role()) = 'authenticated')
      WITH CHECK ((select auth.role()) = 'authenticated');
  END IF;
END $$;

-- 3) public_bucket_allows_listing ------------------------------------------
-- Restrict listing for public bucket personal-documentos to object owner only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'personal_documentos_select_authenticated'
  ) THEN
    DROP POLICY personal_documentos_select_authenticated ON storage.objects;
  END IF;

  CREATE POLICY personal_documentos_select_authenticated
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'personal-documentos'
      AND owner = (select auth.uid())
    );
END $$;

COMMIT;
