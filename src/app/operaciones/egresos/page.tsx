'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import useDebounce from '@/lib/useDebounce'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Clipboard, Tag, Calendar, Search } from 'lucide-react'
import { formatUSD } from '@/lib/currency'
import { useCreateEgreso, useEgresosMetadata, useListEgresos, usePeriodoEscolarActivo } from '@/lib/hooks/financeHooks'
import { updateEgreso } from '@/lib/supabaseHooks'
import { supabase } from '@/lib/supabase'

type Egreso = {
  id?: string
  cuenta_id?: string
  categoria_id?: string
  socio_id?: string
  profesor_id?: string | null
  periodo_nomina_ym?: string | null
  monto_usd?: number
  fecha_pago?: string
  beneficiario?: string
  referencia?: string
  observaciones?: string
  periodo_id?: string
  registrado_por?: string
  proveedor_id?: string
  proveedor_otro?: string | null
  created_at?: string
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

const PROVEEDOR_OTROS = '__otros__'
const CATEGORIAS_CON_PROVEEDOR = ['inventario', 'suministro', 'uniforme']
const CATEGORIAS_CON_PROFESOR = ['nomina base', 'nomina extra']
const CATEGORIA_TRANSFERENCIA_INTERNA = 'transferencia interna'
const PERIODO_NOMINA_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

const getPeriodoYmFromDate = (value?: string | null) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.slice(0, 7)
  }

  return new Date().toISOString().slice(0, 7)
}

const normalizarTexto = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const categoriaUsaProveedor = (nombreCategoria: string) => {
  const nombreNormalizado = normalizarTexto(nombreCategoria)
  return CATEGORIAS_CON_PROVEEDOR.some(keyword => nombreNormalizado.includes(keyword))
}

const categoriaUsaProfesor = (nombreCategoria: string) => {
  const nombreNormalizado = normalizarTexto(nombreCategoria)
  return CATEGORIAS_CON_PROFESOR.some(keyword => nombreNormalizado.includes(keyword))
}

const categoriaEsTransferenciaInterna = (nombreCategoria: string) => {
  return normalizarTexto(nombreCategoria) === CATEGORIA_TRANSFERENCIA_INTERNA
}

const getProfesorNombre = (nombres?: string, apellidos?: string) => {
  return `${apellidos || ''} ${nombres || ''}`.replace(/\s+/g, ' ').trim()
}

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

export default function OperacionesEgresos() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const periodoUrlId = searchParams.get('periodo') || ''
  const { create: createEgreso } = useCreateEgreso()
  const [periodos, setPeriodos] = useState<PeriodoOption[]>([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(true)
  const [errorPeriodos, setErrorPeriodos] = useState('')
  const [estadoCopiaLink, setEstadoCopiaLink] = useState<'idle' | 'ok' | 'error'>('idle')
  const { periodoActual, periodoActualId, loading: cargandoPeriodo, error: periodoError } = usePeriodoEscolarActivo()
  const periodoSeleccionadoId = useMemo(() => {
    if (periodoUrlId && periodos.some((periodo) => periodo.id === periodoUrlId)) return periodoUrlId
    if (periodoActualId) return periodoActualId
    return ''
  }, [periodoUrlId, periodos, periodoActualId])
  const { data: egresosData, error: egresosError, refresh: refreshEgresos } = useListEgresos(periodoSeleccionadoId || null, !cargandoPeriodo)
  const { categorias, cuentas, proveedores, profesores, error: metadataError } = useEgresosMetadata()
  const [busqueda, setBusqueda] = useState('')
  const debounced = useDebounce(busqueda, 350)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fecha_pago: new Date().toISOString().slice(0, 10),
    periodo_nomina_ym: new Date().toISOString().slice(0, 7),
    monto_usd: '',
    categoria_id: '',
    cuenta_id: '',
    proveedor_id: '',
    proveedor_otro: '',
    profesor_id: '',
    descripcion: '',
  })

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

  useEffect(() => {
    if (!periodoSeleccionadoId) return
    if (periodoUrlId === periodoSeleccionadoId) return

    const nextParams = new URLSearchParams(searchParamsString)
    nextParams.set('periodo', periodoSeleccionadoId)

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [pathname, periodoSeleccionadoId, periodoUrlId, router, searchParamsString])

  const limpiarFormulario = () => {
    setFormData({
      fecha_pago: new Date().toISOString().slice(0, 10),
      periodo_nomina_ym: new Date().toISOString().slice(0, 7),
      monto_usd: '',
      categoria_id: '',
      cuenta_id: '',
      proveedor_id: '',
      proveedor_otro: '',
      profesor_id: '',
      descripcion: '',
    })
  }

  const lista = useMemo(() => {
    const base = (egresosData as Egreso[] | null) ?? []
    const term = debounced.trim().toLowerCase()
    if (!term) return base

    return base.filter((egreso) => {
      const descripcion = (egreso.observaciones || '').toLowerCase()
      const proveedorOtro = (egreso.proveedor_otro || egreso.beneficiario || '').toLowerCase()
      return (
        descripcion.includes(term)
        || proveedorOtro.includes(term)
      )
    })
  }, [egresosData, debounced])

  const errorCarga = egresosError
    ? getErrorText(egresosError)
    : periodoError
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

  const categoriaActual = useMemo(
    () => categorias.find(categoria => categoria.id === formData.categoria_id)?.nombre || '',
    [categorias, formData.categoria_id]
  )

  const mostrarProveedor = useMemo(
    () => categoriaUsaProveedor(categoriaActual),
    [categoriaActual]
  )

  const mostrarProfesor = useMemo(
    () => categoriaUsaProfesor(categoriaActual),
    [categoriaActual]
  )

  const profesoresMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const profesor of profesores) {
      map.set(profesor.id, getProfesorNombre(profesor.nombres, profesor.apellidos))
    }
    return map
  }, [profesores])

  const profesorPorNombreMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const profesor of profesores) {
      const nombre = getProfesorNombre(profesor.nombres, profesor.apellidos)
      if (nombre) map.set(normalizarTexto(nombre), profesor.id)
    }
    return map
  }, [profesores])

  const seleccionar = (e: Egreso) => {
    const proveedorOtroGuardado = (e.proveedor_otro || e.beneficiario || '').trim()
    const proveedorEsOtro = !e.proveedor_id && !!proveedorOtroGuardado
    const categoriaNombreSeleccionada = categorias.find(c => c.id === e.categoria_id)?.nombre || ''
    const usaProfesor = categoriaUsaProfesor(categoriaNombreSeleccionada)
    const profesorIdGuardado = usaProfesor
      ? (e.profesor_id || (e.beneficiario ? (profesorPorNombreMap.get(normalizarTexto(e.beneficiario)) || '') : ''))
      : ''

    setFormData({
      fecha_pago: e.fecha_pago || new Date().toISOString().slice(0, 10),
      periodo_nomina_ym: e.periodo_nomina_ym || getPeriodoYmFromDate(e.fecha_pago),
      monto_usd: e.monto_usd ? String(e.monto_usd) : '',
      categoria_id: e.categoria_id || '',
      cuenta_id: e.cuenta_id || '',
      proveedor_id: proveedorEsOtro ? PROVEEDOR_OTROS : (e.proveedor_id || ''),
      proveedor_otro: proveedorEsOtro ? proveedorOtroGuardado : '',
      profesor_id: profesorIdGuardado,
      descripcion: e.observaciones || '',
    })
    setEditId(e.id ?? null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMensaje('')
  }

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setMensaje('')
    if (!formData.categoria_id || !formData.cuenta_id) {
      setMensaje('❌ Selecciona categoria y cuenta')
      return
    }
    if (mostrarProveedor && formData.proveedor_id === PROVEEDOR_OTROS && !formData.proveedor_otro.trim()) {
      setMensaje('❌ Escribe el proveedor cuando selecciones "Otros"')
      return
    }
    if (mostrarProfesor && !formData.profesor_id) {
      setMensaje('❌ Selecciona el empleado para la nómina')
      return
    }
    if (mostrarProfesor && !PERIODO_NOMINA_REGEX.test(formData.periodo_nomina_ym)) {
      setMensaje('❌ Define el período de nómina (AAAA-MM) para este egreso')
      return
    }
    if (Number(formData.monto_usd || 0) < 0) {
      setMensaje('❌ El monto no puede ser negativo')
      return
    }

    setCargando(true)

    const nombreProfesorSeleccionado = mostrarProfesor
      ? (profesoresMap.get(formData.profesor_id) || null)
      : null

    const payload = {
      fecha_pago: formData.fecha_pago,
      monto_usd: parseFloat(formData.monto_usd || '0'),
      categoria_id: formData.categoria_id,
      cuenta_id: formData.cuenta_id,
      profesor_id: mostrarProfesor
        ? (formData.profesor_id || null)
        : null,
      periodo_nomina_ym: mostrarProfesor
        ? formData.periodo_nomina_ym
        : null,
      proveedor_id: mostrarProveedor && formData.proveedor_id && formData.proveedor_id !== PROVEEDOR_OTROS
        ? formData.proveedor_id
        : null,
      proveedor_otro: mostrarProveedor && formData.proveedor_id === PROVEEDOR_OTROS
        ? formData.proveedor_otro.trim() || null
        : null,
      beneficiario: nombreProfesorSeleccionado,
      observaciones: formData.descripcion.trim() || null,
    }

    if (editId) {
      const { error } = await updateEgreso(editId, payload).then(r => ({ error: r.error }))
      if (error) setMensaje(`❌ ${getErrorText(error)}`)
      else {
        setMensaje('✅ Egreso actualizado')
        setEditId(null)
        limpiarFormulario()
        window.dispatchEvent(new CustomEvent('egresos:refresh'))
        await refreshEgresos()
      }
    } else {
      const res = await createEgreso({ ...payload, created_at: new Date().toISOString() })
      if (res.error) setMensaje(`❌ ${getErrorText(res.error)}`)
      else {
        setMensaje('✅ Egreso registrado')
        limpiarFormulario()
        window.dispatchEvent(new CustomEvent('egresos:refresh'))
        await refreshEgresos()
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

  const proveedoresMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of proveedores) map.set(p.id, p.nombre_comercial || '')
    return map
  }, [proveedores])

  const total = lista.reduce((acc, egreso) => {
    const categoriaNombre = categoriasMap.get(egreso.categoria_id || '') || ''
    if (categoriaEsTransferenciaInterna(categoriaNombre)) {
      return acc
    }

    return acc + Number(egreso.monto_usd || 0)
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 p-4 md:p-6 uppercase tracking-tight font-black text-black">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 md:flex-row">
      <aside className="md:w-1/5 w-full rounded-[2rem] border border-gray-200/80 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase">Resumen</h3>
        <div className="space-y-3 text-[10px]">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-gray-400 mb-1">Egresos registrados</p>
            <p className="text-lg font-black text-black">{lista.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-gray-400 mb-1">Monto total</p>
            <p className="text-lg font-black text-black">${formatUSD(total)}</p>
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
            <div className="rounded-xl bg-black p-2 text-white shadow-lg shadow-black/20"><Clipboard size={20} /></div>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">Egresos</h1>
            {editId && (
              <span className="ml-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">EDITANDO</span>
            )}
          </div>

          <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-gray-50 p-1 text-[10px] uppercase tracking-widest shadow-sm">
            <Link href="/operaciones/ingresos" className="px-4 py-2 rounded-xl text-gray-500 hover:text-black font-black transition-all">
              Ingresos
            </Link>
            <Link href="/operaciones/egresos" className="px-4 py-2 rounded-xl bg-black text-white font-black">
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
              ⚠️ No hay período escolar activo. {periodoSeleccionadoId ? 'Se usa el período seleccionado en URL.' : 'Se muestran egresos sin filtro de período.'}
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
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por descripción, proveedor o empleado"
                className="w-full pl-9 pr-3 py-3 rounded-2xl border border-gray-200 bg-white text-xs shadow-sm outline-none focus:border-black"
              />
            </div>
          </div>
        </header>

        <form onSubmit={guardar} className="space-y-5 max-w-2xl mx-auto pb-10">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-2xl space-y-4 text-black">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Fecha</span>
                <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <Calendar size={16} className="text-gray-400" />
                  <input
                    type="date"
                    value={formData.fecha_pago}
                    onChange={e => setFormData({ ...formData, fecha_pago: e.target.value })}
                    className="w-full bg-transparent outline-none text-sm font-bold text-black"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Categoria</span>
                <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <Tag size={16} className="text-gray-400" />
                  <select
                    value={formData.categoria_id}
                    onChange={e => {
                      const categoriaId = e.target.value
                      const categoriaNombre = categorias.find(c => c.id === categoriaId)?.nombre || ''
                      const puedeSeleccionarProveedor = categoriaUsaProveedor(categoriaNombre)
                      const puedeSeleccionarProfesor = categoriaUsaProfesor(categoriaNombre)

                      setFormData({
                        ...formData,
                        categoria_id: categoriaId,
                        periodo_nomina_ym: puedeSeleccionarProfesor
                          ? (formData.periodo_nomina_ym || getPeriodoYmFromDate(formData.fecha_pago))
                          : '',
                        proveedor_id: puedeSeleccionarProveedor ? formData.proveedor_id : '',
                        proveedor_otro: puedeSeleccionarProveedor ? formData.proveedor_otro : '',
                        profesor_id: puedeSeleccionarProfesor ? formData.profesor_id : '',
                      })
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
            </div>

            <input
              required
              type="number"
              step="0.01"
              placeholder="MONTO USD"
              className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none"
              value={formData.monto_usd}
              onChange={e => setFormData({ ...formData, monto_usd: e.target.value })}
            />

            <div className={`grid grid-cols-1 gap-4 ${mostrarProveedor || mostrarProfesor ? 'md:grid-cols-2' : ''}`}>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Cuenta origen</span>
                <select
                  value={formData.cuenta_id}
                  onChange={e => setFormData({ ...formData, cuenta_id: e.target.value })}
                  className="mt-2 w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none"
                >
                  <option value="">Seleccionar</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              {mostrarProveedor && (
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Proveedor</span>
                  <select
                    value={formData.proveedor_id}
                    onChange={e => setFormData({
                      ...formData,
                      proveedor_id: e.target.value,
                      proveedor_otro: e.target.value === PROVEEDOR_OTROS ? formData.proveedor_otro : ''
                    })}
                    className="mt-2 w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none"
                  >
                    <option value="">Seleccionar</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre_comercial || p.id}</option>
                    ))}
                    <option value={PROVEEDOR_OTROS}>Otros (sin proveedor fijo)</option>
                  </select>
                </label>
              )}
              {mostrarProfesor && (
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Empleado</span>
                  <select
                    value={formData.profesor_id}
                    onChange={e => setFormData({ ...formData, profesor_id: e.target.value })}
                    className="mt-2 w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none"
                  >
                    <option value="">Seleccionar</option>
                    {profesores.map(p => (
                      <option key={p.id} value={p.id}>{getProfesorNombre(p.nombres, p.apellidos)}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {mostrarProfesor && (
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Período de nómina</span>
                <input
                  type="month"
                  value={formData.periodo_nomina_ym}
                  onChange={e => setFormData({ ...formData, periodo_nomina_ym: e.target.value })}
                  className="mt-2 w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none"
                />
              </label>
            )}

            {mostrarProveedor && formData.proveedor_id === PROVEEDOR_OTROS && (
              <input
                placeholder="PROVEEDOR (OTROS)"
                className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none"
                value={formData.proveedor_otro}
                onChange={e => setFormData({ ...formData, proveedor_otro: e.target.value })}
              />
            )}

            <textarea
              placeholder="DESCRIPCIÓN"
              className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none"
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          <div className="flex gap-4">
            <button disabled={cargando} className="flex-1 bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-gray-900 disabled:opacity-70 disabled:cursor-not-allowed">
              {cargando ? <Loader2 className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><Save size={18}/> {editId ? 'ACTUALIZAR EGRESO' : 'REGISTRAR EGRESO'}</span>}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); limpiarFormulario(); }} className="w-36 bg-white text-black py-5 rounded-2xl font-black italic border border-gray-200 hover:bg-gray-100 transition-all">CANCELAR</button>
            )}
          </div>
          {mensaje && <p className={`text-center text-[10px] p-4 rounded-2xl ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{mensaje}</p>}
        </form>
      </main>

      <aside className="md:w-1/5 w-full rounded-[2rem] border border-gray-200/80 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2 font-black uppercase">Egresos ({lista.length})</h3>
        <div className="space-y-3">
          {lista.map((e) => (
            <div key={e.id} onClick={() => seleccionar(e)} className={`p-5 rounded-3xl border transition-all cursor-pointer ${editId === e.id ? 'bg-black text-white border-black shadow-xl shadow-black/20' : 'bg-white border-gray-200 shadow-sm hover:shadow-xl'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm uppercase leading-tight font-black">{e.observaciones || 'Egreso'}</p>
                <span className={`text-[8px] px-2 py-1 rounded-full uppercase ${e.monto_usd && e.monto_usd > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>EGRESO</span>
              </div>
              <p className="text-[9px] mt-2 text-gray-400 uppercase">{categoriasMap.get(e.categoria_id || '') || 'Sin categoria'}</p>
              <p className="text-[9px] text-gray-400 uppercase">{cuentasMap.get(e.cuenta_id || '') || 'Sin cuenta'}</p>
              <p className="text-[9px] text-gray-400 uppercase">
                {categoriaUsaProfesor(categoriasMap.get(e.categoria_id || '') || '')
                  ? (((e.profesor_id && profesoresMap.get(e.profesor_id)) || e.beneficiario)
                    ? `Empleado: ${(e.profesor_id && profesoresMap.get(e.profesor_id)) || e.beneficiario}`
                    : '')
                  : (proveedoresMap.get(e.proveedor_id || '') || ((e.proveedor_otro || e.beneficiario) ? `Otros: ${e.proveedor_otro || e.beneficiario}` : ''))}
              </p>
              {categoriaUsaProfesor(categoriasMap.get(e.categoria_id || '') || '') && e.periodo_nomina_ym && (
                <p className="text-[9px] text-gray-400 uppercase">Período nómina: {e.periodo_nomina_ym}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px] uppercase text-gray-400">{e.fecha_pago}</span>
                <span className="text-lg italic tracking-tighter font-black text-black">${formatUSD(e.monto_usd)}</span>
              </div>
            </div>
          ))}
          {lista.length === 0 && (
            <div className="text-center p-8 border border-dashed border-gray-200 rounded-3xl">
              <p className="text-xs text-gray-400 italic lowercase">No hay egresos registrados.</p>
            </div>
          )}
        </div>
      </aside>
      </div>
    </div>
  )
}
