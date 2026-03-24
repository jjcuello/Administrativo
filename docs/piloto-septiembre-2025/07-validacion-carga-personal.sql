-- Validación de carga de personal y expediente documental
-- Ejecutar después de registrar/actualizar personal en Gestión > Personal.

-- 0) Verificar columnas esperadas de expediente en public.personal
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'personal'
  AND column_name IN (
    'fecha_nacimiento',
    'correo_personal',
    'correo_institucional',
    'foto_carnet_path',
    'certificado_salud_path',
    'certificado_foniatrico_path',
    'certificado_salud_mental_path',
    'rif',
    'rif_pdf_path',
    'soportes_academicos_paths'
  )
ORDER BY column_name;

-- 1) Resumen general de personal
SELECT 'total_personal' AS metrica, count(*)::bigint AS valor FROM public.personal
UNION ALL
SELECT 'activos', count(*)::bigint FROM public.personal WHERE coalesce(lower(estado), 'activo') = 'activo'
UNION ALL
SELECT 'cesados', count(*)::bigint FROM public.personal WHERE lower(coalesce(estado, '')) = 'cesado'
ORDER BY metrica;

-- 2) Calidad mínima (campos base obligatorios)
SELECT 'sin_nombres' AS check_name, count(*)::bigint AS filas
FROM public.personal
WHERE coalesce(trim(nombres), '') = ''
UNION ALL
SELECT 'sin_apellidos', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(apellidos), '') = ''
UNION ALL
SELECT 'sin_cedula', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(cedula_numero), '') = ''
UNION ALL
SELECT 'sin_cargo', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(cargo), '') = ''
UNION ALL
SELECT 'monto_base_menor_igual_0', count(*)::bigint
FROM public.personal
WHERE coalesce(monto_base_mensual, 0) <= 0
ORDER BY check_name;

-- 3) Posibles duplicados de cédula
SELECT
  upper(coalesce(cedula_tipo, 'V')) AS cedula_tipo,
  trim(coalesce(cedula_numero, '')) AS cedula_numero,
  count(*)::bigint AS repeticiones,
  string_agg(concat_ws(' ', apellidos, nombres), ' | ' ORDER BY apellidos, nombres) AS personas
FROM public.personal
WHERE coalesce(trim(cedula_numero), '') <> ''
GROUP BY 1, 2
HAVING count(*) > 1
ORDER BY repeticiones DESC, cedula_tipo, cedula_numero;

-- 4) Validaciones de fechas
SELECT 'fecha_egreso_menor_fecha_ingreso' AS check_name, count(*)::bigint AS filas
FROM public.personal
WHERE fecha_egreso IS NOT NULL
  AND fecha_ingreso IS NOT NULL
  AND fecha_egreso < fecha_ingreso
UNION ALL
SELECT 'fecha_nacimiento_futura', count(*)::bigint
FROM public.personal
WHERE fecha_nacimiento IS NOT NULL
  AND fecha_nacimiento > current_date
UNION ALL
SELECT 'fecha_nacimiento_mayor_fecha_ingreso', count(*)::bigint
FROM public.personal
WHERE fecha_nacimiento IS NOT NULL
  AND fecha_ingreso IS NOT NULL
  AND fecha_nacimiento > fecha_ingreso
ORDER BY check_name;

-- 5) Correos potencialmente inválidos
SELECT 'correo_personal_invalido' AS check_name, count(*)::bigint AS filas
FROM public.personal
WHERE coalesce(trim(correo_personal), '') <> ''
  AND NOT (trim(correo_personal) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
UNION ALL
SELECT 'correo_institucional_invalido', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(correo_institucional), '') <> ''
  AND NOT (trim(correo_institucional) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
ORDER BY check_name;

-- 6) Cobertura de expediente documental
SELECT
  count(*)::bigint AS total_personal,
  count(*) FILTER (WHERE coalesce(trim(foto_carnet_path), '') <> '')::bigint AS con_foto_carnet,
  count(*) FILTER (WHERE coalesce(trim(certificado_salud_path), '') <> '')::bigint AS con_certificado_salud,
  count(*) FILTER (WHERE coalesce(trim(certificado_foniatrico_path), '') <> '')::bigint AS con_certificado_foniatrico,
  count(*) FILTER (WHERE coalesce(trim(certificado_salud_mental_path), '') <> '')::bigint AS con_certificado_salud_mental,
  count(*) FILTER (WHERE coalesce(trim(rif), '') <> '')::bigint AS con_rif,
  count(*) FILTER (WHERE coalesce(trim(rif_pdf_path), '') <> '')::bigint AS con_rif_pdf,
  sum(
    CASE
      WHEN jsonb_typeof(coalesce(soportes_academicos_paths, '[]'::jsonb)) = 'array'
      THEN jsonb_array_length(coalesce(soportes_academicos_paths, '[]'::jsonb))
      ELSE 0
    END
  )::bigint AS total_soportes_academicos
FROM public.personal;

-- 7) Extensiones inválidas de rutas (debe ser 0)
SELECT 'foto_no_png' AS check_name, count(*)::bigint AS filas
FROM public.personal
WHERE coalesce(trim(foto_carnet_path), '') <> ''
  AND lower(foto_carnet_path) !~ '\\.png$'
UNION ALL
SELECT 'certificado_salud_no_pdf', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(certificado_salud_path), '') <> ''
  AND lower(certificado_salud_path) !~ '\\.pdf$'
UNION ALL
SELECT 'certificado_foniatrico_no_pdf', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(certificado_foniatrico_path), '') <> ''
  AND lower(certificado_foniatrico_path) !~ '\\.pdf$'
UNION ALL
SELECT 'certificado_salud_mental_no_pdf', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(certificado_salud_mental_path), '') <> ''
  AND lower(certificado_salud_mental_path) !~ '\\.pdf$'
UNION ALL
SELECT 'rif_pdf_no_pdf', count(*)::bigint
FROM public.personal
WHERE coalesce(trim(rif_pdf_path), '') <> ''
  AND lower(rif_pdf_path) !~ '\\.pdf$'
UNION ALL
SELECT 'soportes_academicos_no_pdf', count(*)::bigint
FROM (
  SELECT jsonb_array_elements_text(coalesce(p.soportes_academicos_paths, '[]'::jsonb)) AS path
  FROM public.personal p
  WHERE jsonb_typeof(coalesce(p.soportes_academicos_paths, '[]'::jsonb)) = 'array'
) s
WHERE lower(coalesce(s.path, '')) !~ '\\.pdf$'
ORDER BY check_name;

-- 8) Archivos referenciados pero no encontrados en storage.objects (bucket personal-documentos)
WITH paths_unicos AS (
  SELECT distinct path
  FROM (
    SELECT nullif(trim(foto_carnet_path), '') AS path FROM public.personal
    UNION ALL
    SELECT nullif(trim(certificado_salud_path), '') FROM public.personal
    UNION ALL
    SELECT nullif(trim(certificado_foniatrico_path), '') FROM public.personal
    UNION ALL
    SELECT nullif(trim(certificado_salud_mental_path), '') FROM public.personal
    UNION ALL
    SELECT nullif(trim(rif_pdf_path), '') FROM public.personal
    UNION ALL
    SELECT jsonb_array_elements_text(coalesce(soportes_academicos_paths, '[]'::jsonb))
    FROM public.personal
    WHERE jsonb_typeof(coalesce(soportes_academicos_paths, '[]'::jsonb)) = 'array'
  ) t
  WHERE path IS NOT NULL
)
SELECT
  count(*)::bigint AS rutas_referenciadas,
  count(*) FILTER (WHERE o.name IS NOT NULL)::bigint AS rutas_existentes_storage,
  count(*) FILTER (WHERE o.name IS NULL)::bigint AS rutas_faltantes_storage
FROM paths_unicos p
LEFT JOIN storage.objects o
  ON o.bucket_id = 'personal-documentos'
 AND o.name = p.path;

-- 9) Top de personal activo con faltantes (para corrección operativa)
SELECT
  p.id,
  p.apellidos,
  p.nombres,
  concat_ws('-', p.cedula_tipo, p.cedula_numero) AS cedula,
  array_to_string(
    array_remove(ARRAY[
      CASE WHEN coalesce(trim(p.foto_carnet_path), '') = '' THEN 'Foto carnet' END,
      CASE WHEN coalesce(trim(p.certificado_salud_path), '') = '' THEN 'Cert. salud' END,
      CASE WHEN coalesce(trim(p.certificado_foniatrico_path), '') = '' THEN 'Cert. foniátrico' END,
      CASE WHEN coalesce(trim(p.certificado_salud_mental_path), '') = '' THEN 'Cert. salud mental' END,
      CASE WHEN coalesce(trim(p.rif), '') = '' THEN 'RIF texto' END,
      CASE WHEN coalesce(trim(p.rif_pdf_path), '') = '' THEN 'RIF PDF' END
    ], NULL),
    ', '
  ) AS faltantes,
  CASE
    WHEN jsonb_typeof(coalesce(p.soportes_academicos_paths, '[]'::jsonb)) = 'array'
    THEN jsonb_array_length(coalesce(p.soportes_academicos_paths, '[]'::jsonb))
    ELSE 0
  END AS cant_soportes_academicos
FROM public.personal p
WHERE coalesce(lower(p.estado), 'activo') = 'activo'
ORDER BY p.apellidos NULLS LAST, p.nombres NULLS LAST
LIMIT 200;
