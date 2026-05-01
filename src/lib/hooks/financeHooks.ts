import { useState, useEffect, useCallback } from 'react'
import {
  listIngresos,
  listIngresosPaginated,
  createIngreso,
  listEgresos,
  createEgreso
} from '../supabaseHooks'
import { supabase } from '../supabase'
import type { Ingresos, Egresos } from '../dbTypes'

type HookError = unknown
type CategoriaIngresoMeta = { id: string; nombre: string }
type CategoriaEgresoMeta = { id: string; nombre: string }
type CuentaMeta = { id: string; nombre: string }
type AlumnoMeta = { id: string; nombres?: string; apellidos?: string }
type ColegioMeta = { id: string; nombre?: string; tipo?: string | null }
type ProveedorMeta = {
  id: string
  nombre?: string
  nombre_comercial?: string
  destino_contable_egresos?: 'administrativo' | 'operativo' | 'proveedores'
}
type ProfesorMeta = { id: string; nombres?: string; apellidos?: string; cargo?: string }
type CategoriaIngresoSeed = { nombre: string; descripcion: string }
type PeriodoEscolarActivoMeta = { id: string; codigo?: string | null; nombre?: string | null }

const ORDEN_CUENTAS_PREFERIDO = [
  'efectivo',
  'banco provincial',
  'pago movil',
  'patria',
  'fondos extranjeros',
  'binance',
  'banco exterior',
]

const CATEGORIAS_INGRESO_FIJAS: CategoriaIngresoSeed[] = [
  { nombre: 'Mañana', descripcion: 'Ingresos asociados al turno de mañana' },
  { nombre: 'Tarde', descripcion: 'Ingresos asociados al turno de tarde' },
  { nombre: 'Torneo', descripcion: 'Ingresos asociados a torneos y eventos competitivos' },
  { nombre: 'Nucleo', descripcion: 'Ingresos por actividades de núcleo' },
  { nombre: 'Particulares', descripcion: 'Ingresos por clases particulares' },
  { nombre: 'Virtuales', descripcion: 'Ingresos por clases virtuales' },
  { nombre: 'Club Deportivo', descripcion: 'Ingresos provenientes del club deportivo' },
  { nombre: 'Aporte Capital', descripcion: 'Aportes de capital registrados como ingreso' },
  { nombre: 'Donaciones', descripcion: 'Donaciones y contribuciones' },
  { nombre: 'Transferencia Interna', descripcion: 'Traspasos entre cuentas propias que no representan ingresos operativos' },
]

const normalizeText = (value: string) => (
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-VE')
)

const ordenarCuentasPreferidas = (cuentas: CuentaMeta[]) => {
  const rankByName = new Map(ORDEN_CUENTAS_PREFERIDO.map((name, index) => [name, index]))

  return [...cuentas].sort((a, b) => {
    const aName = normalizeText(a.nombre || '')
    const bName = normalizeText(b.nombre || '')
    const aRank = rankByName.has(aName) ? (rankByName.get(aName) as number) : Number.MAX_SAFE_INTEGER
    const bRank = rankByName.has(bName) ? (rankByName.get(bName) as number) : Number.MAX_SAFE_INTEGER

    if (aRank !== bRank) return aRank - bRank
    return aName.localeCompare(bName, 'es')
  })
}

const buildCategoriasIngresoOrdenadas = (categoriasRaw: CategoriaIngresoMeta[]) => {
  const categoriasByNombre = new Map<string, CategoriaIngresoMeta>()

  for (const categoria of categoriasRaw) {
    const key = normalizeText(categoria.nombre)
    if (!categoriasByNombre.has(key)) {
      categoriasByNombre.set(key, categoria)
    }
  }

  const ordenadas: CategoriaIngresoMeta[] = []
  const faltantes: CategoriaIngresoSeed[] = []

  for (const categoria of CATEGORIAS_INGRESO_FIJAS) {
    const key = normalizeText(categoria.nombre)
    const existente = categoriasByNombre.get(key)
    if (existente) {
      ordenadas.push({ id: existente.id, nombre: categoria.nombre })
    } else {
      faltantes.push(categoria)
    }
  }

  return { ordenadas, faltantes }
}

export function useListIngresos() {
  const [data, setData] = useState<Ingresos[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<HookError>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await listIngresos()
    setData((data as Ingresos[] | null) ?? null)
    setError(error)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetch])

  useEffect(() => {
    const onRefresh = () => fetch()
    window.addEventListener('ingresos:refresh', onRefresh)
    return () => window.removeEventListener('ingresos:refresh', onRefresh)
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}

export function usePeriodoEscolarActivo() {
  const [periodoActual, setPeriodoActual] = useState<PeriodoEscolarActivoMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<HookError>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let nextError: HookError = null
    let nextPeriodo: PeriodoEscolarActivoMeta | null = null

    const { data: actuales, error: actualesErr } = await supabase
      .from('periodos_escolares')
      .select('id, codigo, nombre, updated_at')
      .is('deleted_at', null)
      .eq('es_actual', true)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (actualesErr) {
      nextError = actualesErr
    } else if (actuales && actuales.length > 0) {
      nextPeriodo = actuales[0] as PeriodoEscolarActivoMeta
    } else {
      const hoy = new Date().toISOString().slice(0, 10)
      const { data: porFecha, error: porFechaErr } = await supabase
        .from('periodos_escolares')
        .select('id, codigo, nombre, fecha_inicio')
        .is('deleted_at', null)
        .lte('fecha_inicio', hoy)
        .gte('fecha_fin', hoy)
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      if (porFechaErr) {
        nextError = porFechaErr
      } else if (porFecha && porFecha.length > 0) {
        nextPeriodo = porFecha[0] as PeriodoEscolarActivoMeta
      }
    }

    setPeriodoActual(nextPeriodo)
    setError(nextError)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetch])

  return {
    periodoActual,
    periodoActualId: periodoActual?.id ?? null,
    loading,
    error,
    refresh: fetch,
  }
}

export function usePaginatedIngresos(
  initialPage = 1,
  initialPerPage = 20,
  initialTerm = '',
  periodoEscolarId?: string | null,
  enabled = true,
) {
  const [data, setData] = useState<Ingresos[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<HookError>(null)
  const [page, setPage] = useState(initialPage)
  const [perPage, setPerPage] = useState(initialPerPage)
  const [total, setTotal] = useState<number | null>(null)
  const [term, setTerm] = useState(initialTerm)

  const fetch = useCallback(async (p = page, pp = perPage, q = term) => {
    if (!enabled) {
      return
    }
    setLoading(true)
    const { data, error, count } = await listIngresosPaginated(p, pp, q, periodoEscolarId)
    setData(data)
    setError(error)
    setTotal(count)
    setLoading(false)
  }, [page, perPage, term, periodoEscolarId, enabled])

  useEffect(() => {
    const onRefresh = () => {
      void fetch(page, perPage, term)
    }
    window.addEventListener('ingresos:refresh', onRefresh)
    return () => window.removeEventListener('ingresos:refresh', onRefresh)
  }, [fetch, page, perPage, term])

  // when page/perPage/term change, refetch
  useEffect(() => {
    if (!enabled) {
      return
    }
    const timer = setTimeout(() => {
      void fetch(page, perPage, term)
    }, 0)
    return () => clearTimeout(timer)
  }, [page, perPage, term, fetch, enabled])

  const totalPages = total ? Math.max(1, Math.ceil(total / perPage)) : null

  return { data, loading, error, page, perPage, setPage, setPerPage, setTerm, total, totalPages, refresh: fetch }
}

export function useCreateIngreso() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<HookError>(null)

  const create = useCallback(async (payload: Partial<Ingresos>) => {
    setLoading(true)
    const { data, error } = await createIngreso(payload)
    setError(error)
    setLoading(false)
    if (!error) window.dispatchEvent(new CustomEvent('ingresos:refresh'))
    return { data, error }
  }, [])

  return { create, loading, error }
}

export function useIngresosMetadata() {
  const [categorias, setCategorias] = useState<CategoriaIngresoMeta[]>([])
  const [cuentas, setCuentas] = useState<CuentaMeta[]>([])
  const [alumnos, setAlumnos] = useState<AlumnoMeta[]>([])
  const [colegios, setColegios] = useState<ColegioMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<HookError>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let nextError: HookError = null

    const categoriasQuery = () => supabase
      .from('categorias_ingreso')
      .select('id, nombre')
      .is('deleted_at', null)
      .order('nombre')

    const { data: cat, error: catErr } = await categoriasQuery()
    if (catErr) nextError = catErr
    if (cat) {
      const categoriasRaw = cat as CategoriaIngresoMeta[]
      const { ordenadas, faltantes } = buildCategoriasIngresoOrdenadas(categoriasRaw)
      const faltantesLabel = faltantes.map((categoria) => categoria.nombre).join(', ')

      setCategorias(ordenadas)

      if (ordenadas.length === 0 && !nextError) {
        nextError = { message: 'No se pudo inicializar categorías de ingresos. Ejecuta primero v18 (setup base) y luego v35 (transferencias internas).' }
      } else if (faltantes.length > 0 && !nextError) {
        nextError = { message: `Faltan categorías de ingresos (${faltantesLabel}). Ejecuta la migración v35 de transferencias internas; si falta el catálogo base, corre antes v18.` }
      }
    }

    const { data: ctas, error: ctaErr } = await supabase
      .from('cuentas_financieras')
      .select('id, nombre')
      .is('deleted_at', null)
      .order('nombre')
    if (ctaErr && !nextError) nextError = ctaErr
    if (ctas) setCuentas(ordenarCuentasPreferidas(ctas as CuentaMeta[]))

    const { data: alums, error: alumErr } = await supabase
      .from('alumnos')
      .select('id, nombres, apellidos')
      .is('deleted_at', null)
      .order('apellidos')
      .order('nombres')
    if (alumErr && !nextError) nextError = alumErr
    if (alums) setAlumnos(alums as AlumnoMeta[])

    const { data: cols, error: colErr } = await supabase
      .from('colegios')
      .select('id, nombre, tipo')
      .order('nombre')
    if (colErr && !nextError) nextError = colErr
    if (cols) {
      setColegios((cols as ColegioMeta[]).filter((colegio) => (colegio.tipo || 'colegio') !== 'club'))
    }

    setError(nextError)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetch])

  return { categorias, cuentas, alumnos, colegios, loading, error, refresh: fetch }
}

export function useListEgresos(periodoEscolarId?: string | null, enabled = true) {
  const [data, setData] = useState<Egresos[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<HookError>(null)

  const fetch = useCallback(async () => {
    if (!enabled) {
      return
    }
    setLoading(true)
    const { data, error } = await listEgresos(periodoEscolarId)
    setData((data as Egresos[] | null) ?? null)
    setError(error)
    setLoading(false)
  }, [periodoEscolarId, enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }
    const timer = setTimeout(() => {
      void fetch()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetch, enabled])

  useEffect(() => {
    const onRefresh = () => fetch()
    window.addEventListener('egresos:refresh', onRefresh)
    return () => window.removeEventListener('egresos:refresh', onRefresh)
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}

export function useCreateEgreso() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<HookError>(null)

  const create = useCallback(async (payload: Partial<Egresos>) => {
    setLoading(true)
    const { data, error } = await createEgreso(payload)
    setError(error)
    setLoading(false)
    if (!error) window.dispatchEvent(new CustomEvent('egresos:refresh'))
    return { data, error }
  }, [])

  return { create, loading, error }
}

export function useEgresosMetadata() {
  const [categorias, setCategorias] = useState<CategoriaEgresoMeta[]>([])
  const [cuentas, setCuentas] = useState<CuentaMeta[]>([])
  const [proveedores, setProveedores] = useState<ProveedorMeta[]>([])
  const [profesores, setProfesores] = useState<ProfesorMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<HookError>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let nextError: HookError = null

    const { data: cat, error: catErr } = await supabase
      .from('categorias_egreso')
      .select('id, nombre')
      .is('deleted_at', null)
      .order('nombre')
    if (catErr) nextError = catErr
    if (cat) setCategorias(cat as CategoriaEgresoMeta[])

    const { data: ctas, error: ctaErr } = await supabase
      .from('cuentas_financieras')
      .select('id, nombre')
      .is('deleted_at', null)
      .order('nombre')
    if (ctaErr && !nextError) nextError = ctaErr
    if (ctas) setCuentas(ordenarCuentasPreferidas(ctas as CuentaMeta[]))

    const { data: provs, error: provErr } = await supabase
      .from('proveedores')
      .select('id, nombre, nombre_comercial, destino_contable_egresos')
      .is('deleted_at', null)
      .order('nombre_comercial')
    if (provErr && !nextError) nextError = provErr
    if (provs) setProveedores(provs as ProveedorMeta[])

    const { data: profes, error: profesErr } = await supabase
      .from('personal')
      .select('id, nombres, apellidos, cargo')
      .eq('estado', 'activo')
      .order('apellidos')
      .order('nombres')
    if (profesErr && !nextError) nextError = profesErr
    if (profes) {
      setProfesores(profes as ProfesorMeta[])
    }

    setError(nextError)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetch])

  return { categorias, cuentas, proveedores, profesores, loading, error, refresh: fetch }
}

const financeHooks = {
  useListIngresos,
  useCreateIngreso,
  useIngresosMetadata,
  useListEgresos,
  useCreateEgreso,
  useEgresosMetadata
}

export default financeHooks
