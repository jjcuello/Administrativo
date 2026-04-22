-- Migration v46 generated: 2026-03-30
-- Goal: force cuenta Provincial opening balance for Sep-2025 to +40 USD (inicio escolar 2025-2026).

BEGIN;

DO $$
DECLARE
  v_cuenta_id uuid;
  v_ingresos_prev numeric := 0;
  v_egresos_prev numeric := 0;
  v_saldo_inicial_objetivo numeric := 0;
BEGIN
  SELECT id
  INTO v_cuenta_id
  FROM public.cuentas_financieras
  WHERE lower(coalesce(nombre, '')) LIKE '%provincial%'
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_cuenta_id IS NULL THEN
    RAISE NOTICE 'No se encontró cuenta financiera Provincial; no se aplicó ajuste.';
    RETURN;
  END IF;

  -- Replica el cálculo usado en el módulo de registro diario:
  -- saldo_apertura_mes = saldo_inicial + ingresos_previos - egresos_previos
  SELECT COALESCE(SUM(ABS(COALESCE(monto_usd, 0))), 0)
  INTO v_ingresos_prev
  FROM public.ingresos
  WHERE cuenta_destino_id = v_cuenta_id
    AND deleted_at IS NULL
    AND fecha_ingreso < DATE '2025-09-01';

  SELECT COALESCE(SUM(ABS(COALESCE(monto_usd, 0))), 0)
  INTO v_egresos_prev
  FROM public.egresos
  WHERE cuenta_id = v_cuenta_id
    AND fecha_pago < DATE '2025-09-01';

  v_saldo_inicial_objetivo := ROUND((40 - v_ingresos_prev + v_egresos_prev)::numeric, 2);

  UPDATE public.cuentas_financieras
  SET
    saldo_inicial = v_saldo_inicial_objetivo,
    updated_at = now()
  WHERE id = v_cuenta_id;

  RAISE NOTICE 'Ajuste Provincial aplicado. saldo_inicial=% ingresos_prev=% egresos_prev=%',
    v_saldo_inicial_objetivo, v_ingresos_prev, v_egresos_prev;
END $$;

COMMIT;
