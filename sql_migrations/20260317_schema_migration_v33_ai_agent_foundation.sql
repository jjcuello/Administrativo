-- Migration v33: foundation del agente híbrido (conversaciones + auditoría)
-- Fecha: 2026-03-17

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  provider_mode text NOT NULL DEFAULT 'hybrid' CHECK (provider_mode IN ('gemini', 'local', 'hybrid')),
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.app_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.app_ai_conversations(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_ai_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.app_ai_messages(id) ON UPDATE CASCADE ON DELETE CASCADE,
  tool_name text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary text,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_ai_conversations_user_created
  ON public.app_ai_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_ai_messages_conversation_created
  ON public.app_ai_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_app_ai_tool_calls_message_created
  ON public.app_ai_tool_calls(message_id, created_at ASC);

ALTER TABLE public.app_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_tool_calls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_ai_conversations'
      AND policyname = 'app_ai_conversations_select_own'
  ) THEN
    CREATE POLICY app_ai_conversations_select_own
      ON public.app_ai_conversations
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id AND deleted_at IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_ai_conversations'
      AND policyname = 'app_ai_conversations_insert_own'
  ) THEN
    CREATE POLICY app_ai_conversations_insert_own
      ON public.app_ai_conversations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_ai_conversations'
      AND policyname = 'app_ai_conversations_update_own'
  ) THEN
    CREATE POLICY app_ai_conversations_update_own
      ON public.app_ai_conversations
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_ai_messages'
      AND policyname = 'app_ai_messages_select_by_own_conversation'
  ) THEN
    CREATE POLICY app_ai_messages_select_by_own_conversation
      ON public.app_ai_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.app_ai_conversations c
          WHERE c.id = app_ai_messages.conversation_id
            AND c.user_id = auth.uid()
            AND c.deleted_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_ai_messages'
      AND policyname = 'app_ai_messages_insert_by_own_conversation'
  ) THEN
    CREATE POLICY app_ai_messages_insert_by_own_conversation
      ON public.app_ai_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.app_ai_conversations c
          WHERE c.id = app_ai_messages.conversation_id
            AND c.user_id = auth.uid()
            AND c.deleted_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_ai_tool_calls'
      AND policyname = 'app_ai_tool_calls_select_by_own_conversation'
  ) THEN
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
            AND c.user_id = auth.uid()
            AND c.deleted_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_ai_tool_calls'
      AND policyname = 'app_ai_tool_calls_insert_by_own_conversation'
  ) THEN
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
            AND c.user_id = auth.uid()
            AND c.deleted_at IS NULL
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.app_ai_conversations TO authenticated;
GRANT SELECT, INSERT ON public.app_ai_messages TO authenticated;
GRANT SELECT, INSERT ON public.app_ai_tool_calls TO authenticated;

COMMIT;
