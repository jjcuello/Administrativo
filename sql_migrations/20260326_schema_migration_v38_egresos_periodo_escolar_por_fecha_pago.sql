-- Migration v38 generated: 2026-03-26
-- Goal: align egresos periodo escolar assignment with payment date (cash basis)
-- while keeping periodo_nomina_ym for payroll attribution.

BEGIN;

CREATE OR REPLACE FUNCTION public.assign_periodo_escolar_egresos_por_fecha_pago()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_fecha date;
BEGIN
  IF NEW.periodo_escolar_id IS NULL
     OR (
       TG_OP = 'UPDATE'
       AND NEW.periodo_escolar_id IS NOT DISTINCT FROM OLD.periodo_escolar_id
       AND (
         NEW.fecha_pago IS DISTINCT FROM OLD.fecha_pago
         OR NEW.created_at IS DISTINCT FROM OLD.created_at
       )
     ) THEN
    -- Accounting policy: egresos belong to the school period of cash payment date.
    v_fecha := COALESCE(NEW.fecha_pago, NEW.created_at::date);
    NEW.periodo_escolar_id := public.ensure_periodo_escolar(v_fecha);
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.egresos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_egresos_assign_periodo_escolar ON public.egresos;

    CREATE TRIGGER trg_egresos_assign_periodo_escolar
      BEFORE INSERT OR UPDATE ON public.egresos
      FOR EACH ROW
      EXECUTE FUNCTION public.assign_periodo_escolar_egresos_por_fecha_pago();
  END IF;
END $$;

-- Reclassify existing egresos to accounting period by payment date.
UPDATE public.egresos
SET periodo_escolar_id = public.ensure_periodo_escolar(COALESCE(fecha_pago, created_at::date))
WHERE COALESCE(fecha_pago, created_at::date) IS NOT NULL;

COMMIT;
