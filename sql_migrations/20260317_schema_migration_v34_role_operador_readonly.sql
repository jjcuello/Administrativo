-- Migration v34 generated: 2026-03-17
-- Goal: agregar rol operador con acceso global en modo solo lectura.

BEGIN;

INSERT INTO public.roles (code, nombre, descripcion)
VALUES (
  'operador',
  'Operador (Solo Lectura)',
  'Acceso a todos los módulos en modo lectura, sin permisos de escritura.'
)
ON CONFLICT (code) DO UPDATE
SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();

COMMIT;
