-- Migration v56 generated: 2026-04-22
-- Goal: grant a user access only to Horario module via role_code = 'horario'.

BEGIN;

INSERT INTO public.roles (code, nombre, descripcion)
VALUES ('horario', 'Horario', 'Acceso exclusivo al modulo Horario (tardes).')
ON CONFLICT (code) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('Gabacademia11@gmail.com')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro usuario auth.users con email %', 'Gabacademia11@gmail.com';
  END IF;

  -- Desactivar cualquier rol activo previo para mantener un solo perfil efectivo.
  UPDATE public.user_roles
  SET deleted_at = now(),
      updated_at = now()
  WHERE user_id = v_user_id
    AND deleted_at IS NULL
    AND role_code <> 'horario';

  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_user_id
      AND role_code = 'horario'
      AND deleted_at IS NULL
  ) THEN
    UPDATE public.user_roles
    SET updated_at = now()
    WHERE user_id = v_user_id
      AND role_code = 'horario'
      AND deleted_at IS NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role_code, created_at, updated_at, created_by, deleted_at)
    VALUES (v_user_id, 'horario', now(), now(), v_user_id, NULL);
  END IF;
END $$;

COMMIT;
