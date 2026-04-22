import { supabase } from './supabase'
import type {
  Alumnos,
  Ingresos,
  Egresos,
  Transacciones,
  CuentasFinancieras,
  Proveedores,
  Socios,
  IngresoAsignacion,
  EgresoCategoria
} from './dbTypes'

type Result<T> = Promise<{ data: T | null; error: unknown }>

type NormalizedError = {
  message: string
  cause?: unknown
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

const toNormalizedError = (error: unknown, fallback: string): NormalizedError => ({
  message: getErrorMessage(error, fallback),
  cause: error,
})

const isMissingColumnError = (error: unknown, columnName: string) => {
  const text = getErrorMessage(error, '').toLowerCase()
  const normalizedColumn = columnName.toLowerCase()
  return text.includes(normalizedColumn)
    && (text.includes('column') || text.includes('schema cache') || text.includes('does not exist') || text.includes('no existe'))
}

const safeResult = async <T>(
  operation: () => PromiseLike<{ data: unknown; error: unknown }>,
  fallback: string
): Result<T> => {
  try {
    const { data, error } = await operation()
    if (error) {
      return { data: (data as T | null) ?? null, error: toNormalizedError(error, fallback) }
    }
    return { data: (data as T | null) ?? null, error: null }
  } catch (error) {
    return { data: null, error: toNormalizedError(error, fallback) }
  }
}

const isPeriodoYm = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

/* Alumnos */
export const listAlumnos = async (): Result<Alumnos[]> => {
  return safeResult(() => supabase.from('alumnos').select('*'), 'No se pudo cargar alumnos')
}

export const getAlumnoById = async (id: string): Result<Alumnos> => {
  return safeResult(() => supabase.from('alumnos').select('*').eq('id', id).maybeSingle(), 'No se pudo cargar el alumno')
}

export const createAlumno = async (payload: Partial<Alumnos>): Result<Alumnos> => {
  return safeResult(() => supabase.from('alumnos').insert(payload).select().maybeSingle(), 'No se pudo crear el alumno')
}

export const updateAlumno = async (id: string, payload: Partial<Alumnos>): Result<Alumnos> => {
  return safeResult(() => supabase.from('alumnos').update(payload).eq('id', id).select().maybeSingle(), 'No se pudo actualizar el alumno')
}

export const deleteAlumno = async (id: string): Result<Alumnos> => {
  return safeResult(() => supabase.from('alumnos').delete().eq('id', id).select().maybeSingle(), 'No se pudo eliminar el alumno')
}

/* Ingresos */
export const listIngresos = async (): Result<Ingresos[]> => {
  return safeResult(() => supabase.from('ingresos').select('*'), 'No se pudo cargar ingresos')
}

export const listIngresosPaginated = async (
  page = 1,
  perPage = 20,
  searchTerm?: string,
  periodoEscolarId?: string | null
): Promise<{ data: Ingresos[] | null; error: unknown; count: number | null }> => {
  try {
    const start = (page - 1) * perPage
    const end = page * perPage - 1

    const runQuery = async (useOrdenCarga: boolean) => {
      let query = supabase
        .from('ingresos')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .neq('estado', 'anulado')
        .order('fecha_ingreso', { ascending: false })

      if (useOrdenCarga) {
        query = query.order('orden_carga', { ascending: false })
      }

      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      if (periodoEscolarId) {
        query = query.eq('periodo_id', periodoEscolarId)
      }

      if (searchTerm && searchTerm.trim()) {
        const q = `%${searchTerm.trim()}%`
        query = query.or(`descripcion.ilike.${q},metodo_ingreso.ilike.${q}`)
      }

      return query.range(start, end)
    }

    let { data, error, count } = await runQuery(true)
    if (error && isMissingColumnError(error, 'orden_carga')) {
      const fallback = await runQuery(false)
      data = fallback.data
      error = fallback.error
      count = fallback.count
    }

    if (error) {
      return {
        data: (data as Ingresos[] | null) ?? null,
        error: toNormalizedError(error, 'No se pudo cargar ingresos'),
        count: typeof count === 'number' ? count : null,
      }
    }

    return { data: (data as Ingresos[] | null) ?? null, error: null, count: typeof count === 'number' ? count : null }
  } catch (error) {
    return { data: null, error: toNormalizedError(error, 'No se pudo cargar ingresos'), count: null }
  }
}

export const listIngresosByAsignacion = async (asignacion: IngresoAsignacion): Result<Ingresos[]> => {
  try {
    const { data: byMethod, error: errMethod } = await supabase
      .from('ingresos')
      .select('*')
      .eq('metodo_ingreso', asignacion)
    if (errMethod) return { data: null, error: toNormalizedError(errMethod, 'No se pudo cargar ingresos por asignación') }
    if (byMethod && byMethod.length) return { data: byMethod, error: null }

    const label = asignacion.replace(/_/g, ' ')
    const { data: cats, error: errCats } = await supabase
      .from('categorias_ingreso')
      .select('id')
      .ilike('nombre', `%${label}%`)
    if (errCats) return { data: null, error: toNormalizedError(errCats, 'No se pudo cargar ingresos por asignación') }
    if (!cats || cats.length === 0) return { data: [], error: null }
    const ids = (cats as Array<{ id: string }>).map(c => c.id)
    const { data, error } = await supabase.from('ingresos').select('*').in('categoria_id', ids)
    if (error) return { data: null, error: toNormalizedError(error, 'No se pudo cargar ingresos por asignación') }
    return { data, error: null }
  } catch (error) {
    return { data: null, error: toNormalizedError(error, 'No se pudo cargar ingresos por asignación') }
  }
}

export const listIngresosByCuenta = async (cuentaId: string): Result<Ingresos[]> => {
  return safeResult(() => supabase.from('ingresos').select('*').eq('cuenta_destino_id', cuentaId), 'No se pudo cargar ingresos por cuenta')
}

export const getIngresoById = async (id: string): Result<Ingresos> => {
  return safeResult(() => supabase.from('ingresos').select('*').eq('id', id).maybeSingle(), 'No se pudo cargar el ingreso')
}

export const createIngreso = async (payload: Partial<Ingresos>): Result<Ingresos> => {
  if (payload.monto_usd != null && Number(payload.monto_usd) <= 0) {
    return { data: null, error: { message: 'monto_usd must be > 0' } }
  }
  if (payload.fecha_ingreso) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(payload.fecha_ingreso)
    if (!ok) return { data: null, error: { message: 'fecha_ingreso must be YYYY-MM-DD' } }
  }
  return safeResult(() => supabase.from('ingresos').insert(payload).select().maybeSingle(), 'No se pudo crear el ingreso')
}

export const updateIngreso = async (id: string, payload: Partial<Ingresos>): Result<Ingresos> => {
  return safeResult(() => supabase.from('ingresos').update(payload).eq('id', id).select().maybeSingle(), 'No se pudo actualizar el ingreso')
}

export const deleteIngreso = async (id: string): Result<Ingresos> => {
  try {
    const hardDelete = await supabase
      .from('ingresos')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle()

    if (!hardDelete.error) {
      return { data: (hardDelete.data as Ingresos | null) ?? null, error: null }
    }

    const fallback = await supabase
      .from('ingresos')
      .update({ estado: 'anulado', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (fallback.error) {
      return { data: null, error: toNormalizedError(hardDelete.error, 'No se pudo eliminar el ingreso') }
    }

    return { data: (fallback.data as Ingresos | null) ?? null, error: null }
  } catch (error) {
    return { data: null, error: toNormalizedError(error, 'No se pudo eliminar el ingreso') }
  }
}

export const listEgresos = async (periodoEscolarId?: string | null): Result<Egresos[]> => {
  try {
    const runQuery = async (useOrdenCarga: boolean) => {
      let query = supabase
        .from('egresos')
        .select('*')
        .order('fecha_pago', { ascending: false })

      if (useOrdenCarga) {
        query = query.order('orden_carga', { ascending: false })
      }

      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      if (periodoEscolarId) {
        query = query.eq('periodo_escolar_id', periodoEscolarId)
      }

      return query
    }

    let { data, error } = await runQuery(true)
    if (error && isMissingColumnError(error, 'orden_carga')) {
      const fallback = await runQuery(false)
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      return { data: (data as Egresos[] | null) ?? null, error: toNormalizedError(error, 'No se pudo cargar egresos') }
    }

    return { data: (data as Egresos[] | null) ?? null, error: null }
  } catch (error) {
    return { data: null, error: toNormalizedError(error, 'No se pudo cargar egresos') }
  }
}

export const listEgresosByCategoria = async (categoria: EgresoCategoria): Result<Egresos[]> => {
  try {
    const label = categoria.replace(/_/g, ' ')
    const { data: cats, error: errCats } = await supabase
      .from('categorias_egreso')
      .select('id')
      .ilike('nombre', `%${label}%`)
    if (errCats) return { data: null, error: toNormalizedError(errCats, 'No se pudo cargar egresos por categoría') }
    if (!cats || cats.length === 0) return { data: [], error: null }
    const ids = (cats as Array<{ id: string }>).map(c => c.id)
    const { data, error } = await supabase.from('egresos').select('*').in('categoria_id', ids)
    if (error) return { data: null, error: toNormalizedError(error, 'No se pudo cargar egresos por categoría') }
    return { data, error: null }
  } catch (error) {
    return { data: null, error: toNormalizedError(error, 'No se pudo cargar egresos por categoría') }
  }
}

export const getEgresoById = async (id: string): Result<Egresos> => {
  return safeResult(() => supabase.from('egresos').select('*').eq('id', id).maybeSingle(), 'No se pudo cargar el egreso')
}

export const createEgreso = async (payload: Partial<Egresos>): Result<Egresos> => {
  if (payload.monto_usd != null && Number(payload.monto_usd) <= 0) {
    return { data: null, error: { message: 'monto_usd must be > 0' } }
  }
  if (payload.fecha_pago) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(payload.fecha_pago)
    if (!ok) return { data: null, error: { message: 'fecha_pago must be YYYY-MM-DD' } }
  }
  if (payload.periodo_nomina_ym) {
    const ok = isPeriodoYm(payload.periodo_nomina_ym)
    if (!ok) return { data: null, error: { message: 'periodo_nomina_ym must be YYYY-MM' } }
  }
  return safeResult(() => supabase.from('egresos').insert(payload).select().maybeSingle(), 'No se pudo crear el egreso')
}

/* Summaries */
export const sumIngresosBetween = async (from: string, to: string): Promise<{ total: number; error: unknown }> => {
  try {
    const { data, error } = await supabase.rpc('sum_ingresos_between', { p_from: from, p_to: to })
    if (error) {
      return { total: 0, error: toNormalizedError(error, 'No se pudo calcular el total de ingresos') }
    }
    if (!data) {
      return { total: 0, error: null }
    }

    const totalValue = Array.isArray(data)
      ? Number((data[0] as { total?: number | string } | undefined)?.total || 0)
      : Number((data as { total?: number | string }).total || 0)

    return { total: totalValue, error: null }
  } catch (error) {
    return { total: 0, error: toNormalizedError(error, 'No se pudo calcular el total de ingresos') }
  }
}

export const updateEgreso = async (id: string, payload: Partial<Egresos>): Result<Egresos> => {
  if (payload.periodo_nomina_ym) {
    const ok = isPeriodoYm(payload.periodo_nomina_ym)
    if (!ok) return { data: null, error: { message: 'periodo_nomina_ym must be YYYY-MM' } }
  }
  return safeResult(() => supabase.from('egresos').update(payload).eq('id', id).select().maybeSingle(), 'No se pudo actualizar el egreso')
}

export const deleteEgreso = async (id: string): Result<Egresos> => {
  return safeResult(() => supabase.from('egresos').delete().eq('id', id).select().maybeSingle(), 'No se pudo eliminar el egreso')
}

/* Transacciones, Cuentas, Proveedores, Socios (basic) */
export const listTransacciones = async (): Result<Transacciones[]> => {
  return safeResult(() => supabase.from('transacciones').select('*'), 'No se pudo cargar transacciones')
}

export const listCuentas = async (): Result<CuentasFinancieras[]> => {
  return safeResult(() => supabase.from('cuentas_financieras').select('*'), 'No se pudo cargar cuentas')
}

export const listProveedores = async (): Result<Proveedores[]> => {
  return safeResult(() => supabase.from('proveedores').select('*'), 'No se pudo cargar proveedores')
}

export const listSocios = async (): Result<Socios[]> => {
  return safeResult(() => supabase.from('socios').select('*'), 'No se pudo cargar socios')
}

// Export default convenience object
const hooks = {
  listAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno,
  listIngresos,
  getIngresoById,
  createIngreso,
  updateIngreso,
  deleteIngreso,
  listEgresos,
  getEgresoById,
  createEgreso,
  updateEgreso,
  deleteEgreso,
  listTransacciones,
  listCuentas,
  listProveedores,
  listSocios
}

export default hooks
