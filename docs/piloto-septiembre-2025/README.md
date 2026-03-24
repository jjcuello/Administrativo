# Piloto de Implementación — Septiembre 2025

## Objetivo
Ejecutar una prueba piloto con **data real de septiembre 2025** para validar:
- Exactitud contable de la app.
- Capacidad operativa del equipo (carga, revisión y corrección).
- Estabilidad del flujo de trabajo previo a implementación formal.

## Decisión clave de datos
Toda la data cargada hasta hoy es ficticia y **debe eliminarse** para evitar sesgos, duplicados y errores de conciliación.

## Alcance del piloto
- Período: 2025-09-01 a 2025-09-30.
- Carga de maestros: personal/profesores, colegios, servicios.
- Carga operativa: ingresos/egresos y movimientos por cuenta.
- Conciliación: comparación diaria y cierre final contra registro oficial.

## Fuera de alcance
- Nuevas funcionalidades durante el piloto.
- Cambios de reglas de negocio sin aprobación del responsable de control.
- Mezcla de datos de otros meses.

## Equipo y responsabilidades
- **Nadia**: carga de personal y profesores.
- **José**: carga de colegios y parte de registros operativos.
- **Juan**: carga de servicios y parte de registros operativos.
- **Responsable de control** (tú): conciliación diaria, control de calidad y cierre Go/No-Go.

## Hoja de ruta 
1. **Día 0 — Preparación**
   - Congelar cambios de producto.
   - Confirmar fuente oficial contable.
   - Definir ventana de mantenimiento para reset.
2. **Día 1 — Respaldo + limpieza de ficticios**
   - Respaldo completo.
   - Limpieza controlada.
   - Verificación post-limpieza.
3. **Días 1-2 — Carga maestra real**
   - Nadia: personal/profesores.
   - José: colegios.
   - Juan: servicios colegio+profesor.
4. **Días 3-4 — Carga operativa septiembre 2025**
   - Juan y José con partición sin solapamiento.
   - Control diario de duplicados y faltantes.
5. **Día 7 — Conciliación final**
   - Totales, neto, saldos por cuenta y por rubro.
6. **Día 7 — Correcciones + decisión**
   - Cierre de incidencias críticas.
   - Informe final y decisión Go/No-Go.

## Criterios de éxito
- 100% de operaciones de septiembre cargadas.
- Diferencia final contra fuente oficial: 0 (o tolerancia aprobada).
- 0 errores críticos de integridad (huérfanos, duplicados críticos, saldos inválidos).
- Trazabilidad completa de cada ajuste.

## Archivos del kit operativo
- `01-checklist-reset-datos.md`
- `02-matriz-operativa.md`
- `03-conciliacion-diaria-template.csv`
- `04-bitacora-incidencias-template.csv`
- `05-monitoreo-carga-manana.sql`
- `07-validacion-carga-personal.sql`

## Ejecución rápida (bloque único SQL)
Usa este bloque completo en **Supabase SQL Editor** (una sola ejecución):

```sql
-- PILOTO SEPT 2025 · LIMPIEZA DE DATA FICTICIA (BLOQUE ÚNICO)
-- Preserva: auth.users, roles/user_roles y catálogos base.

-- 1) Pre-check rápido
SELECT 'before_auth_users' AS check_name, count(*)::bigint AS row_count FROM auth.users
UNION ALL
SELECT 'before_roles', count(*)::bigint FROM public.roles
UNION ALL
SELECT 'before_user_roles', count(*)::bigint FROM public.user_roles
UNION ALL
SELECT 'before_periodos_escolares', count(*)::bigint FROM public.periodos_escolares
UNION ALL
SELECT 'before_categorias_ingreso', count(*)::bigint FROM public.categorias_ingreso
UNION ALL
SELECT 'before_categorias_egreso', count(*)::bigint FROM public.categorias_egreso
UNION ALL
SELECT 'before_categorias_producto', count(*)::bigint FROM public.categorias_producto
UNION ALL
SELECT 'before_ingresos', count(*)::bigint FROM public.ingresos
UNION ALL
SELECT 'before_egresos', count(*)::bigint FROM public.egresos
ORDER BY check_name;

-- 2) Safety flag (misma sesión)
SELECT set_config('app.pilot_cleanup_confirm', 'YES', false);

BEGIN;

DO $$
DECLARE
   confirm_flag text := current_setting('app.pilot_cleanup_confirm', true);
BEGIN
   IF coalesce(confirm_flag, '') <> 'YES' THEN
      RAISE EXCEPTION
         'Safety stop: set app.pilot_cleanup_confirm=YES in this session before executing this migration.';
   END IF;
END $$;

CREATE TEMP TABLE IF NOT EXISTS tmp_pilot_cleanup_counts (
   table_name text PRIMARY KEY,
   row_count_before bigint,
   row_count_after bigint
) ON COMMIT DROP;

CREATE TEMP TABLE IF NOT EXISTS tmp_pilot_preserved_counts (
   table_name text PRIMARY KEY,
   row_count bigint
) ON COMMIT DROP;

DO $$
DECLARE
   preserve_tables constant text[] := ARRAY[
      'roles',
      'user_roles',
      'periodos_escolares',
      'categorias_ingreso',
      'categorias_egreso',
      'categorias_producto'
   ];
   table_rec record;
   truncate_targets text[] := ARRAY[]::text[];
   sql_truncate text;
   count_before bigint;
   count_after bigint;
BEGIN
   FOR table_rec IN
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
         AND tablename <> ALL (preserve_tables)
      ORDER BY tablename
   LOOP
      EXECUTE format('SELECT count(*) FROM public.%I', table_rec.tablename)
         INTO count_before;

      INSERT INTO tmp_pilot_cleanup_counts (table_name, row_count_before, row_count_after)
      VALUES (table_rec.tablename, count_before, NULL)
      ON CONFLICT (table_name) DO UPDATE
         SET row_count_before = EXCLUDED.row_count_before,
               row_count_after = NULL;

      truncate_targets := array_append(truncate_targets, format('public.%I', table_rec.tablename));
   END LOOP;

   IF array_length(truncate_targets, 1) IS NULL THEN
      RAISE NOTICE 'No public tables to clean (excluding preserved tables).';
   ELSE
      sql_truncate := 'TRUNCATE TABLE ' || array_to_string(truncate_targets, ', ') || ' RESTART IDENTITY CASCADE';
      EXECUTE sql_truncate;
   END IF;

   FOR table_rec IN
      SELECT table_name
      FROM tmp_pilot_cleanup_counts
      ORDER BY table_name
   LOOP
      EXECUTE format('SELECT count(*) FROM public.%I', table_rec.table_name)
         INTO count_after;

      UPDATE tmp_pilot_cleanup_counts
         SET row_count_after = count_after
      WHERE table_name = table_rec.table_name;
   END LOOP;

   FOR table_rec IN
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
         AND tablename = ANY (preserve_tables)
      ORDER BY tablename
   LOOP
      EXECUTE format('SELECT count(*) FROM public.%I', table_rec.tablename)
         INTO count_after;

      INSERT INTO tmp_pilot_preserved_counts (table_name, row_count)
      VALUES (table_rec.tablename, count_after)
      ON CONFLICT (table_name) DO UPDATE
         SET row_count = EXCLUDED.row_count;
   END LOOP;
END $$;

-- 3) Resumen de limpieza
SELECT
   table_name,
   row_count_before,
   row_count_after
FROM tmp_pilot_cleanup_counts
ORDER BY row_count_before DESC, table_name;

-- 4) Resumen de tablas preservadas
SELECT table_name, row_count AS current_rows
FROM tmp_pilot_preserved_counts
ORDER BY table_name;

COMMIT;

-- 5) Post-check rápido
SELECT 'after_auth_users' AS check_name, count(*)::bigint AS row_count FROM auth.users
UNION ALL
SELECT 'after_roles', count(*)::bigint FROM public.roles
UNION ALL
SELECT 'after_user_roles', count(*)::bigint FROM public.user_roles
UNION ALL
SELECT 'after_periodos_escolares', count(*)::bigint FROM public.periodos_escolares
UNION ALL
SELECT 'after_categorias_ingreso', count(*)::bigint FROM public.categorias_ingreso
UNION ALL
SELECT 'after_categorias_egreso', count(*)::bigint FROM public.categorias_egreso
UNION ALL
SELECT 'after_categorias_producto', count(*)::bigint FROM public.categorias_producto
UNION ALL
SELECT 'after_ingresos', count(*)::bigint FROM public.ingresos
UNION ALL
SELECT 'after_egresos', count(*)::bigint FROM public.egresos
ORDER BY check_name;
```

## Activar período del piloto (septiembre 2025)
Después del reset, ejecuta esta migración para dejar activo el año escolar del piloto:

- Archivo: `sql_migrations/20260316_schema_migration_v27_set_periodo_piloto_2025_2026.sql`
- En Supabase SQL Editor: pegar y ejecutar completo.

Validación esperada:
- `codigo = 2025-2026`
- `fecha_inicio = 2025-09-01`
- `fecha_fin = 2026-08-31`
- `es_actual = true` en una sola fila.

## Mejora de captura en personal (datos laborales)
### Opción recomendada (archivo único)
Para simplificar ejecución, usa un solo archivo que ya incluye **v29 + v30**:

- Archivo: `docs/piloto-septiembre-2025/06-setup-personal-unico.sql`
- En Supabase SQL Editor: pegar y ejecutar completo.

Este archivo deja listo:
- campos laborales ampliados,
- expediente documental de personal,
- bucket/policies de storage para subida de PNG/PDF.

### Opción separada (si prefieres por versión)
Para habilitar campos adicionales de trabajo en **Gestión > Personal**, ejecuta también:

- Archivo: `sql_migrations/20260316_schema_migration_v29_personal_datos_laborales.sql`
- En Supabase SQL Editor: pegar y ejecutar completo.

Incluye columnas opcionales como: teléfono, email, dirección, fechas ingreso/egreso, tipo de contrato, jornada, horario y contacto de emergencia.

## Expediente documental de personal (foto/certificados/RIF/soportes)
Para habilitar carga de archivos en **Gestión > Personal** (foto carnet PNG, certificados PDF, RIF PDF y soportes académicos múltiples), ejecuta:

- Archivo: `sql_migrations/20260316_schema_migration_v30_personal_expediente_documental.sql`
- En Supabase SQL Editor: pegar y ejecutar completo.

Este script agrega columnas documentales en `public.personal` y crea el bucket `personal-documentos` con políticas para usuarios autenticados.

## Campo bancario adicional en personal (cédula titular)
Para habilitar el nuevo campo **Cédula titular** dentro de **Gestión > Personal > Datos Banco**, ejecuta:

- Archivo: `sql_migrations/20260316_schema_migration_v32_personal_banco_cedula_titular.sql`
- En Supabase SQL Editor: pegar y ejecutar completo.

## Orden de carga post-reset (operativo)
1. **Período activo**: ejecutar v27 y validar.
2. **Maestros base**: personal/profesores, colegios, servicios/catálogos complementarios.
   - Si van a registrar ficha laboral ampliada de empleados: ejecutar v29 antes de cargar personal.
   - Si van a registrar expediente documental (foto/certificados/RIF/soportes): ejecutar v30 antes de cargar archivos.
   - Si van a registrar cédula titular en datos bancarios del personal: ejecutar v32.
3. **Estructura comercial**: alumnos, representantes y relaciones necesarias.
4. **Operaciones septiembre 2025**:
   - Ingresos
   - Egresos
   - Nómina del período
5. **Conciliación diaria y cierre** con plantilla de control.

## Regla de oro
Ninguna carga entra “por memoria”. Cada registro debe poder vincularse con su soporte oficial del mes.

## Módulo de actividad (Log's)
Para habilitar métricas de uso en **Gestión > Socios > Log's** (días conectados, horas activas estimadas y carga por usuario), ejecuta:

- Archivo: `sql_migrations/20260316_schema_migration_v31_app_user_activity_logs.sql`
- En Supabase SQL Editor: pegar y ejecutar completo.

Después de aplicar la migración, el sistema empieza a registrar automáticamente actividad en rutas protegidas.