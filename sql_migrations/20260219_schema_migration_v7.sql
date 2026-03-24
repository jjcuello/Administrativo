-- Migration v7 generated: 2026-02-19
-- Goal: remove legacy columns from inscripciones and prevent schema drift

BEGIN;

DO $$
DECLARE
  legacy_col text;
  con_rec record;
  idx_rec record;
BEGIN
  FOR legacy_col IN
    SELECT unnest(ARRAY[
      'grupo_tarde_id',
      'grupos_tardes_id',
      'clase_particular_id',
      'clases_particulares_id'
    ])
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'inscripciones'
        AND column_name = legacy_col
    ) THEN
      -- Drop constraints that reference the legacy column
      FOR con_rec IN
        SELECT DISTINCT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        JOIN unnest(con.conkey) AS ck(attnum) ON true
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ck.attnum
        WHERE ns.nspname = 'public'
          AND rel.relname = 'inscripciones'
          AND att.attname = legacy_col
      LOOP
        EXECUTE format('ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS %I', con_rec.conname);
      END LOOP;

      -- Drop indexes that include the legacy column
      FOR idx_rec IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'inscripciones'
          AND indexdef ILIKE '%' || legacy_col || '%'
      LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', idx_rec.indexname);
      END LOOP;

      -- Drop the legacy column itself
      EXECUTE format('ALTER TABLE public.inscripciones DROP COLUMN IF EXISTS %I', legacy_col);
    END IF;
  END LOOP;
END $$;

-- Keep canonical indexes present after cleanup
CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno_id ON public.inscripciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_grupo_id ON public.inscripciones(grupo_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_clase_vip_id ON public.inscripciones(clase_vip_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON public.inscripciones(estado);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_inscripciones_alumno_grupo_activa
  ON public.inscripciones(alumno_id, grupo_id)
  WHERE estado = 'activa' AND grupo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_inscripciones_alumno_vip_activa
  ON public.inscripciones(alumno_id, clase_vip_id)
  WHERE estado = 'activa' AND clase_vip_id IS NOT NULL;

COMMIT;
