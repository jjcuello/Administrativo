-- Migration v27 generated: 2026-03-16
-- Goal: asegurar período escolar del piloto (2025-2026) y dejarlo activo.
-- Safe to re-run: idempotente.

BEGIN;

DO $$
DECLARE
  v_codigo constant text := '2025-2026';
  v_nombre constant text := 'Año escolar 2025 - 2026';
  v_fecha_inicio constant date := DATE '2025-09-01';
  v_fecha_fin constant date := DATE '2026-08-31';
  v_periodo_id uuid;
BEGIN
  IF to_regclass('public.periodos_escolares') IS NULL THEN
    RAISE EXCEPTION 'Tabla public.periodos_escolares no existe. Ejecuta primero la migración v25.';
  END IF;

  SELECT p.id
  INTO v_periodo_id
  FROM public.periodos_escolares p
  WHERE lower(coalesce(p.codigo, '')) = lower(v_codigo)
  ORDER BY (p.deleted_at IS NOT NULL), p.created_at ASC
  LIMIT 1;

  IF v_periodo_id IS NULL THEN
    INSERT INTO public.periodos_escolares (
      codigo,
      nombre,
      fecha_inicio,
      fecha_fin,
      estado,
      es_actual,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES (
      v_codigo,
      v_nombre,
      v_fecha_inicio,
      v_fecha_fin,
      'abierto',
      false,
      now(),
      now(),
      NULL
    )
    RETURNING id INTO v_periodo_id;
  ELSE
    UPDATE public.periodos_escolares
    SET codigo = v_codigo,
        nombre = v_nombre,
        fecha_inicio = v_fecha_inicio,
        fecha_fin = v_fecha_fin,
        estado = 'abierto',
        deleted_at = NULL,
        updated_at = now()
    WHERE id = v_periodo_id;
  END IF;

  -- Evita duplicados activos por código (si hubieran filas legacy inconsistentes)
  UPDATE public.periodos_escolares
  SET deleted_at = now(),
      es_actual = false,
      updated_at = now()
  WHERE id <> v_periodo_id
    AND deleted_at IS NULL
    AND lower(coalesce(codigo, '')) = lower(v_codigo);

  -- Garantiza un único período activo
  UPDATE public.periodos_escolares
  SET es_actual = false,
      updated_at = now()
  WHERE deleted_at IS NULL
    AND id <> v_periodo_id
    AND es_actual IS TRUE;

  UPDATE public.periodos_escolares
  SET es_actual = true,
      estado = 'abierto',
      deleted_at = NULL,
      updated_at = now()
  WHERE id = v_periodo_id;
END $$;

-- Verificación rápida
SELECT
  id,
  codigo,
  nombre,
  fecha_inicio,
  fecha_fin,
  estado,
  es_actual,
  deleted_at
FROM public.periodos_escolares
WHERE deleted_at IS NULL
ORDER BY es_actual DESC, fecha_inicio DESC, created_at ASC;

COMMIT;
