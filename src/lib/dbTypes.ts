// Generated lightweight TypeScript types from CSV schema summary
// Fields are permissive (optional / nullable) to match typical Supabase responses.

export interface Alumnos {
  id?: string
  representante_id?: string | null
  nombres?: string
  apellidos?: string
  fecha_nacimiento?: string | null
  genero?: string | null
  condiciones_medicas?: string | null
  talla_uniforme?: string | null
  estado?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  deleted_at?: string | null
}

export interface Ingresos {
  id?: string
  fecha_ingreso?: string | null
  descripcion?: string
  monto_usd?: number | null
  metodo_ingreso?: string | null
  estado?: string | null
  categoria_id?: string | null
  alumno_id?: string | null
  colegio_id?: string | null
  cuenta_destino_id?: string | null
  transaccion_id?: string | null
  periodo_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  deleted_at?: string | null
}

export interface Egresos {
  id?: string
  cuenta_id?: string | null
  categoria_id?: string | null
  socio_id?: string | null
  profesor_id?: string | null
  periodo_nomina_ym?: string | null
  monto_usd?: number | null
  fecha_pago?: string | null
  beneficiario?: string | null
  referencia?: string | null
  observaciones?: string | null
  periodo_id?: string | null
  periodo_escolar_id?: string | null
  registrado_por?: string | null
  created_at?: string | null
  prestamo_id?: string | null
  componente_capital?: number | null
  componente_interes?: number | null
  proveedor_id?: string | null
  proveedor_otro?: string | null
  campaña_marketing?: string | null
}

export interface Transacciones {
  id?: string
  contrato_id?: string | null
  cuenta_id?: string | null
  monto?: number | null
  fecha_pago?: string | null
  metodo_pago?: string | null
  referencia?: string | null
  observaciones?: string | null
  registrado_por?: string | null
  created_at?: string | null
}

export interface CuentasFinancieras {
  id?: string
  nombre?: string
  moneda?: string | null
  saldo_inicial?: number | null
  activo?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  deleted_at?: string | null
}

export interface Proveedores {
  id?: string
  nombre_comercial?: string
  rif?: string | null
  contacto_nombre?: string | null
  telefono?: string | null
  tipo_proveedor?: string | null
  nombre?: string | null
  tipo?: string | null
  email?: string | null
  direccion?: string | null
  condiciones_pago?: string | null
  estado?: string | null
  notas?: string | null
  updated_at?: string | null
  created_by?: string | null
  deleted_at?: string | null
}

export interface Socios {
  id?: string
  nombre_completo?: string
  tipo_socio?: string | null
  created_at?: string | null
  presupuesto_anual_usd?: number | null
}

export interface Representantes {
  id?: string
  nombres?: string
  apellidos?: string
  cedula_tipo?: string | null
  cedula_numero?: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  estado?: string | null
  created_at?: string | null
}

export interface Inscripciones {
  id?: string
  alumno_id?: string | null
  grupo_id?: string | null
  clase_vip_id?: string | null
  fecha_inscripcion?: string | null
  periodo_escolar_id?: string | null
  estado?: string | null
  created_at?: string | null
}

export interface NominasMensuales {
  id?: string
  periodo_ym?: string
  fecha_cierre?: string | null
  estado?: string | null
  total_base?: number | null
  total_descuentos?: number | null
  total_neto?: number | null
  periodo_escolar_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  deleted_at?: string | null
}

export interface PeriodosEscolares {
  id?: string
  codigo?: string | null
  nombre?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  estado?: string | null
  es_actual?: boolean | null
  fecha_cierre?: string | null
  fecha_consolidacion?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  deleted_at?: string | null
}

export interface Ventas {
  id?: string
  categoria_id?: string | null
  nucleo_id?: string | null
  descripcion?: string | null
  monto_usd?: number | null
  fecha_venta?: string | null
  cuenta_id?: string | null
  transaccion_id?: string | null
  created_at?: string | null
}

// Add more interfaces as needed. These are intentionally permissive to avoid tight coupling.

export type DBTables = {
  alumnos: Alumnos
  ingresos: Ingresos
  egresos: Egresos
  transacciones: Transacciones
  cuentas_financieras: CuentasFinancieras
  proveedores: Proveedores
  socios: Socios
  representantes: Representantes
  inscripciones: Inscripciones
  nominas_mensuales: NominasMensuales
  periodos_escolares: PeriodosEscolares
  ventas: Ventas
}

// Ingreso assignments (cuenta destino categories)
export type IngresoAsignacion =
  | 'colegios_manana'
  | 'actividad_extracatedra'
  | 'nucleos'
  | 'clases_particulares'
  | 'clases_virtuales'
  | 'ventas'
  | 'aporte_capital'
  | 'donaciones'

// Egreso categories
export type EgresoCategoria =
  | 'utilidades'
  | 'pago_profesores'
  | 'pago_proveedores'
  | 'pago_capital'
  | 'gastos_operativos'
  | 'gastos_administrativos'

// No default export; consumers should import named types.
