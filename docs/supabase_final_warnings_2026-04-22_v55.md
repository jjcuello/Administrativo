# Supabase final warnings - v55

Fecha
- 2026-04-22

Warning SQL restante
- extension_in_public (pg_trgm en public)

Correccion aplicada en codigo
- Migracion: sql_migrations/20260422_schema_migration_v55_move_pg_trgm_out_of_public.sql
- Accion: mueve extension `pg_trgm` de `public` a schema `extensions`.

Validacion SQL

```sql
SELECT e.extname, n.nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname = 'pg_trgm';
```

Esperado
- extname = pg_trgm
- schema_name = extensions

Warning no-SQL restante
- auth_leaked_password_protection

Accion manual en Supabase Dashboard
1. Authentication.
2. Password security.
3. Activar "Leaked password protection".
4. Guardar cambios.

Resultado esperado final
- Security Advisor con 0 errors y 0 warnings de seguridad de esta tanda.
