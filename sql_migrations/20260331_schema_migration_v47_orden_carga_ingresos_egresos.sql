-- Migration v47 generated: 2026-03-31
-- Goal: mantener orden estable de carga para ingresos y egresos,
-- especialmente cuando varios registros comparten la misma fecha.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.ingresos_orden_carga_seq;
CREATE SEQUENCE IF NOT EXISTS public.egresos_orden_carga_seq;

ALTER TABLE public.ingresos
	ADD COLUMN IF NOT EXISTS orden_carga bigint;

ALTER TABLE public.egresos
	ADD COLUMN IF NOT EXISTS orden_carga bigint;

ALTER TABLE public.ingresos
	ALTER COLUMN orden_carga SET DEFAULT nextval('public.ingresos_orden_carga_seq');

ALTER TABLE public.egresos
	ALTER COLUMN orden_carga SET DEFAULT nextval('public.egresos_orden_carga_seq');

ALTER SEQUENCE public.ingresos_orden_carga_seq OWNED BY public.ingresos.orden_carga;
ALTER SEQUENCE public.egresos_orden_carga_seq OWNED BY public.egresos.orden_carga;

-- Backfill histórico para preservar orden aproximado por creación.
WITH ordered AS (
	SELECT
		id,
		row_number() OVER (ORDER BY COALESCE(created_at, now()), id) AS rn
	FROM public.ingresos
	WHERE orden_carga IS NULL
)
UPDATE public.ingresos i
SET orden_carga = ordered.rn
FROM ordered
WHERE i.id = ordered.id;

WITH ordered AS (
	SELECT
		id,
		row_number() OVER (ORDER BY COALESCE(created_at, now()), id) AS rn
	FROM public.egresos
	WHERE orden_carga IS NULL
)
UPDATE public.egresos e
SET orden_carga = ordered.rn
FROM ordered
WHERE e.id = ordered.id;

-- Sincronizar secuencias al máximo actual.
SELECT setval(
	'public.ingresos_orden_carga_seq',
	GREATEST((SELECT COALESCE(MAX(orden_carga), 0) FROM public.ingresos), 1),
	true
);

SELECT setval(
	'public.egresos_orden_carga_seq',
	GREATEST((SELECT COALESCE(MAX(orden_carga), 0) FROM public.egresos), 1),
	true
);

ALTER TABLE public.ingresos
	ALTER COLUMN orden_carga SET NOT NULL;

ALTER TABLE public.egresos
	ALTER COLUMN orden_carga SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingresos_fecha_orden_carga
	ON public.ingresos (fecha_ingreso DESC, orden_carga DESC);

CREATE INDEX IF NOT EXISTS idx_egresos_fecha_orden_carga
	ON public.egresos (fecha_pago DESC, orden_carga DESC);

COMMIT;
