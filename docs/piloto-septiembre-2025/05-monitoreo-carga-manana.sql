-- Monitoreo rápido de carga real · Piloto Septiembre 2025
-- Ejecutar en Supabase SQL Editor durante la mañana (cada 30-60 min)

-- Parámetros del piloto
WITH params AS (
  SELECT DATE '2025-09-01' AS desde, DATE '2025-09-30' AS hasta
)
SELECT * FROM params;

-- 1) Estado de período escolar activo
SELECT
  id,
  codigo,
  nombre,
  fecha_inicio,
  fecha_fin,
  estado,
  es_actual
FROM public.periodos_escolares
WHERE deleted_at IS NULL
ORDER BY es_actual DESC, fecha_inicio DESC, created_at ASC;

-- 2) Volumen cargado del período (tablas clave)
WITH params AS (
  SELECT DATE '2025-09-01' AS desde, DATE '2025-09-30' AS hasta
)
SELECT 'ingresos' AS tabla, count(*)::bigint AS filas, coalesce(sum(i.monto_usd), 0)::numeric AS total_usd
FROM public.ingresos i, params p
WHERE i.deleted_at IS NULL
  AND i.fecha_ingreso BETWEEN p.desde AND p.hasta
UNION ALL
SELECT 'egresos' AS tabla, count(*)::bigint AS filas, coalesce(sum(e.monto_usd), 0)::numeric AS total_usd
FROM public.egresos e, params p
WHERE e.fecha_pago BETWEEN p.desde AND p.hasta
UNION ALL
SELECT 'nominas_mensuales' AS tabla, count(*)::bigint AS filas, coalesce(sum(n.total_neto), 0)::numeric AS total_usd
FROM public.nominas_mensuales n
WHERE n.deleted_at IS NULL
  AND n.periodo_ym = '2025-09'
ORDER BY tabla;

-- 3) Calidad de datos mínima (faltantes clave)
WITH params AS (
  SELECT DATE '2025-09-01' AS desde, DATE '2025-09-30' AS hasta
)
SELECT 'ingresos_sin_categoria' AS check_name, count(*)::bigint AS filas
FROM public.ingresos i, params p
WHERE i.deleted_at IS NULL
  AND i.fecha_ingreso BETWEEN p.desde AND p.hasta
  AND i.categoria_id IS NULL
UNION ALL
SELECT 'ingresos_sin_cuenta_destino' AS check_name, count(*)::bigint AS filas
FROM public.ingresos i, params p
WHERE i.deleted_at IS NULL
  AND i.fecha_ingreso BETWEEN p.desde AND p.hasta
  AND i.cuenta_destino_id IS NULL
UNION ALL
SELECT 'ingresos_sin_periodo' AS check_name, count(*)::bigint AS filas
FROM public.ingresos i, params p
WHERE i.deleted_at IS NULL
  AND i.fecha_ingreso BETWEEN p.desde AND p.hasta
  AND nullif(to_jsonb(i)->>'periodo_id', '') IS NULL
UNION ALL
SELECT 'egresos_sin_categoria' AS check_name, count(*)::bigint AS filas
FROM public.egresos e, params p
WHERE e.fecha_pago BETWEEN p.desde AND p.hasta
  AND e.categoria_id IS NULL
UNION ALL
SELECT 'egresos_sin_cuenta_origen' AS check_name, count(*)::bigint AS filas
FROM public.egresos e, params p
WHERE e.fecha_pago BETWEEN p.desde AND p.hasta
  AND e.cuenta_id IS NULL
UNION ALL
SELECT 'egresos_sin_periodo' AS check_name, count(*)::bigint AS filas
FROM public.egresos e, params p
WHERE e.fecha_pago BETWEEN p.desde AND p.hasta
  AND coalesce(nullif(to_jsonb(e)->>'periodo_escolar_id', ''), nullif(to_jsonb(e)->>'periodo_id', '')) IS NULL
ORDER BY check_name;

-- 4) Montos inválidos (deberían ser 0 filas)
WITH params AS (
  SELECT DATE '2025-09-01' AS desde, DATE '2025-09-30' AS hasta
)
SELECT 'ingresos_monto_menor_igual_0' AS check_name, count(*)::bigint AS filas
FROM public.ingresos i, params p
WHERE i.deleted_at IS NULL
  AND i.fecha_ingreso BETWEEN p.desde AND p.hasta
  AND coalesce(i.monto_usd, 0) <= 0
UNION ALL
SELECT 'egresos_monto_menor_igual_0' AS check_name, count(*)::bigint AS filas
FROM public.egresos e, params p
WHERE e.fecha_pago BETWEEN p.desde AND p.hasta
  AND coalesce(e.monto_usd, 0) <= 0
ORDER BY check_name;

-- 5) Posibles duplicados de ingresos (top 20)
WITH params AS (
  SELECT DATE '2025-09-01' AS desde, DATE '2025-09-30' AS hasta
)
SELECT
  i.fecha_ingreso,
  i.cuenta_destino_id,
  i.categoria_id,
  round(coalesce(i.monto_usd, 0)::numeric, 2) AS monto_usd,
  lower(trim(coalesce(i.descripcion, ''))) AS descripcion_norm,
  count(*)::bigint AS repeticiones
FROM public.ingresos i, params p
WHERE i.deleted_at IS NULL
  AND i.fecha_ingreso BETWEEN p.desde AND p.hasta
GROUP BY 1,2,3,4,5
HAVING count(*) > 1
ORDER BY repeticiones DESC, fecha_ingreso DESC
LIMIT 20;

-- 6) Posibles duplicados de egresos (top 20)
WITH params AS (
  SELECT DATE '2025-09-01' AS desde, DATE '2025-09-30' AS hasta
)
SELECT
  e.fecha_pago,
  e.cuenta_id,
  e.categoria_id,
  round(coalesce(e.monto_usd, 0)::numeric, 2) AS monto_usd,
  lower(trim(coalesce(e.beneficiario, ''))) AS beneficiario_norm,
  lower(trim(coalesce(e.observaciones, ''))) AS observaciones_norm,
  count(*)::bigint AS repeticiones
FROM public.egresos e, params p
WHERE e.fecha_pago BETWEEN p.desde AND p.hasta
GROUP BY 1,2,3,4,5,6
HAVING count(*) > 1
ORDER BY repeticiones DESC, fecha_pago DESC
LIMIT 20;

-- 7) Resumen diario (ingresos, egresos, neto)
WITH params AS (
  SELECT DATE '2025-09-01' AS desde, DATE '2025-09-30' AS hasta
),
dias AS (
  SELECT gs::date AS fecha
  FROM params p,
       generate_series(p.desde::timestamp, p.hasta::timestamp, interval '1 day') AS gs
),
ingresos_diarios AS (
  SELECT i.fecha_ingreso AS fecha, sum(i.monto_usd)::numeric AS ingresos_usd
  FROM public.ingresos i, params p
  WHERE i.deleted_at IS NULL
    AND i.fecha_ingreso BETWEEN p.desde AND p.hasta
  GROUP BY i.fecha_ingreso
),
egresos_diarios AS (
  SELECT e.fecha_pago AS fecha, sum(e.monto_usd)::numeric AS egresos_usd
  FROM public.egresos e, params p
  WHERE e.fecha_pago BETWEEN p.desde AND p.hasta
  GROUP BY e.fecha_pago
)
SELECT
  d.fecha,
  coalesce(i.ingresos_usd, 0)::numeric AS ingresos_usd,
  coalesce(e.egresos_usd, 0)::numeric AS egresos_usd,
  (coalesce(i.ingresos_usd, 0) - coalesce(e.egresos_usd, 0))::numeric AS neto_usd
FROM dias d
LEFT JOIN ingresos_diarios i ON i.fecha = d.fecha
LEFT JOIN egresos_diarios e ON e.fecha = d.fecha
ORDER BY d.fecha;
