-- Migration v12 generated: 2026-02-19
-- Goal: create proveedores base table for gestion module

BEGIN;

-- Ensure UUID generator is available (Supabase usually has pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  nombre_comercial text NOT NULL,
  rif text,
  tipo text,
  contacto_nombre text,
  telefono text,
  email text,
  direccion text,
  condiciones_pago text,
  estado text NOT NULL DEFAULT 'activo',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);

-- If table already existed with older shape, ensure expected columns exist
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS nombre_comercial text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS rif text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS contacto_nombre text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS condiciones_pago text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Normalize defaults/not-null where applicable
ALTER TABLE public.proveedores
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN estado SET DEFAULT 'activo',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.proveedores
SET estado = 'activo'
WHERE estado IS NULL;

UPDATE public.proveedores
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.proveedores
SET updated_at = now()
WHERE updated_at IS NULL;

UPDATE public.proveedores
SET nombre = COALESCE(NULLIF(trim(rif), ''), 'Proveedor sin nombre')
WHERE nombre IS NULL OR trim(nombre) = '';

UPDATE public.proveedores
SET nombre_comercial = COALESCE(NULLIF(trim(nombre_comercial), ''), NULLIF(trim(nombre), ''), NULLIF(trim(rif), ''), 'Proveedor sin nombre')
WHERE nombre_comercial IS NULL OR trim(nombre_comercial) = '';

ALTER TABLE public.proveedores
  ALTER COLUMN nombre SET NOT NULL,
  ALTER COLUMN nombre_comercial SET NOT NULL,
  ALTER COLUMN estado SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Basic consistency checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_proveedores_estado'
      AND conrelid = 'public.proveedores'::regclass
  ) THEN
    ALTER TABLE public.proveedores
      ADD CONSTRAINT chk_proveedores_estado
      CHECK (estado IN ('activo', 'inactivo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_proveedores_email'
      AND conrelid = 'public.proveedores'::regclass
  ) THEN
    ALTER TABLE public.proveedores
      ADD CONSTRAINT chk_proveedores_email
      CHECK (email IS NULL OR position('@' in email) > 1);
  END IF;
END $$;

-- Helpful indexes for module filters/search
CREATE INDEX IF NOT EXISTS idx_proveedores_estado ON public.proveedores(estado);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON public.proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_rif ON public.proveedores(rif);
CREATE INDEX IF NOT EXISTS idx_proveedores_deleted_at ON public.proveedores(deleted_at);

-- Avoid duplicated active rif values while allowing null/soft-delete
CREATE UNIQUE INDEX IF NOT EXISTS uidx_proveedores_rif_activo
  ON public.proveedores (lower(rif))
  WHERE rif IS NOT NULL AND deleted_at IS NULL;

COMMIT;
