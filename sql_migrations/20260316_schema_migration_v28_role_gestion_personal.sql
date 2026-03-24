-- Migration v28 generated: 2026-03-16
-- Goal: agregar rol limitado para gestión de personal.

BEGIN;

INSERT INTO public.roles (code, nombre, descripcion)
VALUES (
  'gestion_personal',
  'Gestión Personal',
  'Acceso únicamente a Gestión (dashboard) y Manejo del Personal.'
)
ON CONFLICT (code) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();

COMMIT;
