# Supabase Security errors - batch fix v53

Fecha
- 2026-04-22

Problemas corregidos
- policy_exists_rls_disabled en public.cuentas_financieras.
- security_definer_view en:
  - public.vista_resumen_utilidades
  - public.v_clases_particulares_catalogo
- rls_disabled_in_public en lote de tablas public reportadas por Security Advisor.

Migracion
- sql_migrations/20260422_schema_migration_v53_security_errors_hardening_batch.sql

Estrategia aplicada
- Habilitar RLS por tabla.
- Revocar acceso anon.
- Mantener acceso authenticated (SELECT/INSERT/UPDATE/DELETE).
- Crear politicas por accion con criterio:
  - Si la tabla tiene columna deleted_at: usar deleted_at IS NULL.
  - Si no tiene deleted_at: usar TRUE.
- Cambiar vistas marcadas a security_invoker.

Validacion recomendada en Supabase
1. Ejecutar v53 en SQL Editor.
2. Re-ejecutar Security Advisor.
3. Confirmar que desaparecen:
  - policy_exists_rls_disabled
  - security_definer_view
  - rls_disabled_in_public

Consulta de comprobacion RLS

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'transacciones', 'alumnos_nucleos', 'inscripciones_eventos', 'pagos_nucleos',
    'alumnos_virtuales', 'personal', 'eventos', 'egresos', 'aportes_capital',
    'categorias_egreso', 'categorias_producto', 'clubes', 'alumnos_extra_catedra',
    'colegios', 'contratos', 'cuentas_financieras', 'clientes_particulares',
    'donaciones', 'donantes', 'nominas_pendientes', 'nucleos',
    'paquetes_particulares', 'paquetes_virtuales', 'personal_administrativo',
    'plan_pagos_alumno', 'prestamos', 'servicios', 'socios', 'ventas'
  )
ORDER BY c.relname;

Consulta de comprobacion de vistas

SELECT schemaname, viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('vista_resumen_utilidades', 'v_clases_particulares_catalogo');
