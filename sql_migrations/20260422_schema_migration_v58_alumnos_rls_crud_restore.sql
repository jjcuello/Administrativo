-- Migration v58 generated: 2026-04-22
-- Goal: restore alumnos CRUD under RLS for authenticated users after hardening removed permissive policy.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.alumnos') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alumnos TO authenticated;

    DROP POLICY IF EXISTS alumnos_insert_authenticated ON public.alumnos;
    CREATE POLICY alumnos_insert_authenticated
      ON public.alumnos
      FOR INSERT
      TO authenticated
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS alumnos_update_authenticated ON public.alumnos;
    CREATE POLICY alumnos_update_authenticated
      ON public.alumnos
      FOR UPDATE
      TO authenticated
      USING (deleted_at IS NULL)
      WITH CHECK (deleted_at IS NULL);

    DROP POLICY IF EXISTS alumnos_delete_authenticated ON public.alumnos;
    CREATE POLICY alumnos_delete_authenticated
      ON public.alumnos
      FOR DELETE
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

COMMIT;
