# Supabase Performance warnings - fix plan (2026-04-22)

Origen
- Performance Advisor reportado con 13 warnings.
- Tipos detectados:
  - auth_rls_initplan
  - multiple_permissive_policies
  - duplicate_index

Migracion aplicada en codigo
- sql_migrations/20260422_schema_migration_v52_performance_warning_fixes.sql

Que corrige
- Reescribe politicas RLS para usar `(select auth.uid())` y `(select auth.role())`:
  - public.user_roles
  - public.app_user_activity_logs
  - public.app_ai_conversations
  - public.app_ai_messages
  - public.app_ai_tool_calls
- Elimina politica duplicada permisiva en `public.alumnos`:
  - "Permitir todo en alumnos"
- Elimina indices duplicados:
  - public.idx_alumnos_virtuales_email_lower
  - public.uidx_personal_colegios_personal_colegio

Validacion en Supabase
1. Ejecutar v52.
2. Re-ejecutar Performance Advisor.
3. Verificar que desaparecen los warnings:
  - auth_rls_initplan (10)
  - multiple_permissive_policies (1)
  - duplicate_index (2)

Consulta util de comprobacion (politicas RLS):

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles',
    'app_user_activity_logs',
    'app_ai_conversations',
    'app_ai_messages',
    'app_ai_tool_calls',
    'alumnos'
  )
ORDER BY tablename, policyname;
```

Consulta util de comprobacion (indices):

```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname = 'idx_alumnos_virtuales_email_lower'
    OR indexname = 'idx_alumnos_virtuales_email_lower_v4'
    OR indexname = 'uidx_personal_colegios_personal_colegio'
    OR indexname = 'personal_colegios_personal_id_colegio_id_key'
  )
ORDER BY tablename, indexname;
```
