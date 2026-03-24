-- export_metadata.sql
-- Ejecutar en Supabase SQL Editor. Crea tablas en public para descargar metadatos
BEGIN;

-- 1) helper: lista de tablas objetivo
CREATE TABLE IF NOT EXISTS public._target_tables (
  table_schema text,
  table_name text
);
TRUNCATE public._target_tables;

INSERT INTO public._target_tables (table_schema, table_name) VALUES
('auth','audit_log_entries'),
('auth','flow_state'),
('auth','identities'),
('auth','instances'),
('auth','mfa_amr_claims'),
('auth','mfa_challenges'),
('auth','mfa_factors'),
('auth','oauth_authorizations'),
('auth','oauth_client_states'),
('auth','oauth_clients'),
('auth','oauth_consents'),
('auth','one_time_tokens'),
('auth','refresh_tokens'),
('auth','saml_providers'),
('auth','saml_relay_states'),
('auth','schema_migrations'),
('auth','sessions'),
('auth','sso_domains'),
('auth','sso_providers'),
('auth','users'),
('public','alumnos'),
('public','alumnos_extra_catedra'),
('public','alumnos_nucleos'),
('public','alumnos_virtuales'),
('public','aportes_capital'),
('public','categorias_egreso'),
('public','categorias_ingreso'),
('public','categorias_producto'),
('public','clases_particulares'),
('public','clientes_particulares'),
('public','clubes'),
('public','colegios'),
('public','contratos'),
('public','cuentas_financieras'),
('public','donaciones'),
('public','donantes'),
('public','egresos'),
('public','eventos'),
('public','grupos_tardes'),
('public','ingresos'),
('public','inscripciones'),
('public','inscripciones_eventos'),
('public','nominas_pendientes'),
('public','nucleos'),
('public','pagos_nucleos'),
('public','paquetes_particulares'),
('public','paquetes_virtuales'),
('public','periodos_escolares'),
('public','personal'),
('public','personal_administrativo'),
('public','personal_colegios'),
('public','plan_pagos_alumno'),
('public','prestamos'),
('public','proveedores'),
('public','representantes'),
('public','roles'),
('public','servicios'),
('public','socios'),
('public','transacciones'),
('public','user_roles'),
('public','ventas'),
('realtime','messages'),
('realtime','schema_migrations'),
('realtime','subscription'),
('storage','buckets'),
('storage','buckets_analytics'),
('storage','buckets_vectors'),
('storage','migrations'),
('storage','objects'),
('storage','s3_multipart_uploads'),
('storage','s3_multipart_uploads_parts'),
('storage','vector_indexes'),
('vault','secrets');

-- 2) tables metadata
CREATE TABLE IF NOT EXISTS public._tables (
  table_schema text,
  table_name text
);
TRUNCATE public._tables;

INSERT INTO public._tables (table_schema, table_name)
SELECT t.table_schema, t.table_name
FROM information_schema.tables t
JOIN public._target_tables tt USING (table_schema, table_name)
WHERE t.table_type='BASE TABLE'
ORDER BY t.table_schema, t.table_name;

-- 3) columns
CREATE TABLE IF NOT EXISTS public._columns (
  table_schema text,
  table_name text,
  ordinal_position int,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  character_maximum_length int
);
TRUNCATE public._columns;

INSERT INTO public._columns (table_schema, table_name, ordinal_position, column_name, data_type, is_nullable, column_default, character_maximum_length)
SELECT c.table_schema, c.table_name, c.ordinal_position, c.column_name, c.data_type, c.is_nullable, c.column_default, c.character_maximum_length
FROM information_schema.columns c
JOIN public._target_tables tt USING (table_schema, table_name)
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- 4) primary keys
CREATE TABLE IF NOT EXISTS public._primary_keys (
  table_schema text,
  table_name text,
  constraint_name text,
  column_name text,
  ordinal_position int
);
TRUNCATE public._primary_keys;

INSERT INTO public._primary_keys (table_schema, table_name, constraint_name, column_name, ordinal_position)
SELECT kc.table_schema, kc.table_name, tc.constraint_name, kc.column_name, kc.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
  ON tc.constraint_name = kc.constraint_name AND tc.table_schema = kc.table_schema
JOIN public._target_tables tt ON kc.table_schema = tt.table_schema AND kc.table_name = tt.table_name
WHERE tc.constraint_type = 'PRIMARY KEY'
ORDER BY kc.table_schema, kc.table_name, kc.ordinal_position;

-- 5) foreign keys
CREATE TABLE IF NOT EXISTS public._foreign_keys (
  constraint_name text,
  table_schema text,
  table_name text,
  column_name text,
  foreign_table_schema text,
  foreign_table_name text,
  foreign_column_name text
);
TRUNCATE public._foreign_keys;

INSERT INTO public._foreign_keys (constraint_name, table_schema, table_name, column_name, foreign_table_schema, foreign_table_name, foreign_column_name)
SELECT tc.constraint_name, tc.table_schema, tc.table_name, kcu.column_name,
       ccu.table_schema AS foreign_table_schema, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
JOIN public._target_tables tt ON tc.table_schema = tt.table_schema AND tc.table_name = tt.table_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_schema, tc.table_name;

-- 6) indexes (indexdef)
CREATE TABLE IF NOT EXISTS public._indexes (
  schemaname text,
  tablename text,
  indexname text,
  indexdef text
);
TRUNCATE public._indexes;

INSERT INTO public._indexes (schemaname, tablename, indexname, indexdef)
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE (schemaname, tablename) IN (SELECT table_schema, table_name FROM public._target_tables)
ORDER BY schemaname, tablename, indexname;

-- 7) sequences used
CREATE TABLE IF NOT EXISTS public._sequences (
  sequence_schema text,
  sequence_name text
);
TRUNCATE public._sequences;

INSERT INTO public._sequences (sequence_schema, sequence_name)
SELECT sequence_schema, sequence_name
FROM information_schema.sequences
WHERE sequence_schema NOT IN ('pg_catalog','information_schema')
ORDER BY sequence_schema, sequence_name;

-- 8) views (if any in target schemas)
CREATE TABLE IF NOT EXISTS public._views (
  table_schema text,
  table_name text,
  view_definition text
);
TRUNCATE public._views;

INSERT INTO public._views (table_schema, table_name, view_definition)
SELECT v.table_schema, v.table_name, v.view_definition
FROM information_schema.views v
WHERE v.table_schema IN (SELECT DISTINCT table_schema FROM public._target_tables);

-- 9) functions (DDL)
CREATE TABLE IF NOT EXISTS public._functions (
  schema_name text,
  function_name text,
  definition text
);
TRUNCATE public._functions;

INSERT INTO public._functions (schema_name, function_name, definition)
SELECT n.nspname AS schema_name, p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN (SELECT DISTINCT table_schema FROM public._target_tables)
ORDER BY schema_name, function_name;

-- 10) constraints (full defs)
CREATE TABLE IF NOT EXISTS public._constraints (
  table_name text,
  conname text,
  definition text
);
TRUNCATE public._constraints;

INSERT INTO public._constraints (table_name, conname, definition)
SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace IN (SELECT oid FROM pg_namespace WHERE nspname IN (SELECT DISTINCT table_schema FROM public._target_tables))
ORDER BY table_name;

-- 11) row estimates
CREATE TABLE IF NOT EXISTS public._row_estimates (
  schemaname text,
  table_name text,
  row_estimate bigint
);
TRUNCATE public._row_estimates;

INSERT INTO public._row_estimates (schemaname, table_name, row_estimate)
SELECT schemaname, relname AS table_name, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname IN (SELECT DISTINCT table_schema FROM public._target_tables)
ORDER BY n_live_tup DESC;

-- 12) samples anonimizados (hasta 10 filas por tabla) into public._samples
CREATE TABLE IF NOT EXISTS public._samples (
  table_schema text,
  table_name text,
  row_json jsonb
);
TRUNCATE public._samples;

DO $$
DECLARE
  t RECORD;
  cols TEXT;
BEGIN
  FOR t IN SELECT table_schema, table_name FROM public._target_tables LOOP
    SELECT string_agg(
      CASE
        WHEN column_name ~* '(email|mail|correo|phone|tel|telefono|cel|dni|id_number|ssn|rut)' THEN
          quote_literal('REDACTED') || ' AS ' || quote_ident(column_name)
        WHEN data_type IN ('character varying','text','varchar') THEN
          'left('||quote_ident(column_name)||',40) || CASE WHEN length('||quote_ident(column_name)||')>40 THEN ''...'' ELSE '''' END AS '||quote_ident(column_name)
        WHEN data_type IN ('timestamp without time zone','timestamp with time zone','date') THEN
          'NULL AS '||quote_ident(column_name)
        ELSE
          quote_ident(column_name)
      END, ', ')
    INTO cols
    FROM information_schema.columns
    WHERE table_schema = t.table_schema AND table_name = t.table_name;

    IF cols IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'INSERT INTO public._samples (table_schema, table_name, row_json)
       SELECT %L, %L, row_to_json(sub) FROM (SELECT %s FROM %I.%I LIMIT 10) sub',
      t.table_schema, t.table_name, cols, t.table_schema, t.table_name
    );
  END LOOP;
END
$$;

COMMIT;
