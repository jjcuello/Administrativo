-- PILOTO · SETUP ÚNICO PERSONAL (v29 + v30)
-- Fecha: 2026-03-16
-- Objetivo: habilitar en un solo paso
-- 1) Datos laborales ampliados
-- 2) Expediente documental (foto carnet + certificados + RIF + soportes académicos)
-- 3) Bucket y políticas de storage para usuarios autenticados

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'personal'
  ) THEN
    ALTER TABLE public.personal
      ADD COLUMN IF NOT EXISTS telefono text,
      ADD COLUMN IF NOT EXISTS email text,
      ADD COLUMN IF NOT EXISTS direccion text,
      ADD COLUMN IF NOT EXISTS fecha_ingreso date,
      ADD COLUMN IF NOT EXISTS fecha_egreso date,
      ADD COLUMN IF NOT EXISTS tipo_contrato text,
      ADD COLUMN IF NOT EXISTS jornada_laboral text,
      ADD COLUMN IF NOT EXISTS horario_laboral text,
      ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre text,
      ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono text,
      ADD COLUMN IF NOT EXISTS observaciones_laborales text,
      ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
      ADD COLUMN IF NOT EXISTS correo_personal text,
      ADD COLUMN IF NOT EXISTS correo_institucional text,
      ADD COLUMN IF NOT EXISTS foto_carnet_path text,
      ADD COLUMN IF NOT EXISTS certificado_salud_path text,
      ADD COLUMN IF NOT EXISTS certificado_foniatrico_path text,
      ADD COLUMN IF NOT EXISTS certificado_salud_mental_path text,
      ADD COLUMN IF NOT EXISTS rif text,
      ADD COLUMN IF NOT EXISTS rif_pdf_path text,
      ADD COLUMN IF NOT EXISTS banco_cedula_titular text,
      ADD COLUMN IF NOT EXISTS soportes_academicos_paths jsonb DEFAULT '[]'::jsonb;

    UPDATE public.personal
    SET soportes_academicos_paths = '[]'::jsonb
    WHERE soportes_academicos_paths IS NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ck_personal_fechas_laborales'
    ) THEN
      ALTER TABLE public.personal
        ADD CONSTRAINT ck_personal_fechas_laborales
        CHECK (
          fecha_egreso IS NULL
          OR fecha_ingreso IS NULL
          OR fecha_egreso >= fecha_ingreso
        );
    END IF;

    CREATE INDEX IF NOT EXISTS idx_personal_email_lower
      ON public.personal (lower(email));

    CREATE INDEX IF NOT EXISTS idx_personal_fecha_ingreso
      ON public.personal (fecha_ingreso);

    CREATE INDEX IF NOT EXISTS idx_personal_correo_personal_lower
      ON public.personal (lower(correo_personal));

    CREATE INDEX IF NOT EXISTS idx_personal_correo_institucional_lower
      ON public.personal (lower(correo_institucional));

    CREATE INDEX IF NOT EXISTS idx_personal_rif
      ON public.personal (rif);
  ELSE
    RAISE NOTICE 'Tabla public.personal no existe; se omite setup de columnas en personal.';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personal-documentos',
  'personal-documentos',
  true,
  10485760,
  ARRAY['image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'personal_documentos_select_authenticated'
  ) THEN
    CREATE POLICY personal_documentos_select_authenticated
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'personal-documentos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'personal_documentos_insert_authenticated'
  ) THEN
    CREATE POLICY personal_documentos_insert_authenticated
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'personal-documentos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'personal_documentos_update_authenticated'
  ) THEN
    CREATE POLICY personal_documentos_update_authenticated
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'personal-documentos')
      WITH CHECK (bucket_id = 'personal-documentos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'personal_documentos_delete_authenticated'
  ) THEN
    CREATE POLICY personal_documentos_delete_authenticated
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'personal-documentos');
  END IF;
END $$;

COMMIT;

-- ===== POST-CHECK =====
-- 1) Columnas clave de personal
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'personal'
  AND column_name IN (
    'fecha_nacimiento',
    'correo_personal',
    'correo_institucional',
    'foto_carnet_path',
    'certificado_salud_path',
    'certificado_foniatrico_path',
    'certificado_salud_mental_path',
    'rif',
    'rif_pdf_path',
    'banco_cedula_titular',
    'soportes_academicos_paths'
  )
ORDER BY column_name;

-- 2) Bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'personal-documentos';

-- 3) Policies
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_documentos_%'
ORDER BY policyname;
