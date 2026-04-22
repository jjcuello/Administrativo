# Supabase Security warnings - hardening v54

Fecha
- 2026-04-22

Migracion
- sql_migrations/20260422_schema_migration_v54_security_warnings_hardening.sql

Warnings cubiertos
1. function_search_path_mutable
- Se fija `search_path` para funciones public reportadas por Security Advisor.

2. rls_policy_always_true
- Se reemplazan politicas INSERT/UPDATE/DELETE con `USING/WITH CHECK true` por
  expresiones basadas en `auth.role() = 'authenticated'`.
- Se reemplazan politicas legacy `Permitir todo en ...` (ALL) por version
  autenticada no-trivial.

3. public_bucket_allows_listing
- Se reemplaza la policy amplia de listado en `storage.objects` para bucket
  `personal-documentos` por una policy restringida a owner.

Warning que queda fuera de SQL
- auth_leaked_password_protection
  - Se habilita en dashboard de Supabase:
    Authentication > Providers/Settings > Password security > Leaked password protection.

Validacion post-ejecucion
1. Ejecutar v54 en SQL Editor.
2. Re-ejecutar Security Advisor.
3. Confirmar reduccion de warnings en:
  - function_search_path_mutable
  - rls_policy_always_true
  - public_bucket_allows_listing
