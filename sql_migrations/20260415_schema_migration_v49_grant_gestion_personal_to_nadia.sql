-- Migration v49 generated: 2026-04-15
-- Goal: assign role gestion_personal to Nadia so she can access and edit Nomina.
-- IMPORTANT: replace the placeholder email before running this migration.

BEGIN;

DO $$
DECLARE
  v_email text := 'nadiacarrilloana@gmail.com';
  v_user_id uuid;
BEGIN
  IF v_email = 'nadia@reemplazar.com' THEN
    RAISE EXCEPTION 'Set v_email to Nadia''s real email before running migration v49.';
  END IF;

  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users record found for email: %', v_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role_code, created_at, updated_at, deleted_at)
  VALUES (v_user_id, 'gestion_personal', now(), now(), NULL)
  ON CONFLICT (user_id) WHERE deleted_at IS NULL
  DO UPDATE
  SET
    role_code = EXCLUDED.role_code,
    deleted_at = NULL,
    updated_at = now();
END $$;

COMMIT;