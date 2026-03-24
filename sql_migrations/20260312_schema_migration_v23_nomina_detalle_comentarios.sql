-- v23: Comentarios por empleado en detalle de nómina
-- Permite registrar la justificación de descuentos (inasistencias/cantina) por operador.

DO $$
BEGIN
  IF to_regclass('public.nominas_mensuales_detalle') IS NOT NULL THEN
    ALTER TABLE public.nominas_mensuales_detalle
      ADD COLUMN IF NOT EXISTS comentario_descuento TEXT;
  END IF;
END $$;
