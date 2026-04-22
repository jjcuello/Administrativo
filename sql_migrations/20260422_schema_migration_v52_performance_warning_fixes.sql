-- Migration v52 generated: 2026-04-22
-- Goal: resolve Supabase Performance Advisor warnings (auth_rls_initplan,
--       multiple_permissive_policies, duplicate_index).

BEGIN;

-- 1) auth_rls_initplan ------------------------------------------------------
-- Replace auth.* calls in RLS with (select auth.*()) to avoid per-row re-eval.

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
    CREATE POLICY user_roles_select_own
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id AND deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.app_user_activity_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS app_activity_select_authenticated ON public.app_user_activity_logs;
    CREATE POLICY app_activity_select_authenticated
      ON public.app_user_activity_logs
      FOR SELECT
      TO authenticated
      USING ((select auth.role()) = 'authenticated');

    DROP POLICY IF EXISTS app_activity_insert_own_user ON public.app_user_activity_logs;
    CREATE POLICY app_activity_insert_own_user
      ON public.app_user_activity_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        (select auth.role()) = 'authenticated'
        AND (select auth.uid()) = user_id
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.app_ai_conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS app_ai_conversations_select_own ON public.app_ai_conversations;
    CREATE POLICY app_ai_conversations_select_own
      ON public.app_ai_conversations
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id AND deleted_at IS NULL);

    DROP POLICY IF EXISTS app_ai_conversations_insert_own ON public.app_ai_conversations;
    CREATE POLICY app_ai_conversations_insert_own
      ON public.app_ai_conversations
      FOR INSERT
      TO authenticated
      WITH CHECK ((select auth.uid()) = user_id);

    DROP POLICY IF EXISTS app_ai_conversations_update_own ON public.app_ai_conversations;
    CREATE POLICY app_ai_conversations_update_own
      ON public.app_ai_conversations
      FOR UPDATE
      TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.app_ai_messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS app_ai_messages_select_by_own_conversation ON public.app_ai_messages;
    CREATE POLICY app_ai_messages_select_by_own_conversation
      ON public.app_ai_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.app_ai_conversations c
          WHERE c.id = app_ai_messages.conversation_id
            AND c.user_id = (select auth.uid())
            AND c.deleted_at IS NULL
        )
      );

    DROP POLICY IF EXISTS app_ai_messages_insert_by_own_conversation ON public.app_ai_messages;
    CREATE POLICY app_ai_messages_insert_by_own_conversation
      ON public.app_ai_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.app_ai_conversations c
          WHERE c.id = app_ai_messages.conversation_id
            AND c.user_id = (select auth.uid())
            AND c.deleted_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.app_ai_tool_calls') IS NOT NULL THEN
    DROP POLICY IF EXISTS app_ai_tool_calls_select_by_own_conversation ON public.app_ai_tool_calls;
    CREATE POLICY app_ai_tool_calls_select_by_own_conversation
      ON public.app_ai_tool_calls
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.app_ai_messages m
          JOIN public.app_ai_conversations c ON c.id = m.conversation_id
          WHERE m.id = app_ai_tool_calls.message_id
            AND c.user_id = (select auth.uid())
            AND c.deleted_at IS NULL
        )
      );

    DROP POLICY IF EXISTS app_ai_tool_calls_insert_by_own_conversation ON public.app_ai_tool_calls;
    CREATE POLICY app_ai_tool_calls_insert_by_own_conversation
      ON public.app_ai_tool_calls
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.app_ai_messages m
          JOIN public.app_ai_conversations c ON c.id = m.conversation_id
          WHERE m.id = app_ai_tool_calls.message_id
            AND c.user_id = (select auth.uid())
            AND c.deleted_at IS NULL
        )
      );
  END IF;
END $$;

-- 2) multiple_permissive_policies ------------------------------------------
-- Keep canonical alumnos SELECT policy and remove broad duplicate permissive one.
DO $$
BEGIN
  IF to_regclass('public.alumnos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Permitir todo en alumnos" ON public.alumnos;

    IF NOT EXISTS (
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
  END IF;
END $$;

-- 3) duplicate_index --------------------------------------------------------
-- alumnos_virtuales: keep idx_alumnos_virtuales_email_lower_v4, drop legacy duplicate.
DROP INDEX IF EXISTS public.idx_alumnos_virtuales_email_lower;

-- personal_colegios: keep unique-constraint backed index, drop duplicate standalone one.
DROP INDEX IF EXISTS public.uidx_personal_colegios_personal_colegio;

COMMIT;
