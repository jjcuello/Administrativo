-- Migration v30 generated: 2026-03-16
-- Goal: ampliar expediente de personal con datos solicitados y soporte documental.

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
      ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
      ADD COLUMN IF NOT EXISTS correo_personal text,
      ADD COLUMN IF NOT EXISTS correo_institucional text,
      ADD COLUMN IF NOT EXISTS foto_carnet_path text,
      ADD COLUMN IF NOT EXISTS certificado_salud_path text,
      ADD COLUMN IF NOT EXISTS certificado_foniatrico_path text,
      ADD COLUMN IF NOT EXISTS certificado_salud_mental_path text,
      ADD COLUMN IF NOT EXISTS rif text,
      ADD COLUMN IF NOT EXISTS rif_pdf_path text,
      ADD COLUMN IF NOT EXISTS soportes_academicos_paths jsonb DEFAULT '[]'::jsonb;

    UPDATE public.personal
    SET soportes_academicos_paths = '[]'::jsonb
    WHERE soportes_academicos_paths IS NULL;

    CREATE INDEX IF NOT EXISTS idx_personal_correo_personal_lower
      ON public.personal (lower(correo_personal));

    CREATE INDEX IF NOT EXISTS idx_personal_correo_institucional_lower
      ON public.personal (lower(correo_institucional));

    CREATE INDEX IF NOT EXISTS idx_personal_rif
      ON public.personal (rif);
  ELSE
    RAISE NOTICE 'Tabla public.personal no existe; se omite migración v30.';
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
