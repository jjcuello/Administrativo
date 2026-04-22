# Supabase RLS hardening - 2026-04-22

Motivo
- Se recibio alerta critica de Supabase: rls_disabled_in_public.
- Riesgo: tablas en public potencialmente accesibles sin restricciones de fila.

Accion aplicada en codigo
- Nueva migracion: sql_migrations/20260422_schema_migration_v51_enable_rls_public_tables_hardening.sql
- La migracion:
  - Habilita RLS en tablas de negocio criticas.
  - Revoca acceso de anon en esas tablas.
  - Define politicas para role authenticated.

Tablas incluidas
- public.proveedores
- public.categorias_ingreso
- public.ingresos
- public.periodos_escolares
- public.nominas_mensuales
- public.nominas_mensuales_detalle
- public.personal_colegios

Checklist de ejecucion en Supabase
1. Ejecutar la migracion v51 en el proyecto remoto.
2. Verificar estado RLS:

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'proveedores',
    'categorias_ingreso',
    'ingresos',
    'periodos_escolares',
    'nominas_mensuales',
    'nominas_mensuales_detalle',
    'personal_colegios'
  )
ORDER BY c.relname;
```

3. Re-ejecutar Security Advisor de Supabase y confirmar que desaparece `rls_disabled_in_public` para estas tablas.
4. Probar flujos criticos en la app autenticada:
  - Gestion de proveedores
  - Ingresos / egresos relacionados
  - Nomina mensual (cabecera + detalle)
  - Asignaciones personal-colegios

Nota
- Esta correccion cierra la exposicion por RLS deshabilitado.
- Como siguiente endurecimiento, conviene evolucionar politicas por rol de negocio (admin/operativo/consulta) en lugar de acceso amplio para cualquier authenticated.
