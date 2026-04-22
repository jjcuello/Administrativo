-- Migration v57 generated: 2026-04-22
-- Goal: ensure user Gabriela has only role_code = 'horario'.

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
  v_matches integer;
BEGIN
  SELECT COUNT(*)
  INTO v_matches
  FROM auth.users
  WHERE lower(email) = lower('Gabacademia11@gmail.com')
     OR lower(email) LIKE '%gabriela%';

  IF v_matches = 0 THEN
    RAISE EXCEPTION 'No se encontro usuario Gabriela por email. Ajusta la migracion v57 con el correo exacto.';
  ELSIF v_matches > 1 THEN
    RAISE EXCEPTION 'Se encontraron % usuarios potenciales para Gabriela. Ajusta la migracion v57 con correo exacto para evitar asignacion incorrecta.', v_matches;
  END IF;

  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('Gabacademia11@gmail.com')
     OR lower(email) LIKE '%gabriela%'
  LIMIT 1;

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
