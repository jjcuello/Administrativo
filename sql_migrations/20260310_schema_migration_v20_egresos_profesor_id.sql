-- Migration v20 generated: 2026-03-10
-- Goal: add profesor_id in egresos for payroll traceability (FK to personal)
-- Notes:
--   - Keeps beneficiario text for display/backward compatibility.
--   - Backfills profesor_id from beneficiario only on payroll categories and unique name matches.

BEGIN;

ALTER TABLE public.egresos
  ADD COLUMN IF NOT EXISTS profesor_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'egresos_profesor_id_fkey'
  ) THEN
    ALTER TABLE public.egresos
      ADD CONSTRAINT egresos_profesor_id_fkey
      FOREIGN KEY (profesor_id)
      REFERENCES public.personal(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_egresos_profesor_id
  ON public.egresos(profesor_id);

WITH profesores_unicos AS (
  SELECT
    lower(translate(btrim(concat_ws(' ', apellidos, nombres)), 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn')) AS nombre_key,
    max(id::text)::uuid AS profesor_id
  FROM public.personal
  GROUP BY 1
  HAVING count(*) = 1
),
categorias_nomina AS (
  SELECT id
  FROM public.categorias_egreso
  WHERE lower(translate(nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn')) LIKE '%nomina base%'
     OR lower(translate(nombre, 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn')) LIKE '%nomina extra%'
)
UPDATE public.egresos e
SET profesor_id = pu.profesor_id
FROM categorias_nomina cn, profesores_unicos pu
WHERE e.categoria_id = cn.id
  AND pu.nombre_key = lower(translate(btrim(e.beneficiario), 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiouNn'))
  AND e.profesor_id IS NULL
  AND e.beneficiario IS NOT NULL
  AND btrim(e.beneficiario) <> '';

COMMIT;
