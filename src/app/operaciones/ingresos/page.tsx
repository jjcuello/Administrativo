'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Wallet, Tag, Calendar, Search } from 'lucide-react'
import { formatUSD } from '@/lib/currency'
import { useCreateIngreso, usePaginatedIngresos, useIngresosMetadata, usePeriodoEscolarActivo } from '@/lib/hooks/financeHooks'
import { updateIngreso } from '@/lib/supabaseHooks'
import { supabase } from '@/lib/supabase'

type Ingreso = {
  id?: string
  fecha_ingreso?: string
  descripcion?: string
  monto_usd?: number
  metodo_ingreso?: string | null
  estado?: string
  categoria_id?: string | null
  alumno_id?: string | null
  colegio_id?: string | null
  cuenta_destino_id?: string | null
}

type PeriodoOption = {
  id: string
  codigo?: string | null
  nombre?: string | null
  fecha_inicio?: string | null
}

const getPeriodoEtiqueta = (periodo?: Partial<PeriodoOption> | null) => (
  periodo?.codigo || periodo?.nombre || 'Sin período'
)

const CATEGORIAS_CON_ALUMNO = new Set([
  'Tarde',
  'Nucleo',
  'Particulares',
  'Virtuales',
  'Club Deportivo',
])

const CATEGORIAS_CON_COLEGIO = new Set([
  'Mañana',
])

const CATEGORIA_TRANSFERENCIA_INTERNA = 'transferencia interna'

const nombreAlumno = (nombres?: string, apellidos?: string) => {
  const nombre = `${apellidos || ''} ${nombres || ''}`.trim()
  return nombre || 'Alumno'
}

const nombreColegio = (nombre?: string) => nombre?.trim() || 'Colegio'

const normalizarTexto = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()

const esTransferenciaInternaCategoria = (nombreCategoria?: string | null) => (
  normalizarTexto(nombreCategoria || '') === CATEGORIA_TRANSFERENCIA_INTERNA
)

const getErrorText = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return 'Error desconocido'
}

const isMissingColumnError = (error: unknown, columnName: string) => {
  const text = getErrorText(error).toLowerCase()
  const normalizedColumn = columnName.toLowerCase()
  return text.includes(normalizedColumn) && (text.includes('column') || text.includes('schema cache') || text.includes('does not exist') || text.includes('no existe'))
}

export default function OperacionesIngresos() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const periodoUrlId = searchParams.get('periodo') || ''
  const { create: createIngreso } = useCreateIngreso()
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const { periodoActual, periodoActualId, loading: cargandoPeriodo, error: periodoError } = usePeriodoEscolarActivo()
  const { categorias, cuentas, alumnos, colegios, error: metadataError } = useIngresosMetadata()
  const [periodos, setPeriodos] = useState<PeriodoOption[]>([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(true)
  const [errorPeriodos, setErrorPeriodos] = useState('')
  const [estadoCopiaLink, setEstadoCopiaLink] = useState<'idle' | 'ok' | 'error'>('idle')

  const [formData, setFormData] = useState({
    fecha_ingreso: new Date().toISOString().slice(0, 10),
    descripcion: '',
    monto_usd: '',
    categoria_id: '',
    alumno_id: '',
    colegio_id: '',
    cuenta_destino_id: '',
  })

  const limpiarFormulario = () => {
    setFormData({
      fecha_ingreso: new Date().toISOString().slice(0, 10),
      descripcion: '',
      monto_usd: '',
      categoria_id: '',
      alumno_id: '',
      colegio_id: '',
      cuenta_destino_id: '',
    })
  }

  useEffect(() => {
    let activo = true

    const fetchPeriodos = async () => {
      setLoadingPeriodos(true)
      setErrorPeriodos('')

      const { data, error } = await supabase
        .from('periodos_escolares')
        .select('id, codigo, nombre, fecha_inicio')
        .is('deleted_at', null)
        .order('fecha_inicio', { ascending: false })

      if (!activo) return

      if (error) {
        setPeriodos([])
        setErrorPeriodos('No se pudo cargar la lista de períodos escolares.')
        setLoadingPeriodos(false)
        return
      }

      setPeriodos((data as PeriodoOption[] | null) ?? [])
      setLoadingPeriodos(false)
    }

    void fetchPeriodos()

    return () => {
      activo = false
    }
  }, [])

  const periodoSeleccionadoId = useMemo(() => {
    if (periodoUrlId && periodos.some((periodo) => periodo.id === periodoUrlId)) return periodoUrlId
    if (periodoActualId) return periodoActualId
    return ''
  }, [periodoUrlId, periodos, periodoActualId])

  useEffect(() => {
    if (!periodoSeleccionadoId) return
    if (periodoUrlId === periodoSeleccionadoId) return

    const nextParams = new URLSearchParams(searchParamsString)
    nextParams.set('periodo', periodoSeleccionadoId)

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [pathname, periodoSeleccionadoId, periodoUrlId, router, searchParamsString])

  // paginated ingresos hook
  const { data: pagedData, page, setPage, setTerm, total, totalPages, refresh } = usePaginatedIngresos(1, 20, '', periodoSeleccionadoId || null, !cargandoPeriodo)
  const lista = useMemo(() => (pagedData as Ingreso[] | null) ?? [], [pagedData])
  const errorCarga = periodoError
    ? getErrorText(periodoError)
    : metadataError
      ? getErrorText(metadataError)
      : ''
  const periodoActualEtiqueta = periodoActual?.codigo || periodoActual?.nombre || 'Sin período activo'

  const periodoSeleccionado = useMemo(() => {
    const periodoLista = periodos.find((periodo) => periodo.id === periodoSeleccionadoId)
    if (periodoLista) return periodoLista

    if (periodoActual?.id === periodoSeleccionadoId) {
      return periodoActual
    }

    return null
  }, [periodos, periodoSeleccionadoId, periodoActual])

  const periodoConsultaEtiqueta = getPeriodoEtiqueta(periodoSeleccionado)

  const manejarCambioPeriodo = (nextPeriodoId: string) => {
    const nextParams = new URLSearchParams(searchParamsString)

    if (nextPeriodoId) {
      nextParams.set('periodo', nextPeriodoId)
    } else {
      nextParams.delete('periodo')
    }

    const query = nextParams.toString()
    setPage(1)
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const copiarEnlacePeriodo = async () => {
    if (typeof window === 'undefined') return

    try {
      await navigator.clipboard.writeText(window.location.href)
      setEstadoCopiaLink('ok')
    } catch {
      setEstadoCopiaLink('error')
    }

    window.setTimeout(() => setEstadoCopiaLink('idle'), 2000)
  }

  const seleccionarIngreso = (i: Ingreso) => {
    setFormData({
      fecha_ingreso: i.fecha_ingreso || new Date().toISOString().slice(0, 10),
      descripcion: i.descripcion || '',
      monto_usd: i.monto_usd ? String(i.monto_usd) : '',
      categoria_id: i.categoria_id || '',
      alumno_id: i.alumno_id || '',
      colegio_id: i.colegio_id || '',
      cuenta_destino_id: i.cuenta_destino_id || '',
    })
    setEditId(i.id ?? null)
    setMensaje('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje('')

    if (!formData.descripcion.trim()) {
      setMensaje('❌ La descripcion es obligatoria')
      return
    }
    if (!formData.categoria_id || !formData.cuenta_destino_id) {
      setMensaje('❌ Selecciona categoria y cuenta destino')
      return
    }

    const categoriaSeleccionada = categorias.find(c => c.id === formData.categoria_id)?.nombre || ''
    const categoriaRequiereAlumno = CATEGORIAS_CON_ALUMNO.has(categoriaSeleccionada)
    const categoriaRequiereColegio = CATEGORIAS_CON_COLEGIO.has(categoriaSeleccionada)
    if (categoriaRequiereAlumno && !formData.alumno_id) {
      setMensaje('❌ Selecciona el alumno asociado al ingreso')
      return
    }
    if (categoriaRequiereColegio && !formData.colegio_id) {
      setMensaje('❌ Selecciona el colegio asociado al ingreso')
      return
    }

    if (Number(formData.monto_usd || 0) < 0) {
      setMensaje('❌ El monto no puede ser negativo')
      return
    }

    setCargando(true)

    const metodoIngreso = cuentas.find(c => c.id === formData.cuenta_destino_id)?.nombre?.trim() || null

    const payload = {
      fecha_ingreso: formData.fecha_ingreso,
      descripcion: formData.descripcion.trim(),
      monto_usd: parseFloat(formData.monto_usd || '0'),
      metodo_ingreso: metodoIngreso,
      estado: 'confirmado',
      categoria_id: formData.categoria_id,
      alumno_id: categoriaRequiereAlumno ? formData.alumno_id : null,
      colegio_id: categoriaRequiereColegio ? formData.colegio_id : null,
      cuenta_destino_id: formData.cuenta_destino_id,
      updated_at: new Date().toISOString(),
    }

    const guardarSinColegioSiHaceFalta = async (errorInicial: unknown) => {
      if (!payload.colegio_id || !isMissingColumnError(errorInicial, 'colegio_id')) {
        return { error: errorInicial, warning: '' }
      }

      const payloadFallback = { ...payload, colegio_id: null }
      if (editId) {
        const fallback = await updateIngreso(editId, payloadFallback)
        return {
          error: fallback.error,
          warning: fallback.error ? '' : '⚠️ Se guardó el ingreso, pero la base de datos aún no soporta vínculo estructurado con colegios. Aplica la migración v37.',
        }
      }

      const fallback = await createIngreso({ ...payloadFallback, created_at: new Date().toISOString() })
      return {
        error: fallback.error,
        warning: fallback.error ? '' : '⚠️ Se guardó el ingreso, pero la base de datos aún no soporta vínculo estructurado con colegios. Aplica la migración v37.',
      }
    }

    if (editId) {
      const { error } = await updateIngreso(editId, payload).then(r => ({ error: r.error }))
      if (error) {
        const fallback = await guardarSinColegioSiHaceFalta(error)
        if (fallback.error) setMensaje(`❌ ${getErrorText(fallback.error)}`)
        else {
          setMensaje(fallback.warning || '✅ Ingreso actualizado')
          setEditId(null)
          limpiarFormulario()
          await refresh()
        }
      }
      else {
        setMensaje('✅ Ingreso actualizado')
        setEditId(null)
        limpiarFormulario()
        await refresh()
      }
    } else {
      const res = await createIngreso({ ...payload, created_at: new Date().toISOString() })
      if (res.error) {
        const fallback = await guardarSinColegioSiHaceFalta(res.error)
        if (fallback.error) setMensaje(`❌ ${getErrorText(fallback.error)}`)
        else {
          setMensaje(fallback.warning || '✅ Ingreso registrado')
          limpiarFormulario()
          await refresh()
        }
      }
      else {
        setMensaje('✅ Ingreso registrado')
        limpiarFormulario()
        // create hook dispatches refresh event so cargar will reflect changes
        await refresh()
      }
    }

    setCargando(false)
  }

  const categoriasMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categorias) map.set(c.id, c.nombre)
    return map
  }, [categorias])

  const cuentasMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of cuentas) map.set(c.id, c.nombre)
    return map
  }, [cuentas])

  const alumnosMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const alumno of alumnos) {
      map.set(alumno.id, nombreAlumno(alumno.nombres, alumno.apellidos))
    }
    return map
  }, [alumnos])

  const colegiosMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const colegio of colegios) {
      map.set(colegio.id, nombreColegio(colegio.nombre))
    }
    return map
  }, [colegios])

  const categoriaSeleccionada = categoriasMap.get(formData.categoria_id) || ''
  const requiereAlumno = CATEGORIAS_CON_ALUMNO.has(categoriaSeleccionada)
  const requiereColegio = CATEGORIAS_CON_COLEGIO.has(categoriaSeleccionada)

  const totalIngresos = lista.reduce((acc, ingreso) => {
    const categoriaNombre = categoriasMap.get(ingreso.categoria_id || '') || ''
    if (esTransferenciaInternaCategoria(categoriaNombre)) {
      return acc
    }

    return acc + Number(ingreso.monto_usd || 0)
  }, 0)
  const formatearMonto = formatUSD

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 p-4 md:p-6 uppercase tracking-tight font-black text-black">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 md:flex-row">
      <aside className="md:w-1/5 w-full rounded-[2rem] border border-gray-200/80 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase">Resumen</h3>
        <div className="space-y-3 text-[10px]">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-gray-400 mb-1">Ingresos registrados</p>
            <p className="text-lg font-black text-black">{lista.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-gray-400 mb-1">Monto total</p>
            <p className="text-lg font-black text-black">${formatearMonto(totalIngresos)}</p>
          </div>
          {errorCarga && <p className="text-[10px] p-3 bg-red-50 text-red-700 rounded-2xl">❌ {errorCarga}</p>}
        </div>
      </aside>

      <main className="md:w-3/5 w-full rounded-[2rem] border border-gray-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-10 overflow-y-auto">
        <header className="mb-10 text-black">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button onClick={() => router.push('/operaciones')} className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-[10px] text-gray-500 shadow-sm transition-all hover:border-black hover:text-black uppercase font-black">
              <ArrowLeft size={14} /> VOLVER A OPERACIONES
            </button>
            <Link href="/gestion" className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-[10px] text-gray-500 shadow-sm transition-all hover:border-black hover:text-black uppercase font-black">
              <ArrowLeft size={14} /> VOLVER A GESTIÓN
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-black p-2 text-white shadow-lg shadow-black/20"><Wallet size={20} /></div>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">Ingresos</h1>
            {editId && (
              <span className="ml-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">EDITANDO</span>
            )}
          </div>

          <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-gray-50 p-1 text-[10px] uppercase tracking-widest shadow-sm">
            <Link href="/operaciones/ingresos" className="px-4 py-2 rounded-xl bg-black text-white font-black">
              Ingresos
            </Link>
            <Link href="/operaciones/egresos" className="px-4 py-2 rounded-xl text-gray-500 hover:text-black font-black transition-all">
              Egresos
            </Link>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[10px] uppercase tracking-widest text-gray-500 shadow-sm">
            <span className="font-black text-gray-400">Período activo:</span>
            <span className="font-black text-black">{cargandoPeriodo ? 'Cargando...' : periodoActualEtiqueta}</span>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-[10px] uppercase tracking-widest text-gray-500 shadow-sm">
            <span className="font-black text-gray-400">Período en consulta:</span>
            <span className="font-black text-black">{periodoConsultaEtiqueta}</span>
          </div>

          <div className="mt-3 w-full max-w-xl rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Enlace compartible del período actual</p>
              <button
                type="button"
                onClick={() => void copiarEnlacePeriodo()}
                className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-gray-700 transition-all hover:border-black hover:text-black"
              >
                Copiar enlace
              </button>
            </div>
            {estadoCopiaLink === 'ok' && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-green-700">✅ Enlace copiado.</p>
            )}
            {estadoCopiaLink === 'error' && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-red-700">❌ No se pudo copiar el enlace.</p>
            )}
          </div>

          <div className="mt-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Seleccionar período</p>
            <select
              value={periodoSeleccionadoId}
              onChange={(event) => manejarCambioPeriodo(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-black"
            >
              {!periodoActualId && <option value="">Sin filtro de período</option>}
              {loadingPeriodos && <option value="">Cargando períodos...</option>}
              {!loadingPeriodos && periodos.map((periodo) => (
                <option key={periodo.id} value={periodo.id}>
                  {getPeriodoEtiqueta(periodo)}
                </option>
              ))}
            </select>
          </div>

          {!cargandoPeriodo && !periodoActual && (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-[10px] text-amber-700">
              ⚠️ No hay período escolar activo. {periodoSeleccionadoId ? 'Se usa el período seleccionado en URL.' : 'Se muestran ingresos sin filtro de período.'}
            </p>
          )}

          {errorPeriodos && (
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-[10px] text-red-700">
              ❌ {errorPeriodos}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mt-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => {
                  const value = e.target.value
                  setBusqueda(value)
                  setPage(1)
                  setTerm(value)
                }}
                  placeholder="Buscar por descripcion o cuenta"
                className="w-full pl-9 pr-3 py-3 rounded-2xl border border-gray-200 bg-white text-xs shadow-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </header>

        <form onSubmit={guardar} className="space-y-5 max-w-2xl mx-auto pb-10">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-2xl space-y-4 text-black">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Fecha</span>
              <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={formData.fecha_ingreso}
                  onChange={e => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                  className="w-full bg-transparent outline-none text-sm font-bold text-black"
                />
              </div>
            </label>

            <input
              required
              placeholder="DESCRIPCION DEL INGRESO"
              className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none"
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Categoria</span>
                <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <Tag size={16} className="text-gray-400" />
                  <select
                    value={formData.categoria_id}
                    onChange={e => {
                      const categoriaId = e.target.value
                      const categoriaNombre = categoriasMap.get(categoriaId) || ''
                      const categoriaExigeAlumno = CATEGORIAS_CON_ALUMNO.has(categoriaNombre)
                      const categoriaExigeColegio = CATEGORIAS_CON_COLEGIO.has(categoriaNombre)
                      setFormData(prev => ({
                        ...prev,
                        categoria_id: categoriaId,
                        alumno_id: categoriaExigeAlumno ? prev.alumno_id : '',
                        colegio_id: categoriaExigeColegio ? prev.colegio_id : '',
                      }))
                    }}
                    className="w-full bg-transparent outline-none text-sm font-bold text-black"
                  >
                    <option value="">Seleccionar</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Cuenta destino</span>
                <select
                  value={formData.cuenta_destino_id}
                  onChange={e => setFormData({ ...formData, cuenta_destino_id: e.target.value })}
                  className="mt-2 w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none"
                >
                  <option value="">Seleccionar</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
            </div>

            {(requiereAlumno || requiereColegio) && (
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">{requiereColegio ? 'Colegio' : 'Alumno'}</span>
                <select
                  value={requiereColegio ? formData.colegio_id : formData.alumno_id}
                  onChange={e => setFormData({
                    ...formData,
                    alumno_id: requiereColegio ? formData.alumno_id : e.target.value,
                    colegio_id: requiereColegio ? e.target.value : formData.colegio_id,
                  })}
                  className="mt-2 w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none"
                >
                  <option value="">{requiereColegio ? 'Seleccionar colegio' : 'Seleccionar alumno'}</option>
                  {requiereColegio
                    ? colegios.map(colegio => (
                      <option key={colegio.id} value={colegio.id}>{nombreColegio(colegio.nombre)}</option>
                    ))
                    : alumnos.map(alumno => (
                      <option key={alumno.id} value={alumno.id}>{nombreAlumno(alumno.nombres, alumno.apellidos)}</option>
                    ))}
                </select>
                {requiereAlumno && alumnos.length === 0 && (
                  <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 rounded-xl p-3">
                    ⚠️ No hay alumnos activos para asociar a esta categoría.
                  </p>
                )}
                {requiereColegio && colegios.length === 0 && (
                  <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 rounded-xl p-3">
                    ⚠️ No hay colegios activos para asociar a esta categoría.
                  </p>
                )}
              </label>
            )}

            <input
              required
              type="number"
              step="0.01"
              placeholder="MONTO USD"
              className="w-full bg-gray-50 rounded-xl p-4 text-sm font-black border-none"
              value={formData.monto_usd}
              onChange={e => setFormData({ ...formData, monto_usd: e.target.value })}
            />
          </div>

          <div className="flex gap-4">
            <button disabled={cargando} className="flex-1 bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-gray-900 disabled:opacity-70 disabled:cursor-not-allowed">
              {cargando ? <Loader2 className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><Save size={18}/> {editId ? 'ACTUALIZAR INGRESO' : 'REGISTRAR INGRESO'}</span>}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); limpiarFormulario(); }} className="w-36 bg-white text-black py-5 rounded-2xl font-black italic border border-gray-200 hover:bg-gray-100 transition-all">CANCELAR</button>
            )}
          </div>
          {mensaje && <p className={`text-center text-[10px] p-4 rounded-2xl ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{mensaje}</p>}
        </form>
      </main>

      <aside className="md:w-1/5 w-full rounded-[2rem] border border-gray-200/80 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2 font-black uppercase">Ingresos ({total ?? lista.length})</h3>
        <div className="space-y-3">
          {lista.map((i) => (
            <div key={i.id} onClick={() => seleccionarIngreso(i)} className={`p-5 rounded-3xl border transition-all cursor-pointer ${editId === i.id ? 'bg-black text-white border-black shadow-xl shadow-black/20' : 'bg-white border-gray-200 shadow-sm hover:shadow-xl'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm uppercase leading-tight font-black">{i.descripcion || 'Ingreso'}</p>
              </div>
              <p className="text-[9px] mt-2 text-gray-400 uppercase">{categoriasMap.get(i.categoria_id || '') || 'Sin categoria'}</p>
              {i.alumno_id && (
                <p className="text-[9px] text-gray-400 uppercase">{alumnosMap.get(i.alumno_id) || 'Alumno no disponible'}</p>
              )}
              {i.colegio_id && (
                <p className="text-[9px] text-gray-400 uppercase">{colegiosMap.get(i.colegio_id) || 'Colegio no disponible'}</p>
              )}
              <p className="text-[9px] text-gray-400 uppercase">{cuentasMap.get(i.cuenta_destino_id || '') || 'Sin cuenta'}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px] uppercase text-gray-400">{i.fecha_ingreso}</span>
                <span className="text-lg italic tracking-tighter font-black text-black">${formatearMonto(i.monto_usd)}</span>
              </div>
            </div>
          ))}
          {lista.length === 0 && (
            <div className="text-center p-8 border border-dashed border-gray-200 rounded-3xl">
              <p className="text-xs text-gray-400 italic lowercase">No hay ingresos registrados.</p>
            </div>
          )}
          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))} className="px-3 py-2 bg-white border rounded-xl">Anterior</button>
              <button disabled={totalPages !== null && page >= (totalPages || 1)} onClick={() => setPage(page + 1)} className="px-3 py-2 bg-white border rounded-xl">Siguiente</button>
            </div>
            <div className="text-[12px] text-gray-500">
              Página {page}{totalPages ? ` / ${totalPages}` : ''}
            </div>
          </div>
        </div>
      </aside>
      </div>
    </div>
  )
}
