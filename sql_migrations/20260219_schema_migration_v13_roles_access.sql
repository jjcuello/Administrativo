-- Migration v13 generated: 2026-02-19
-- Goal: define base access model (roles + user_roles) for auth MVP

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.roles (
  code text PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.roles (code, nombre, descripcion)
VALUES
  ('admin', 'Administrador', 'Acceso completo al sistema'),
  ('operativo', 'Operativo', 'Ejecución operativa diaria'),
  ('consulta', 'Consulta', 'Solo lectura')
ON CONFLICT (code) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role_code text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.user_roles
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.user_roles SET created_at = now() WHERE created_at IS NULL;
UPDATE public.user_roles SET updated_at = now() WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_role_code_fkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_role_code_fkey
      FOREIGN KEY (role_code)
      REFERENCES public.roles(code)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_fkey'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_user_roles_user_id_active
  ON public.user_roles(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_role_code ON public.user_roles(role_code);
CREATE INDEX IF NOT EXISTS idx_user_roles_deleted_at ON public.user_roles(deleted_at);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'roles_select_authenticated'
  ) THEN
    CREATE POLICY roles_select_authenticated
      ON public.roles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'user_roles_select_own'
  ) THEN
    CREATE POLICY user_roles_select_own
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id AND deleted_at IS NULL);
  END IF;
END $$;

COMMIT;
