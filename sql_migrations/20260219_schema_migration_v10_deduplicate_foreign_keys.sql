-- Migration v10 generated: 2026-02-19
-- Goal: remove duplicated foreign keys with identical semantics
-- Notes:
--   - Keeps one FK per (table, local_cols, ref_table, ref_cols, actions)
--   - Prefers canonical names ending in '_fkey'
--   - Drops extra duplicates (commonly legacy 'fk_*' names)

BEGIN;

DO $$
DECLARE
  grp record;
  keeper_name text;
  drop_name text;
BEGIN
  FOR grp IN
    WITH fk AS (
      SELECT
        c.oid,
        n.nspname AS schema_name,
        r.relname AS table_name,
        c.conname,
        c.conrelid,
        c.confrelid,
        c.conkey,
        c.confkey,
        c.confupdtype,
        c.confdeltype,
        c.confmatchtype,
        c.condeferrable,
        c.condeferred
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
    ),
    dup_groups AS (
      SELECT
        schema_name,
        table_name,
        conrelid,
        confrelid,
        conkey,
        confkey,
        confupdtype,
        confdeltype,
        confmatchtype,
        condeferrable,
        condeferred,
        COUNT(*) AS fk_count,
        ARRAY_AGG(conname ORDER BY
          CASE WHEN conname LIKE '%_fkey' THEN 0 ELSE 1 END,
          conname
        ) AS ordered_names
      FROM fk
      GROUP BY
        schema_name,
        table_name,
        conrelid,
        confrelid,
        conkey,
        confkey,
        confupdtype,
        confdeltype,
        confmatchtype,
        condeferrable,
        condeferred
      HAVING COUNT(*) > 1
    )
    SELECT *
    FROM dup_groups
  LOOP
    keeper_name := grp.ordered_names[1];

    -- Drop all duplicates except the keeper
    FOREACH drop_name IN ARRAY grp.ordered_names[2:array_length(grp.ordered_names, 1)]
    LOOP
      EXECUTE format(
        'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
        grp.schema_name,
        grp.table_name,
        drop_name
      );
    END LOOP;
  END LOOP;
END $$;

COMMIT;
