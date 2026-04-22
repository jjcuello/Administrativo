-- Migration v48 generated: 2026-04-01
-- Goal: habilitar borrado total (DELETE físico) en ingresos bajo RLS para usuarios autenticados.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.ingresos') IS NOT NULL THEN
    -- Asegura permiso DELETE para el rol authenticated.
    GRANT DELETE ON TABLE public.ingresos TO authenticated;

    -- Política DELETE para filas activas (no soft-deleted).
    DROP POLICY IF EXISTS ingresos_delete_authenticated ON public.ingresos;
    CREATE POLICY ingresos_delete_authenticated
      ON public.ingresos
      FOR DELETE
      TO authenticated
      USING (deleted_at IS NULL);
  END IF;
END $$;

COMMIT;
