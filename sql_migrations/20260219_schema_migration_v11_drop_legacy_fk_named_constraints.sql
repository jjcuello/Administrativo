-- Migration v11 generated: 2026-02-19
-- Goal: remove legacy duplicate FK constraints named 'fk_*' when canonical '*_fkey' exists
-- Safety:
--   - Drops only 'fk_*' constraints
--   - Only when a matching FK exists with '*_fkey' name on same table/columns/reference

BEGIN;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    WITH fk AS (
      SELECT
        c.oid,
        n.nspname AS schema_name,
        r.relname AS table_name,
        c.conname,
        c.conrelid,
        c.confrelid,
        c.conkey,
        c.confkey
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
    )
    SELECT DISTINCT
      fk_legacy.schema_name,
      fk_legacy.table_name,
      fk_legacy.conname AS legacy_constraint,
      fk_canonical.conname AS canonical_constraint
    FROM fk fk_legacy
    JOIN fk fk_canonical
      ON fk_canonical.conrelid = fk_legacy.conrelid
     AND fk_canonical.confrelid = fk_legacy.confrelid
     AND fk_canonical.conkey = fk_legacy.conkey
     AND fk_canonical.confkey = fk_legacy.confkey
    WHERE fk_legacy.conname ~ '^fk_'
      AND fk_canonical.conname ~ '_fkey$'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      rec.schema_name,
      rec.table_name,
      rec.legacy_constraint
    );
  END LOOP;
END $$;

COMMIT;
