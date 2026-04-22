'use client'
import { useState, useEffect, useCallback } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Search, PlusCircle, User, Phone, Mail, Baby, Activity, CreditCard, X, CheckCircle2, Star, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatUSD } from '@/lib/currency'

const ALUMNOS_STORAGE_BUCKET = 'alumnos-documentos'

type Alumno = {
  id?: string
  nombres?: string
  apellidos?: string
  fecha_nacimiento?: string
  cedula_identidad_numero?: string
  cedula_identidad_imagen_path?: string
  pasaporte_numero?: string
  pasaporte_imagen_path?: string
  colegio?: string
  grado?: string
  horario_descripcion?: string
  fecha_inscripcion_academia?: string
}

type Representante = {
  id?: string
  nombres?: string
  apellidos?: string
  estado?: string
  deleted_at?: string | null
  cedula_tipo?: string
  cedula_numero?: string
  telefono?: string
  email?: string
  representante2_nombre_apellido?: string
  representante2_telefono?: string
  alumnos?: Alumno[]
}

type GrupoOpt = { id?: string; colegios?: { nombre?: string }; nombre?: string; tarifa_mensual?: number; cupos_maximos?: number }
type VipOpt = { id?: string; modalidad?: string; nombre?: string; tarifa?: number }
type Inscripcion = { id?: string; estado?: string; descuento_porcentaje?: number | null; grupos_tardes?: { tarifa_mensual?: number; nombre?: string }; clases_particulares?: { tarifa?: number; nombre?: string } }
type IngresoClienteRow = {
  id?: string
  fecha_ingreso?: string | null
  descripcion?: string | null
  monto_usd?: number | null
  metodo_ingreso?: string | null
  estado?: string | null
  alumno_id?: string | null
  cuenta_destino_id?: string | null
  categoria_id?: string | null
  deleted_at?: string | null
}
type CategoriaIngresoRow = { id?: string; nombre?: string | null }
type CuentaDestinoRow = { id?: string; nombre?: string | null; deleted_at?: string | null }
type MovimientoContableCliente = {
  id: string
  fecha: string
  alumnoNombre: string
  descripcion: string
  categoria: string
  cuentaDestino: string
  metodo: string
  estado: string
  monto: number
}
type ResumenContableCliente = {
  totalCobrado: number
  totalPendiente: number
  totalAnulado: number
  pagosRegistrados: number
  ultimoPago: string
}
type ConfirmacionInscripcion = {
  inscripcionId?: string
  estadoDestino: 'retirada' | 'activa'
  servicioNombre?: string
  alumnoId?: string
  alumnoNombre?: string
} | null

type ConfirmacionBorradoCliente = {
  representanteId?: string
  representanteNombre?: string
} | null

type ConfirmacionReactivacionCliente = {
  representanteId?: string
  representanteNombre?: string
} | null

const clienteEliminado = (rep?: Representante | null) => {
  if (!rep) return false
  if (rep.deleted_at) return true
  const estado = String(rep.estado || '').toLowerCase()
  return estado === 'eliminado' || estado === 'inactivo'
}

export default function GestionFamilias() {
  const router = useRouter()
  const [vista, setVista] = useState('inicio') 
  const [busqueda, setBusqueda] = useState('')
  const [familias, setFamilias] = useState<Representante[]>([])
  const [repSeleccionado, setRepSeleccionado] = useState<Representante | null>(null)
  
  // Estados para Inscripción
  const [mostrarModalIns, setMostrarModalIns] = useState(false)
  const [alumnoParaInscribir, setAlumnoParaInscribir] = useState<Alumno | null>(null)
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState<string | null>(null)
  const [opcionesClases, setOpcionesClases] = useState<{grupos: GrupoOpt[], vips: VipOpt[]}>({grupos: [], vips: []})
  const [inscritosActivosPorGrupo, setInscritosActivosPorGrupo] = useState<Record<string, number>>({})
  const [inscripcionesActuales, setInscripcionesActuales] = useState<Inscripcion[]>([])
  const [filtroEstadoIns, setFiltroEstadoIns] = useState<'activa' | 'retirada' | 'pausada' | 'anulada' | 'todas'>('activa')
  const [confirmacionInscripcion, setConfirmacionInscripcion] = useState<ConfirmacionInscripcion>(null)
  const [inscripcionDescuentoEditId, setInscripcionDescuentoEditId] = useState<string | null>(null)
  const [descuentoPorcentajeDraft, setDescuentoPorcentajeDraft] = useState('0')
  const [confirmacionBorradoCliente, setConfirmacionBorradoCliente] = useState<ConfirmacionBorradoCliente>(null)
  const [confirmacionReactivacionCliente, setConfirmacionReactivacionCliente] = useState<ConfirmacionReactivacionCliente>(null)
  const [modoPapelera, setModoPapelera] = useState(false)

  const [formRep, setFormRep] = useState({
    nombres: '',
    apellidos: '',
    cedula_tipo: 'V',
    cedula_numero: '',
    telefono: '',
    email: '',
    representante2_nombre_apellido: '',
    representante2_telefono: '',
  })
  const [formAlumno, setFormAlumno] = useState({
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    condiciones_medicas: '',
    talla_uniforme: '',
    cedula_identidad_numero: '',
    cedula_identidad_imagen_path: '',
    pasaporte_numero: '',
    pasaporte_imagen_path: '',
    colegio: '',
    grado: '',
    horario_descripcion: '',
    fecha_inscripcion_academia: '',
  })
  const [alumnoEditandoId, setAlumnoEditandoId] = useState<string | null>(null)
  const [cedulaImagenFile, setCedulaImagenFile] = useState<File | null>(null)
  const [pasaporteImagenFile, setPasaporteImagenFile] = useState<File | null>(null)
  const [archivoAlumnoInputVersion, setArchivoAlumnoInputVersion] = useState(0)
  const [titularEsAlumno, setTitularEsAlumno] = useState(false)
  const [fechaNacimientoTitularAlumno, setFechaNacimientoTitularAlumno] = useState('')
  
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [detalleAccion, setDetalleAccion] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const [tabPanelDerecho, setTabPanelDerecho] = useState<'clases' | 'contable'>('clases')
  const [cargandoFichaContable, setCargandoFichaContable] = useState(false)
  const [mensajeFichaContable, setMensajeFichaContable] = useState('')
  const [movimientosContables, setMovimientosContables] = useState<MovimientoContableCliente[]>([])
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [filtroFechaDesdeAplicado, setFiltroFechaDesdeAplicado] = useState('')
  const [filtroFechaHastaAplicado, setFiltroFechaHastaAplicado] = useState('')
  const [resumenContable, setResumenContable] = useState<ResumenContableCliente>({
    totalCobrado: 0,
    totalPendiente: 0,
    totalAnulado: 0,
    pagosRegistrados: 0,
    ultimoPago: 'N/A',
  })

  const hidratarRepresentantesConAlumnos = useCallback(async (representantesBase: Representante[]) => {
    const ids = representantesBase.map(r => r.id).filter(Boolean) as string[]
    if (!ids.length) return representantesBase

    const { data: alumnosRows, error: alumnosErr } = await supabase
      .from('alumnos')
      .select('id, nombres, apellidos, fecha_nacimiento, cedula_identidad_numero, cedula_identidad_imagen_path, pasaporte_numero, pasaporte_imagen_path, colegio, grado, horario_descripcion, fecha_inscripcion_academia, representante_id')
      .in('representante_id', ids)

    if (alumnosErr) {
      setErrorCarga(alumnosErr.message)
      return representantesBase
    }

    const mapa = new Map<string, Alumno[]>()
    for (const row of (alumnosRows || []) as Array<Alumno & { representante_id?: string }>) {
      if (!row.representante_id) continue
      if (!mapa.has(row.representante_id)) mapa.set(row.representante_id, [])
      mapa.get(row.representante_id)?.push({
        id: row.id,
        nombres: row.nombres,
        apellidos: row.apellidos,
        fecha_nacimiento: row.fecha_nacimiento,
        cedula_identidad_numero: row.cedula_identidad_numero,
        cedula_identidad_imagen_path: row.cedula_identidad_imagen_path,
        pasaporte_numero: row.pasaporte_numero,
        pasaporte_imagen_path: row.pasaporte_imagen_path,
        colegio: row.colegio,
        grado: row.grado,
        horario_descripcion: row.horario_descripcion,
        fecha_inscripcion_academia: row.fecha_inscripcion_academia,
      })
    }

    return representantesBase.map(rep => ({ ...rep, alumnos: rep.id ? (mapa.get(rep.id) || []) : [] }))
  }, [])

  const cargarFamilias = useCallback(async () => {
    const { data, error } = await supabase.from('representantes').select('*').order('apellidos')
    if (error) {
      setErrorCarga(error.message)
      return
    }
    if (data) {
      const hidratadas = await hidratarRepresentantesConAlumnos(data as Representante[])
      const filtradas = hidratadas.filter((item) => (modoPapelera ? clienteEliminado(item) : !clienteEliminado(item)))
      setFamilias(filtradas)
      setRepSeleccionado((prev) => {
        if (!prev?.id) return prev
        return filtradas.find((rep) => rep.id === prev.id) || null
      })
    }
  }, [hidratarRepresentantesConAlumnos, modoPapelera])

  const cargarInscripciones = async (idAlumno?: string) => {
    if (!idAlumno) return
    const { data, error } = await supabase.from('inscripciones').select(`
      *,
      grupos_tardes (nombre, tarifa_mensual),
      clases_particulares (nombre, tarifa)
    `).eq('alumno_id', idAlumno)
    if (error) {
      setErrorCarga(error.message)
      return
    }
    if (data) setInscripcionesActuales(data)
  }

  useEffect(() => { (async () => { await cargarFamilias() })() }, [cargarFamilias])

  const debouncedBusqueda = useDebounce(busqueda, 350)
  useEffect(() => {
    const term = debouncedBusqueda.trim()
    ;(async () => {
      if (!term) { await cargarFamilias(); return }
      const q = `%${term}%`
      const { data, error } = await supabase.from('representantes')
        .select('*')
        .or(`nombres.ilike.${q},apellidos.ilike.${q},telefono.ilike.${q},email.ilike.${q},cedula_numero.ilike.${q}`)
        .order('apellidos')
      if (error) {
        setErrorCarga(error.message)
        return
      }
      if (data) {
        const hidratadas = await hidratarRepresentantesConAlumnos(data as Representante[])
        const filtradas = hidratadas.filter((item) => (modoPapelera ? clienteEliminado(item) : !clienteEliminado(item)))
        setFamilias(filtradas)
      }
    })()
  }, [debouncedBusqueda, cargarFamilias, hidratarRepresentantesConAlumnos, modoPapelera])

  const seleccionarFamilia = (rep: Representante) => {
    setRepSeleccionado(rep)
    setVista('hub')
    setTabPanelDerecho('clases')
    setMensaje('')
    setAlumnoSeleccionadoId(null)
    setFiltroEstadoIns('activa')
    setInscripcionesActuales([]) // Se limpian hasta que selecciones un alumno
  }

  const cargarFichaContableCliente = useCallback(async (filtros?: { desde?: string; hasta?: string }) => {
    if (!repSeleccionado?.id) {
      setMovimientosContables([])
      setResumenContable({
        totalCobrado: 0,
        totalPendiente: 0,
        totalAnulado: 0,
        pagosRegistrados: 0,
        ultimoPago: 'N/A',
      })
      return
    }

    const alumnosFamilia = repSeleccionado.alumnos || []
    const alumnoIds = alumnosFamilia.map((a) => a.id).filter(Boolean) as string[]

    if (alumnoIds.length === 0) {
      setMovimientosContables([])
      setResumenContable({
        totalCobrado: 0,
        totalPendiente: 0,
        totalAnulado: 0,
        pagosRegistrados: 0,
        ultimoPago: 'N/A',
      })
      setMensajeFichaContable('No hay alumnos vinculados a esta familia.')
      return
    }

    setCargandoFichaContable(true)
    setMensajeFichaContable('')

    const fechaDesdeActiva = filtros?.desde ?? filtroFechaDesdeAplicado
    const fechaHastaActiva = filtros?.hasta ?? filtroFechaHastaAplicado

    if (fechaDesdeActiva && fechaHastaActiva && fechaDesdeActiva > fechaHastaActiva) {
      setMensajeFichaContable('⚠️ El rango de fechas es inválido: "desde" no puede ser mayor que "hasta".')
      setCargandoFichaContable(false)
      return
    }

    let ingresosQuery = supabase
      .from('ingresos')
      .select('id, fecha_ingreso, descripcion, monto_usd, metodo_ingreso, estado, alumno_id, cuenta_destino_id, categoria_id, deleted_at')
      .in('alumno_id', alumnoIds)

    if (fechaDesdeActiva) {
      ingresosQuery = ingresosQuery.gte('fecha_ingreso', fechaDesdeActiva)
    }

    if (fechaHastaActiva) {
      ingresosQuery = ingresosQuery.lte('fecha_ingreso', fechaHastaActiva)
    }

    const [ingresosRes, categoriasRes, cuentasRes] = await Promise.all([
      ingresosQuery.order('fecha_ingreso', { ascending: false }),
      supabase
        .from('categorias_ingreso')
        .select('id, nombre'),
      supabase
        .from('cuentas_financieras')
        .select('id, nombre, deleted_at'),
    ])

    if (ingresosRes.error) {
      setMensajeFichaContable(`❌ ${ingresosRes.error.message}`)
      setCargandoFichaContable(false)
      return
    }

    if (categoriasRes.error) {
      setMensajeFichaContable(`❌ ${categoriasRes.error.message}`)
      setCargandoFichaContable(false)
      return
    }

    if (cuentasRes.error) {
      const msg = (cuentasRes.error.message || '').toLowerCase()
      if (!msg.includes('does not exist')) {
        setMensajeFichaContable(`❌ ${cuentasRes.error.message}`)
        setCargandoFichaContable(false)
        return
      }
    }

    const categoriasById = new Map(
      ((categoriasRes.data || []) as CategoriaIngresoRow[])
        .map((row) => [row.id || '', row.nombre || 'Sin categoría'])
    )

    const cuentasById = new Map(
      ((cuentasRes.data || []) as CuentaDestinoRow[])
        .filter((row) => !row.deleted_at)
        .map((row) => [row.id || '', row.nombre || 'Sin cuenta'])
    )

    const alumnosById = new Map(
      alumnosFamilia.map((a) => [a.id || '', `${a.nombres || ''} ${a.apellidos || ''}`.trim() || 'Alumno'])
    )

    const rowsBase = ((ingresosRes.data || []) as IngresoClienteRow[]).filter((row) => !row.deleted_at)
    const movimientos = rowsBase.map((row) => ({
      id: row.id || '',
      fecha: row.fecha_ingreso || '',
      alumnoNombre: alumnosById.get(row.alumno_id || '') || 'Alumno',
      descripcion: row.descripcion || 'Pago sin descripción',
      categoria: categoriasById.get(row.categoria_id || '') || 'Sin categoría',
      cuentaDestino: cuentasById.get(row.cuenta_destino_id || '') || 'Sin cuenta',
      metodo: row.metodo_ingreso || 'N/A',
      estado: row.estado || 'confirmado',
      monto: Number(row.monto_usd || 0),
    }))

    const totalCobrado = movimientos.reduce((acc, row) => {
      const estado = String(row.estado || '').toLowerCase()
      if (estado === 'anulado' || estado === 'pendiente') return acc
      return acc + row.monto
    }, 0)

    const totalPendiente = movimientos.reduce((acc, row) => {
      const estado = String(row.estado || '').toLowerCase()
      if (estado !== 'pendiente') return acc
      return acc + row.monto
    }, 0)

    const totalAnulado = movimientos.reduce((acc, row) => {
      const estado = String(row.estado || '').toLowerCase()
      if (estado !== 'anulado') return acc
      return acc + row.monto
    }, 0)

    const ultimoPago = movimientos.find((row) => {
      const estado = String(row.estado || '').toLowerCase()
      return estado !== 'anulado'
    })?.fecha || 'N/A'

    setMovimientosContables(movimientos)
    setResumenContable({
      totalCobrado,
      totalPendiente,
      totalAnulado,
      pagosRegistrados: movimientos.length,
      ultimoPago,
    })

    if (movimientos.length === 0) {
      setMensajeFichaContable('No hay pagos asociados a esta familia en el rango seleccionado.')
    }

    setCargandoFichaContable(false)
  }, [repSeleccionado, filtroFechaDesdeAplicado, filtroFechaHastaAplicado])

  const aplicarFiltroFechaContable = () => {
    if (filtroFechaDesde && filtroFechaHasta && filtroFechaDesde > filtroFechaHasta) {
      setMensajeFichaContable('⚠️ El rango de fechas es inválido: "desde" no puede ser mayor que "hasta".')
      return
    }

    setFiltroFechaDesdeAplicado(filtroFechaDesde)
    setFiltroFechaHastaAplicado(filtroFechaHasta)
    void cargarFichaContableCliente({ desde: filtroFechaDesde, hasta: filtroFechaHasta })
  }

  const limpiarFiltroFechaContable = () => {
    setFiltroFechaDesde('')
    setFiltroFechaHasta('')
    setFiltroFechaDesdeAplicado('')
    setFiltroFechaHastaAplicado('')
    setMensajeFichaContable('')
    void cargarFichaContableCliente({ desde: '', hasta: '' })
  }

  useEffect(() => {
    if (!repSeleccionado?.id) return
    if (tabPanelDerecho !== 'contable') return
    void cargarFichaContableCliente()
  }, [repSeleccionado?.id, tabPanelDerecho, cargarFichaContableCliente])

  const seleccionarAlumno = async (idAlumno?: string) => {
    if (!idAlumno) return
    setAlumnoSeleccionadoId(idAlumno)
    await cargarInscripciones(idAlumno)
  }

  const abrirInscripcion = async (alumno: Alumno) => {
    setAlumnoParaInscribir(alumno)
    setCargando(true)
    const { data: grp, error: grpErr } = await supabase.from('grupos_tardes').select('*, colegios(nombre)').eq('estado', 'activo')
    const { data: vip, error: vipErr } = await supabase.from('clases_particulares').select('*').eq('estado', 'activo')
    if (grpErr || vipErr) {
      setMensaje('❌ ' + (grpErr?.message || vipErr?.message || 'No se pudieron cargar las opciones de inscripción'))
      setCargando(false)
      return
    }

    const gruposData = (grp || []) as GrupoOpt[]
    const idsGrupos = gruposData.map((g) => g.id).filter(Boolean) as string[]
    if (idsGrupos.length > 0) {
      const { data: insActivas, error: insActivasErr } = await supabase
        .from('inscripciones')
        .select('grupo_id')
        .in('grupo_id', idsGrupos)
        .eq('estado', 'activa')

      if (insActivasErr) {
        setMensaje(`❌ ${insActivasErr.message}`)
        setCargando(false)
        return
      }

      const conteos: Record<string, number> = {}
      for (const row of (insActivas || []) as Array<{ grupo_id?: string | null }>) {
        const grupoId = row.grupo_id || ''
        if (!grupoId) continue
        conteos[grupoId] = (conteos[grupoId] || 0) + 1
      }
      setInscritosActivosPorGrupo(conteos)
    } else {
      setInscritosActivosPorGrupo({})
    }

    setOpcionesClases({ grupos: (grp || []) as GrupoOpt[], vips: (vip || []) as VipOpt[] })
    setMostrarModalIns(true)
    setCargando(false)
  }

  const normalizarNombreArchivo = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]/g, '_')

  const subirArchivoAlumnoStorage = async (alumnoId: string, tipo: 'cedula' | 'pasaporte', file: File) => {
    const nombre = normalizarNombreArchivo(file.name || `${tipo}.jpg`)
    const path = `${alumnoId}/${Date.now()}_${tipo}_${nombre}`
    const { error } = await supabase.storage
      .from(ALUMNOS_STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined })
    if (error) throw new Error(error.message)
    return path
  }

  const getAlumnoDocPublicUrl = (path?: string) => {
    if (!path) return ''
    return supabase.storage.from(ALUMNOS_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
  }

  const ejecutarInscripcion = async (idActividad?: string, esVip?: boolean) => {
    if (!idActividad || !alumnoParaInscribir?.id || typeof esVip !== 'boolean') return
    setCargando(true)

    if (!esVip) {
      const grupo = opcionesClases.grupos.find((g) => g.id === idActividad)
      const cupoMaximo = Number(grupo?.cupos_maximos || 0)
      const inscritosActuales = inscritosActivosPorGrupo[idActividad] || 0
      if (cupoMaximo > 0 && inscritosActuales >= cupoMaximo) {
        setMensaje('❌ Este grupo ya alcanzó su cupo máximo')
        setDetalleAccion('Selecciona otro grupo o aumenta los cupos en la ficha del grupo')
        setCargando(false)
        return
      }
    }

    const alumnoId = alumnoParaInscribir.id
    const candidatos = esVip
      ? [
          { alumno_id: alumnoId, clase_vip_id: idActividad, estado: 'activa' },
        ]
      : [
          { alumno_id: alumnoId, grupo_id: idActividad, estado: 'activa' },
        ]

    let ok = false
    let ultimoError: string | null = null
    for (const payload of candidatos) {
      const { error } = await supabase.from('inscripciones').insert([payload])
      if (!error) {
        ok = true
        break
      }
      ultimoError = error.message
    }

    if (!ok) {
      const msg = (ultimoError || '').toLowerCase()
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setMensaje('❌ Este alumno ya tiene una inscripción activa en ese servicio')
      } else {
        setMensaje('❌ ' + (ultimoError || 'No se pudo registrar la inscripción'))
      }
      setDetalleAccion('')
    } else {
      setMensaje('✅ Inscripción exitosa')
      const actividad = (esVip ? opcionesClases.vips : opcionesClases.grupos).find(item => item.id === idActividad)
      const ahora = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setDetalleAccion(`Inscripción • ${repSeleccionado?.apellidos || ''} ${repSeleccionado?.nombres || ''} • ${alumnoParaInscribir?.apellidos || ''} ${alumnoParaInscribir?.nombres || ''} • ${actividad?.nombre || 'Servicio'} • ${ahora}`)
      if (!esVip && idActividad) {
        setInscritosActivosPorGrupo((prev) => ({ ...prev, [idActividad]: (prev[idActividad] || 0) + 1 }))
      }
      setMostrarModalIns(false)
      await cargarInscripciones(alumnoId)
      await cargarFamilias()
    }
    setCargando(false)
  }

  const guardarRep = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    if (repSeleccionado?.id && vista === 'form_rep') {
      const payload = {
        nombres: formRep.nombres,
        apellidos: formRep.apellidos,
        cedula_tipo: formRep.cedula_tipo,
        cedula_numero: formRep.cedula_numero,
        telefono: formRep.telefono,
        email: formRep.email,
        representante2_nombre_apellido: formRep.representante2_nombre_apellido,
        representante2_telefono: formRep.representante2_telefono,
      }
      const { data, error } = await supabase
        .from('representantes')
        .update(payload)
        .eq('id', repSeleccionado.id)
        .select('*')
        .single()
      if (error) {
        setMensaje('❌ ' + error.message)
        setCargando(false)
        return
      }
      if (data) {
        setRepSeleccionado((prev) => ({
          ...(prev || {}),
          ...(data as Representante),
          alumnos: prev?.alumnos || [],
        }))
      }
      setMensaje('✅ Información actualizada')
    } else {
      const payload = {
        nombres: formRep.nombres,
        apellidos: formRep.apellidos,
        cedula_tipo: formRep.cedula_tipo,
        cedula_numero: formRep.cedula_numero,
        telefono: formRep.telefono,
        email: formRep.email,
        representante2_nombre_apellido: formRep.representante2_nombre_apellido,
        representante2_telefono: formRep.representante2_telefono,
        estado: 'activo',
      }
      const { data, error } = await supabase.from('representantes').insert([payload]).select().single()
      if (error) {
        setMensaje('❌ ' + error.message)
        setCargando(false)
        return
      }

      if (data?.id && titularEsAlumno) {
        const payloadTitularAlumno = {
          nombres: formRep.nombres,
          apellidos: formRep.apellidos,
          fecha_nacimiento: fechaNacimientoTitularAlumno || null,
          condiciones_medicas: '',
          talla_uniforme: '',
          representante_id: data.id,
          estado: 'activo',
        }

        const { error: errorAlumnoTitular } = await supabase
          .from('alumnos')
          .insert([payloadTitularAlumno])

        if (errorAlumnoTitular) {
          setMensaje(`⚠️ Familia creada, pero no se pudo crear al titular como alumno: ${errorAlumnoTitular.message}`)
        }
      }

      if(data) {
        setRepSeleccionado({...data, alumnos: []})
        setMensaje(titularEsAlumno ? '✅ Familia creada y titular agregado como alumno' : '✅ Familia creada')
      }
    }
    await cargarFamilias();
    setTitularEsAlumno(false)
    setFechaNacimientoTitularAlumno('')
    setVista('hub');
    setCargando(false)
  }

  const guardarAlumno = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    if (!repSeleccionado?.id) { setCargando(false); return }
    const payloadBase = {
      nombres: formAlumno.nombres,
      apellidos: formAlumno.apellidos,
      fecha_nacimiento: formAlumno.fecha_nacimiento,
      condiciones_medicas: formAlumno.condiciones_medicas,
      talla_uniforme: formAlumno.talla_uniforme,
      cedula_identidad_numero: formAlumno.cedula_identidad_numero || null,
      pasaporte_numero: formAlumno.pasaporte_numero || null,
      colegio: formAlumno.colegio || null,
      grado: formAlumno.grado || null,
      horario_descripcion: formAlumno.horario_descripcion || null,
      fecha_inscripcion_academia: formAlumno.fecha_inscripcion_academia || null,
      representante_id: repSeleccionado.id,
      estado: 'activo',
    }
    if (alumnoEditandoId) {
      let cedulaPath = formAlumno.cedula_identidad_imagen_path || null
      let pasaportePath = formAlumno.pasaporte_imagen_path || null
      try {
        if (cedulaImagenFile) cedulaPath = await subirArchivoAlumnoStorage(alumnoEditandoId, 'cedula', cedulaImagenFile)
        if (pasaporteImagenFile) pasaportePath = await subirArchivoAlumnoStorage(alumnoEditandoId, 'pasaporte', pasaporteImagenFile)
      } catch (errorSubida) {
        setMensaje(`❌ Error subiendo documentos: ${errorSubida instanceof Error ? errorSubida.message : 'Storage no disponible'}`)
        setCargando(false)
        return
      }

      const payload = {
        ...payloadBase,
        cedula_identidad_imagen_path: cedulaPath,
        pasaporte_imagen_path: pasaportePath,
      }

      const { data, error } = await supabase
        .from('alumnos')
        .update(payload)
        .eq('id', alumnoEditandoId)
        .select()
        .single()
      if (error) {
        setMensaje('❌ ' + error.message)
        setCargando(false)
        return
      }
      if (data) {
        const actualizados = (repSeleccionado.alumnos || []).map((alumno) => (
          alumno.id === alumnoEditandoId ? { ...alumno, ...data } : alumno
        ))
        setRepSeleccionado({ ...repSeleccionado, alumnos: actualizados })
      }
      setMensaje('✅ Alumno actualizado')
    } else {
      const { data, error } = await supabase.from('alumnos').insert([{
        ...payloadBase,
        cedula_identidad_imagen_path: null,
        pasaporte_imagen_path: null,
      }]).select().single()
      if (error) {
        setMensaje('❌ ' + error.message)
        setCargando(false)
        return
      }

      if (data?.id && (cedulaImagenFile || pasaporteImagenFile)) {
        try {
          const patchDocs: { cedula_identidad_imagen_path?: string; pasaporte_imagen_path?: string } = {}
          if (cedulaImagenFile) patchDocs.cedula_identidad_imagen_path = await subirArchivoAlumnoStorage(data.id, 'cedula', cedulaImagenFile)
          if (pasaporteImagenFile) patchDocs.pasaporte_imagen_path = await subirArchivoAlumnoStorage(data.id, 'pasaporte', pasaporteImagenFile)
          if (Object.keys(patchDocs).length) {
            const { data: alumnoConDocs } = await supabase.from('alumnos').update(patchDocs).eq('id', data.id).select().single()
            if (alumnoConDocs) {
              data.cedula_identidad_imagen_path = alumnoConDocs.cedula_identidad_imagen_path
              data.pasaporte_imagen_path = alumnoConDocs.pasaporte_imagen_path
            }
          }
        } catch (errorSubida) {
          setMensaje(`⚠️ Alumno creado, pero no se pudieron subir documentos: ${errorSubida instanceof Error ? errorSubida.message : 'Storage no disponible'}`)
        }
      }

      if(data) {
        const nuevos = [...(repSeleccionado.alumnos || []), data]
        setRepSeleccionado({...repSeleccionado, alumnos: nuevos})
      }
      setMensaje('✅ Alumno agregado')
    }
    setAlumnoEditandoId(null)
    setCedulaImagenFile(null)
    setPasaporteImagenFile(null)
    setArchivoAlumnoInputVersion(prev => prev + 1)
    cargarFamilias(); setVista('hub'); setCargando(false)
  }

  const eliminarAlumno = async (alumno?: Alumno) => {
    if (!alumno?.id) return
    const alumnoNombre = `${alumno.nombres || ''} ${alumno.apellidos || ''}`.trim() || 'Alumno'
    const confirmar = typeof window === 'undefined'
      ? true
      : window.confirm(`¿Seguro que deseas eliminar a ${alumnoNombre}? Esta acción no se puede deshacer.`)
    if (!confirmar) return

    setCargando(true)
    const { error } = await supabase.from('alumnos').delete().eq('id', alumno.id)
    if (error) {
      setMensaje(`❌ ${error.message}`)
      setCargando(false)
      return
    }

    if (repSeleccionado) {
      const restantes = (repSeleccionado.alumnos || []).filter((item) => item.id !== alumno.id)
      setRepSeleccionado({ ...repSeleccionado, alumnos: restantes })
    }

    if (alumnoSeleccionadoId === alumno.id) {
      setAlumnoSeleccionadoId(null)
      setInscripcionesActuales([])
    }

    setMensaje('✅ Alumno eliminado')
    setDetalleAccion(`Alumno eliminado • ${alumnoNombre}`)
    await cargarFamilias()
    setCargando(false)
  }

  const ejecutarCambioEstadoInscripcion = async (
    inscripcionId?: string,
    estadoDestino?: 'retirada' | 'activa',
    servicioNombre?: string,
    alumnoId?: string,
    alumnoNombre?: string
  ) => {
    if (!inscripcionId || !estadoDestino) return
    setCargando(true)
    const alumnoObjetivoId = alumnoId || alumnoSeleccionadoId || ''
    const alumnoObjetivoNombre = alumnoNombre || alumnoSeleccionadoNombre || 'Alumno'
    const { error } = await supabase.from('inscripciones').update({ estado: estadoDestino }).eq('id', inscripcionId)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (estadoDestino === 'activa' && (msg.includes('duplicate') || msg.includes('unique'))) {
        setMensaje('❌ Ya existe una inscripción activa para ese mismo servicio')
      } else {
        setMensaje('❌ ' + error.message)
      }
      setDetalleAccion('')
    } else {
      setMensaje(estadoDestino === 'activa' ? '✅ Inscripción reactivada' : '✅ Inscripción retirada')
      const accion = estadoDestino === 'activa' ? 'Reactivación' : 'Retiro'
      const ahora = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setDetalleAccion(`${accion} • ${repSeleccionado?.apellidos || ''} ${repSeleccionado?.nombres || ''} • ${alumnoObjetivoNombre} • ${servicioNombre || 'Servicio'} • ${ahora}`)
      if (alumnoObjetivoId) {
        await cargarInscripciones(alumnoObjetivoId)
      } else {
        setInscripcionesActuales((prev) => prev.map((ins) => (
          ins.id === inscripcionId ? { ...ins, estado: estadoDestino } : ins
        )))
      }
    }
    setCargando(false)
  }

  const solicitarRetiroInscripcion = (inscripcionId?: string, servicioNombre?: string) => {
    if (!inscripcionId) return
    setConfirmacionInscripcion({
      inscripcionId,
      estadoDestino: 'retirada',
      servicioNombre,
      alumnoId: alumnoSeleccionadoId || undefined,
      alumnoNombre: alumnoSeleccionadoNombre || undefined,
    })
  }

  const solicitarReactivacionInscripcion = (inscripcionId?: string, servicioNombre?: string) => {
    if (!inscripcionId) return
    setConfirmacionInscripcion({
      inscripcionId,
      estadoDestino: 'activa',
      servicioNombre,
      alumnoId: alumnoSeleccionadoId || undefined,
      alumnoNombre: alumnoSeleccionadoNombre || undefined,
    })
  }

  const confirmarCambioInscripcion = async () => {
    if (!confirmacionInscripcion) return
    const { inscripcionId, estadoDestino, servicioNombre, alumnoId, alumnoNombre } = confirmacionInscripcion
    setConfirmacionInscripcion(null)
    await ejecutarCambioEstadoInscripcion(inscripcionId, estadoDestino, servicioNombre, alumnoId, alumnoNombre)
  }

  const abrirEditorDescuentoInscripcion = (inscripcion?: Inscripcion) => {
    if (!inscripcion?.id) return
    const descuentoActual = Number(inscripcion.descuento_porcentaje || 0)
    setInscripcionDescuentoEditId(inscripcion.id)
    setDescuentoPorcentajeDraft(String(Number.isFinite(descuentoActual) ? descuentoActual : 0))
  }

  const cancelarEditorDescuentoInscripcion = () => {
    setInscripcionDescuentoEditId(null)
    setDescuentoPorcentajeDraft('0')
  }

  const aplicarDescuentoInscripcion = async (inscripcion?: Inscripcion) => {
    if (!inscripcion?.id) return
    const valor = Number(descuentoPorcentajeDraft)
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      setMensaje('❌ El descuento debe estar entre 0 y 100')
      return
    }

    setCargando(true)
    const { error } = await supabase
      .from('inscripciones')
      .update({ descuento_porcentaje: valor })
      .eq('id', inscripcion.id)

    if (error) {
      setMensaje(`❌ ${error.message}`)
      setCargando(false)
      return
    }

    setInscripcionesActuales((prev) => prev.map((item) => (
      item.id === inscripcion.id ? { ...item, descuento_porcentaje: valor } : item
    )))
    setMensaje(valor > 0 ? `✅ Descuento aplicado (${valor}%)` : '✅ Descuento removido')
    setDetalleAccion(`${inscripcion.grupos_tardes?.nombre || inscripcion.clases_particulares?.nombre || 'Clase'} • ${valor}%`)
    cancelarEditorDescuentoInscripcion()
    setCargando(false)
  }

  const solicitarBorradoCliente = () => {
    if (!repSeleccionado?.id) return
    setConfirmacionBorradoCliente({
      representanteId: repSeleccionado.id,
      representanteNombre: `${repSeleccionado.nombres || ''} ${repSeleccionado.apellidos || ''}`.trim(),
    })
  }

  const confirmarBorradoCliente = async () => {
    if (!confirmacionBorradoCliente?.representanteId) return

    setCargando(true)
    const deletedAt = new Date().toISOString()
    const { error } = await supabase
      .from('representantes')
      .update({ deleted_at: deletedAt })
      .eq('id', confirmacionBorradoCliente.representanteId)

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('deleted_at')) {
        const fallback = await supabase
          .from('representantes')
          .update({ estado: 'inactivo' })
          .eq('id', confirmacionBorradoCliente.representanteId)

        if (fallback.error) {
          setMensaje(`❌ ${fallback.error.message}`)
          setConfirmacionBorradoCliente(null)
          setCargando(false)
          return
        }
      } else {
        setMensaje(`❌ ${error.message}`)
        setConfirmacionBorradoCliente(null)
        setCargando(false)
        return
      }
    }

    setFamilias((prev) => prev.filter((item) => item.id !== confirmacionBorradoCliente.representanteId))
    setRepSeleccionado(null)
    setVista('inicio')
    setInscripcionesActuales([])
    setAlumnoSeleccionadoId(null)
    setMensaje('✅ Cliente eliminado correctamente')
    setDetalleAccion('El cliente fue removido del listado operativo')
    setConfirmacionBorradoCliente(null)
    setCargando(false)
  }

  const solicitarReactivacionCliente = () => {
    if (!repSeleccionado?.id) return
    setConfirmacionReactivacionCliente({
      representanteId: repSeleccionado.id,
      representanteNombre: `${repSeleccionado.nombres || ''} ${repSeleccionado.apellidos || ''}`.trim(),
    })
  }

  const confirmarReactivacionCliente = async () => {
    if (!confirmacionReactivacionCliente?.representanteId) return

    setCargando(true)
    const { error } = await supabase
      .from('representantes')
      .update({ deleted_at: null })
      .eq('id', confirmacionReactivacionCliente.representanteId)

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('deleted_at')) {
        const fallback = await supabase
          .from('representantes')
          .update({ estado: 'activo' })
          .eq('id', confirmacionReactivacionCliente.representanteId)

        if (fallback.error) {
          setMensaje(`❌ ${fallback.error.message}`)
          setConfirmacionReactivacionCliente(null)
          setCargando(false)
          return
        }
      } else {
        setMensaje(`❌ ${error.message}`)
        setConfirmacionReactivacionCliente(null)
        setCargando(false)
        return
      }
    }

    setFamilias((prev) => prev.filter((item) => item.id !== confirmacionReactivacionCliente.representanteId))
    if (repSeleccionado?.id === confirmacionReactivacionCliente.representanteId) {
      setRepSeleccionado(null)
      setVista('inicio')
      setInscripcionesActuales([])
      setAlumnoSeleccionadoId(null)
    }
    setMensaje('✅ Familia reactivada correctamente')
    setDetalleAccion('La familia volvió al listado operativo de clientes activos')
    setConfirmacionReactivacionCliente(null)
    setCargando(false)
  }

  const inscripcionesFiltradas = filtroEstadoIns === 'todas'
    ? inscripcionesActuales
    : inscripcionesActuales.filter(ins => (ins.estado || 'activa') === filtroEstadoIns)

  const obtenerTarifaInscripcion = (ins: Inscripcion) => Number(ins.grupos_tardes?.tarifa_mensual || ins.clases_particulares?.tarifa || 0)
  const obtenerDescuentoInscripcion = (ins: Inscripcion) => {
    const valor = Number(ins.descuento_porcentaje || 0)
    if (!Number.isFinite(valor)) return 0
    return Math.min(100, Math.max(0, valor))
  }
  const calcularMontoInscripcionConDescuento = (ins: Inscripcion) => {
    const tarifa = obtenerTarifaInscripcion(ins)
    const descuento = obtenerDescuentoInscripcion(ins)
    return tarifa * (1 - (descuento / 100))
  }

  const totalMensual = inscripcionesFiltradas.reduce((acc, ins) => {
    return acc + calcularMontoInscripcionConDescuento(ins)
  }, 0)
  const activasCount = inscripcionesActuales.filter(ins => (ins.estado || 'activa') === 'activa').length
  const formatearMonto = formatUSD
  const alumnoSeleccionadoNombre = (() => {
    const alumno = repSeleccionado?.alumnos?.find(a => a.id === alumnoSeleccionadoId)
    return alumno ? `${alumno.nombres || ''} ${alumno.apellidos || ''}`.trim() : ''
  })()
  const representanteNombre = `${repSeleccionado?.nombres || ''} ${repSeleccionado?.apellidos || ''}`.trim()

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      {/* MODAL CONFIRMACIÓN ESTADO INSCRIPCIÓN */}
      {confirmacionInscripcion && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-gray-100">
            <p className="text-[10px] text-gray-400 tracking-widest mb-2">CONFIRMAR ACCIÓN</p>
            <h3 className="text-xl font-black italic mb-2">
              {confirmacionInscripcion.estadoDestino === 'retirada' ? 'Retirar inscripción' : 'Reactivar inscripción'}
            </h3>
            <p className="text-xs text-gray-500 mb-6 normal-case">
              {confirmacionInscripcion.estadoDestino === 'retirada'
                ? 'Esta inscripción pasará a estado retirada y no sumará en activos.'
                : 'Esta inscripción volverá a estado activa y se incluirá en los cálculos.'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Servicio: <span className="text-black">{confirmacionInscripcion.servicioNombre || 'No identificado'}</span>
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Alumno: <span className="text-black">{confirmacionInscripcion.alumnoNombre || alumnoSeleccionadoNombre || 'No identificado'}</span>
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Familia: <span className="text-black">{representanteNombre || 'No identificada'}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmacionInscripcion(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-black text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioInscripcion}
                className={`flex-1 py-3 rounded-2xl text-[10px] uppercase tracking-widest text-white ${confirmacionInscripcion.estadoDestino === 'retirada' ? 'bg-red-600' : 'bg-green-600'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmacionBorradoCliente && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-gray-100">
            <p className="text-[10px] text-gray-400 tracking-widest mb-2">CONFIRMAR ELIMINACIÓN</p>
            <h3 className="text-xl font-black italic mb-2">Eliminar cliente</h3>
            <p className="text-xs text-gray-500 mb-6 normal-case">
              Esta acción ocultará al cliente del listado operativo.
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Cliente: <span className="text-black">{confirmacionBorradoCliente.representanteNombre || 'No identificado'}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmacionBorradoCliente(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-black text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBorradoCliente}
                disabled={cargando}
                className="flex-1 py-3 rounded-2xl text-[10px] uppercase tracking-widest text-white bg-red-600 disabled:opacity-60"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmacionReactivacionCliente && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-gray-100">
            <p className="text-[10px] text-gray-400 tracking-widest mb-2">CONFIRMAR REACTIVACIÓN</p>
            <h3 className="text-xl font-black italic mb-2">Reactivar familia</h3>
            <p className="text-xs text-gray-500 mb-6 normal-case">
              Esta acción devolverá a la familia al listado operativo de clientes activos.
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Familia: <span className="text-black">{confirmacionReactivacionCliente.representanteNombre || 'No identificada'}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmacionReactivacionCliente(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-black text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReactivacionCliente}
                disabled={cargando}
                className="flex-1 py-3 rounded-2xl text-[10px] uppercase tracking-widest text-white bg-green-600 disabled:opacity-60"
              >
                Sí, reactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INSCRIPCIÓN PREMIUM */}
      {mostrarModalIns && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <p className="text-[10px] text-gray-400 tracking-widest mb-1">PROCESO DE INSCRIPCIÓN</p>
                <h2 className="text-2xl font-black italic">INSCRIBIR A {alumnoParaInscribir?.nombres}</h2>
              </div>
              <button onClick={() => setMostrarModalIns(false)} className="bg-black text-white p-3 rounded-2xl hover:scale-110 transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-8">
              {/* Columna Grupos Tardes */}
              <div className="space-y-4">
                <h3 className="text-xs font-black tracking-widest text-gray-400 mb-4 flex items-center gap-2"><Activity size={14}/> ACADEMIAS TARDES</h3>
                {opcionesClases.grupos.map(g => {
                  const cupoMaximo = Number(g.cupos_maximos || 0)
                  const inscritos = g.id ? (inscritosActivosPorGrupo[g.id] || 0) : 0
                  const sinLimite = cupoMaximo <= 0
                  const agotado = !sinLimite && inscritos >= cupoMaximo

                  return (
                  <div
                    key={g.id}
                    onClick={() => {
                      if (agotado || cargando) return
                      void ejecutarInscripcion(g.id, false)
                    }}
                    className={`p-5 border rounded-[2rem] transition-all bg-white group relative ${agotado ? 'border-red-200 opacity-70 cursor-not-allowed' : 'border-gray-100 hover:border-black hover:shadow-xl cursor-pointer'}`}
                  >
                    <p className="text-[9px] text-gray-400 font-bold mb-1 uppercase">{g.colegios?.nombre}</p>
                    <p className="text-sm font-black mb-3">{g.nombre}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3">
                      Cupos: {inscritos} / {sinLimite ? 'SIN LÍMITE' : cupoMaximo}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg italic font-black text-black">${formatearMonto(g.tarifa_mensual)}</span>
                      {agotado ? (
                        <span className="text-[9px] bg-red-100 text-red-700 px-3 py-1 rounded-full font-black uppercase">AGOTADO</span>
                      ) : (
                        <span className="text-[9px] bg-black text-white px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all font-black uppercase">INSCRIBIR</span>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
              {/* Columna VIP */}
              <div className="space-y-4">
                <h3 className="text-xs font-black tracking-widest text-gray-400 mb-4 flex items-center gap-2"><Star size={14} className="text-yellow-500"/> SERVICIOS VIP</h3>
                {opcionesClases.vips.map(v => (
                  <div key={v.id} onClick={() => ejecutarInscripcion(v.id, true)} className="p-5 border border-gray-100 rounded-[2rem] hover:border-black hover:shadow-xl transition-all cursor-pointer bg-white group relative">
                    <p className="text-[9px] text-gray-400 font-bold mb-1 uppercase">{v.modalidad}</p>
                    <p className="text-sm font-black mb-3">{v.nombre}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg italic font-black text-black">${formatearMonto(v.tarifa)}</span>
                      <span className="text-[9px] bg-yellow-500 text-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all font-black uppercase">VENDER VIP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. IZQUIERDA: BUSCADOR */}
      <aside className="w-[25%] border-r border-gray-100 bg-gray-50/50 p-8 flex flex-col">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-4 uppercase flex items-center gap-2"><Users size={12}/> Directorio Familiar</h3>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setModoPapelera(false)
              setRepSeleccionado(null)
              setVista('inicio')
              setInscripcionesActuales([])
              setAlumnoSeleccionadoId(null)
            }}
            className={`text-[9px] px-3 py-2 rounded-full uppercase tracking-widest font-black ${!modoPapelera ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            Activos
          </button>
          <button
            onClick={() => {
              setModoPapelera(true)
              setRepSeleccionado(null)
              setVista('inicio')
              setInscripcionesActuales([])
              setAlumnoSeleccionadoId(null)
            }}
            className={`text-[9px] px-3 py-2 rounded-full uppercase tracking-widest font-black ${modoPapelera ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            Papelera
          </button>
        </div>
        <div className="relative mb-6"><Search size={14} className="absolute left-4 top-4 text-gray-300"/><input placeholder="BUSCAR..." className="w-full bg-white rounded-2xl p-4 pl-10 text-[10px] font-bold border border-gray-100 shadow-sm focus:border-black outline-none" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        {!modoPapelera && (
          <button onClick={() => { setRepSeleccionado(null); setVista('form_rep'); setFormRep({nombres:'', apellidos:'', cedula_tipo:'V', cedula_numero:'', telefono:'', email:'', representante2_nombre_apellido:'', representante2_telefono:''}); setTitularEsAlumno(false); setFechaNacimientoTitularAlumno('') }} className="w-full bg-black text-white p-4 rounded-2xl mb-6 text-xs flex items-center justify-center gap-2 hover:scale-105 transition-all font-black italic"><PlusCircle size={14}/> NUEVA FAMILIA</button>
        )}
        <div className="space-y-2 overflow-y-auto flex-1 pr-2">
          {familias.map((f: Representante) => (
              <button key={f.id} onClick={() => seleccionarFamilia(f)} className={`w-full text-left p-4 rounded-2xl border transition-all ${repSeleccionado?.id === f.id ? 'bg-black text-white border-black shadow-xl scale-95' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}`}><p className="text-xs font-black">{f.apellidos}, {f.nombres}</p><p className={`text-[9px] font-bold ${repSeleccionado?.id === f.id ? 'text-gray-400' : 'text-gray-300'}`}>{f.cedula_tipo}-{f.cedula_numero}</p></button>
            ))}
        </div>
        {errorCarga && <p className="mt-4 text-[10px] p-3 bg-red-50 text-red-700 rounded-2xl">❌ {errorCarga}</p>}
      </aside>

      {/* 2. CENTRO: FAMILY HUB */}
      <main className="w-[45%] p-12 overflow-y-auto border-r border-gray-100 bg-white relative">
        <header className="mb-10 text-black"><button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all tracking-widest"><ArrowLeft size={14} /> VOLVER ATRÁS</button>
          <div className="flex justify-between items-start"><div><div className="flex items-center gap-3 mb-2"><div className="bg-black p-2 rounded-xl text-white"><Users size={20} /></div><h1 className="text-3xl italic tracking-tighter uppercase font-black">Centro Familiar</h1></div><p className="text-gray-400 text-sm font-medium italic lowercase">Gestión B2C.</p></div>{vista !== 'inicio' && vista !== 'hub' && <button onClick={() => { if (vista === 'form_alumno') { setAlumnoEditandoId(null); setCedulaImagenFile(null); setPasaporteImagenFile(null); setArchivoAlumnoInputVersion(prev => prev + 1) } setVista('hub') }} className="text-[10px] text-gray-400 font-black hover:text-black border-b border-gray-100">CANCELAR</button>}</div>
        </header>

        {vista === 'inicio' && <div className="flex flex-col items-center justify-center h-[50vh] text-gray-200"><Users size={80} strokeWidth={1}/></div>}

        {vista === 'hub' && repSeleccionado && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="p-8 bg-gray-50/50 rounded-[3rem] border border-gray-100 relative group transition-all hover:bg-white hover:shadow-2xl">
              <div className="absolute top-8 right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setFormRep({ nombres: repSeleccionado.nombres || '', apellidos: repSeleccionado.apellidos || '', cedula_tipo: repSeleccionado.cedula_tipo || 'V', cedula_numero: repSeleccionado.cedula_numero || '', telefono: repSeleccionado.telefono || '', email: repSeleccionado.email || '', representante2_nombre_apellido: repSeleccionado.representante2_nombre_apellido || '', representante2_telefono: repSeleccionado.representante2_telefono || '' }); setVista('form_rep') }} className="text-[10px] font-black border border-gray-200 px-4 py-2 rounded-full transition-all hover:bg-black hover:text-white uppercase">Editar Perfil</button>
                {!modoPapelera ? (
                  <button onClick={solicitarBorradoCliente} disabled={cargando} className="text-[10px] font-black border border-red-200 text-red-700 px-4 py-2 rounded-full transition-all hover:bg-red-600 hover:text-white uppercase inline-flex items-center gap-1 disabled:opacity-60">
                    <Trash2 size={12} /> Borrar
                  </button>
                ) : (
                  <button onClick={solicitarReactivacionCliente} disabled={cargando} className="text-[10px] font-black border border-green-200 text-green-700 px-4 py-2 rounded-full transition-all hover:bg-green-600 hover:text-white uppercase inline-flex items-center gap-1 disabled:opacity-60">
                    Reactivar
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 tracking-[0.2em] mb-1 font-black">TITULAR DE CUENTA</p>
              <h2 className="text-3xl font-black mb-4 italic tracking-tighter">{repSeleccionado.apellidos}, {repSeleccionado.nombres}</h2>
              <div className="flex gap-6 text-[10px] text-gray-400 font-black uppercase"><p className="flex items-center gap-1"><User size={12}/> {repSeleccionado.cedula_tipo}-{repSeleccionado.cedula_numero}</p><p className="flex items-center gap-1"><Phone size={12}/> {repSeleccionado.telefono || 'N/A'}</p><p className="flex items-center gap-1 lowercase"><Mail size={12}/> {repSeleccionado.email || 'N/A'}</p></div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-6 px-4"><h3 className="text-xs font-black tracking-widest uppercase flex items-center gap-2"><Baby size={16}/> Hijos / Alumnos registrados</h3><button onClick={() => { setAlumnoEditandoId(null); setCedulaImagenFile(null); setPasaporteImagenFile(null); setArchivoAlumnoInputVersion(prev => prev + 1); setFormAlumno({nombres:'', apellidos:repSeleccionado.apellidos || '', fecha_nacimiento:'', condiciones_medicas:'', talla_uniforme:'', cedula_identidad_numero:'', cedula_identidad_imagen_path:'', pasaporte_numero:'', pasaporte_imagen_path:'', colegio:'', grado:'', horario_descripcion:'', fecha_inscripcion_academia:''}); setVista('form_alumno') }} className="text-[10px] bg-black text-white px-4 py-2 rounded-full font-black italic hover:scale-105 transition-all shadow-lg">+ AGREGAR NIÑO</button></div>
              <div className="space-y-4">
                {repSeleccionado.alumnos?.map((a: Alumno) => (
                  <div key={a.id} onClick={() => seleccionarAlumno(a.id)} className="p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm flex justify-between items-center group hover:border-black hover:shadow-xl transition-all cursor-pointer">
                    <div><p className="text-lg font-black italic">{a.nombres} {a.apellidos}</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Nacimiento: {a.fecha_nacimiento || 'N/A'}</p></div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); void eliminarAlumno(a) }} disabled={cargando} className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-2xl transition-all font-black uppercase hover:bg-red-600 hover:text-white disabled:opacity-60">ELIMINAR</button>
                      <button onClick={(e) => { e.stopPropagation(); setAlumnoEditandoId(a.id || null); setCedulaImagenFile(null); setPasaporteImagenFile(null); setArchivoAlumnoInputVersion(prev => prev + 1); setFormAlumno({nombres: a.nombres || '', apellidos: a.apellidos || '', fecha_nacimiento: a.fecha_nacimiento || '', condiciones_medicas: '', talla_uniforme: '', cedula_identidad_numero: a.cedula_identidad_numero || '', cedula_identidad_imagen_path: a.cedula_identidad_imagen_path || '', pasaporte_numero: a.pasaporte_numero || '', pasaporte_imagen_path: a.pasaporte_imagen_path || '', colegio: a.colegio || '', grado: a.grado || '', horario_descripcion: a.horario_descripcion || '', fecha_inscripcion_academia: a.fecha_inscripcion_academia || ''}); setVista('form_alumno') }} className="text-[9px] bg-white text-black border border-gray-300 px-4 py-2 rounded-2xl transition-all font-black uppercase hover:bg-gray-100">EDITAR</button>
                      <button onClick={(e) => { e.stopPropagation(); abrirInscripcion(a); }} className="text-[10px] bg-black text-white px-5 py-3 rounded-2xl transition-all flex items-center gap-2 font-black italic shadow-lg hover:scale-110"><Activity size={12}/> INSCRIBIR EN CLASE</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Formularios compactados por espacio */}
        {(vista === 'form_rep' || vista === 'form_alumno') && (
           <form onSubmit={vista === 'form_rep' ? guardarRep : guardarAlumno} className="space-y-6 max-w-xl animate-in zoom-in-95 duration-200">
             <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl space-y-5">
               <h3 className="text-xs text-gray-400 font-black tracking-widest uppercase mb-4">{vista === 'form_rep' ? 'Datos del Representante' : (alumnoEditandoId ? 'Editar datos del alumno' : 'Datos del Alumno')}</h3>
               <div className="grid grid-cols-2 gap-4">
                 <input required placeholder="NOMBRES" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black outline-none border-none" value={vista === 'form_rep' ? formRep.nombres : formAlumno.nombres} onChange={e=>vista === 'form_rep' ? setFormRep({...formRep, nombres:e.target.value}) : setFormAlumno({...formAlumno, nombres:e.target.value})} />
                 <input required placeholder="APELLIDOS" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black outline-none border-none" value={vista === 'form_rep' ? formRep.apellidos : formAlumno.apellidos} onChange={e=>vista === 'form_rep' ? setFormRep({...formRep, apellidos:e.target.value}) : setFormAlumno({...formAlumno, apellidos:e.target.value})} />
               </div>
               {vista === 'form_rep' ? (
                 <div className="grid grid-cols-12 gap-2"><select className="col-span-3 bg-gray-100 rounded-2xl p-4 text-sm font-black border-none" value={formRep.cedula_tipo} onChange={e=>setFormRep({...formRep, cedula_tipo:e.target.value})}><option value="V">V</option><option value="E">E</option></select><input required placeholder="CÉDULA" className="col-span-9 bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formRep.cedula_numero} onChange={e=>setFormRep({...formRep, cedula_numero:e.target.value})} /></div>
               ) : (
                 <>
                   <input required type="date" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.fecha_nacimiento} onChange={e=>setFormAlumno({...formAlumno, fecha_nacimiento:e.target.value})} />
                   <div className="grid grid-cols-2 gap-4">
                     <input placeholder="NÚMERO DE CÉDULA" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.cedula_identidad_numero} onChange={e=>setFormAlumno({...formAlumno, cedula_identidad_numero:e.target.value})} />
                     <input placeholder="NÚMERO DE PASAPORTE" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.pasaporte_numero} onChange={e=>setFormAlumno({...formAlumno, pasaporte_numero:e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <input placeholder="COLEGIO" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.colegio} onChange={e=>setFormAlumno({...formAlumno, colegio:e.target.value})} />
                     <input placeholder="GRADO" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.grado} onChange={e=>setFormAlumno({...formAlumno, grado:e.target.value})} />
                   </div>
                   <div className="grid grid-cols-4 gap-4">
                     <label className="col-span-1 w-full">
                       <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Fecha de inscripción</p>
                       <input type="date" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.fecha_inscripcion_academia} onChange={e=>setFormAlumno({...formAlumno, fecha_inscripcion_academia:e.target.value})} />
                     </label>
                     <input placeholder="HORARIO DEL NIÑO" className="col-span-3 w-full max-w-[85%] justify-self-start self-end bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.horario_descripcion} onChange={e=>setFormAlumno({...formAlumno, horario_descripcion:e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <label className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none">
                       <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Imagen de cédula</p>
                       <input key={`cedula-${archivoAlumnoInputVersion}`} type="file" accept="image/*" className="w-full text-[10px]" onChange={e => setCedulaImagenFile(e.target.files?.[0] || null)} />
                       {formAlumno.cedula_identidad_imagen_path && !cedulaImagenFile && (
                         <a href={getAlumnoDocPublicUrl(formAlumno.cedula_identidad_imagen_path)} target="_blank" rel="noreferrer" className="block mt-2 text-[10px] text-blue-700 underline">Ver imagen guardada</a>
                       )}
                     </label>
                     <label className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none">
                       <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Foto de pasaporte (opcional)</p>
                       <input key={`pasaporte-${archivoAlumnoInputVersion}`} type="file" accept="image/*" className="w-full text-[10px]" onChange={e => setPasaporteImagenFile(e.target.files?.[0] || null)} />
                       {formAlumno.pasaporte_imagen_path && !pasaporteImagenFile && (
                         <a href={getAlumnoDocPublicUrl(formAlumno.pasaporte_imagen_path)} target="_blank" rel="noreferrer" className="block mt-2 text-[10px] text-blue-700 underline">Ver imagen guardada</a>
                       )}
                     </label>
                   </div>
                 </>
               )}

               {vista === 'form_rep' && (
                 <>
                   <div className="grid grid-cols-2 gap-4">
                     <input placeholder="TELÉFONO" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formRep.telefono} onChange={e=>setFormRep({...formRep, telefono:e.target.value})} />
                     <input placeholder="CORREO ELECTRÓNICO" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formRep.email} onChange={e=>setFormRep({...formRep, email:e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <input placeholder="REPRESENTANTE 2 (NOMBRE Y APELLIDO)" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formRep.representante2_nombre_apellido} onChange={e=>setFormRep({...formRep, representante2_nombre_apellido:e.target.value})} />
                     <input placeholder="TELÉFONO REPRESENTANTE 2" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formRep.representante2_telefono} onChange={e=>setFormRep({...formRep, representante2_telefono:e.target.value})} />
                   </div>
                 </>
               )}

               {vista === 'form_rep' && !repSeleccionado?.id && (
                 <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                   <label className="flex items-center gap-3 cursor-pointer">
                     <input
                       type="checkbox"
                       checked={titularEsAlumno}
                       onChange={(e) => setTitularEsAlumno(e.target.checked)}
                       className="h-4 w-4"
                     />
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                       El titular también recibe clases
                     </span>
                   </label>

                   {titularEsAlumno && (
                     <div className="mt-3">
                       <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">
                         Fecha de nacimiento del titular alumno
                       </p>
                       <input
                         required
                         type="date"
                         className="w-full bg-white rounded-2xl p-3 text-sm font-black border border-gray-200"
                         value={fechaNacimientoTitularAlumno}
                         onChange={(e) => setFechaNacimientoTitularAlumno(e.target.value)}
                       />
                     </div>
                   )}
                 </div>
               )}
             </div>
             <button className="w-full bg-black text-white py-6 rounded-[2rem] font-black italic shadow-2xl hover:scale-[1.02] transition-all">{vista === 'form_alumno' ? (alumnoEditandoId ? 'GUARDAR CAMBIOS' : 'GUARDAR ALUMNO') : 'GUARDAR INFORMACIÓN'}</button>
           </form>
        )}
        {mensaje && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-4 rounded-3xl font-black text-xs shadow-2xl z-[100] animate-bounce text-center">
            <p>{mensaje}</p>
            {detalleAccion && <p className="text-[9px] text-gray-300 mt-1 normal-case">{detalleAccion}</p>}
          </div>
        )}
      </main>

      {/* 3. DERECHA: FINANZAS DINÁMICAS */}
      <aside className="md:w-2/5 w-full bg-gray-50/20 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-8 uppercase font-black flex items-center gap-2"><CreditCard size={12}/> ESTADO DE CUENTA B2C</h3>
        {repSeleccionado ? (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-150 transition-all duration-700"><CreditCard size={120}/></div>
              <p className="text-[10px] text-gray-500 mb-2 tracking-[0.3em] font-black">MENSUALIDAD ESTIMADA</p>
              <p className="text-6xl font-black italic tracking-tighter">${formatearMonto(totalMensual)}</p>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-gray-400 italic lowercase border-t border-white/10 pt-6"><CheckCircle2 size={12} className="text-green-500"/> Basado en {activasCount} inscripciones activas</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-[10px] text-gray-400 font-black tracking-widest uppercase">{tabPanelDerecho === 'clases' ? 'DETALLE DE CLASES' : 'FICHA CONTABLE'}</h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTabPanelDerecho('clases')}
                    className={`text-[8px] px-2 py-1 rounded-full uppercase tracking-widest ${tabPanelDerecho === 'clases' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    Clases
                  </button>
                  <button
                    onClick={() => setTabPanelDerecho('contable')}
                    className={`text-[8px] px-2 py-1 rounded-full uppercase tracking-widest ${tabPanelDerecho === 'contable' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    Contable
                  </button>
                </div>
              </div>
              {tabPanelDerecho === 'clases' && (
                <>
                  <div className="flex items-center gap-1 mb-3 px-2">
                    {['activa', 'retirada', 'todas'].map(st => (
                      <button
                        key={st}
                        onClick={() => setFiltroEstadoIns(st as 'activa' | 'retirada' | 'todas')}
                        className={`text-[8px] px-2 py-1 rounded-full uppercase tracking-widest ${filtroEstadoIns === st ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {inscripcionesFiltradas.map(ins => (
                      <div key={ins.id} className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm flex justify-between items-center group hover:border-black transition-all">
                        <div>
                          <p className="text-[11px] font-black uppercase italic tracking-tight">{ins.grupos_tardes?.nombre || ins.clases_particulares?.nombre}</p>
                          <p className="text-[8px] text-gray-400 font-bold tracking-widest uppercase">ESTADO: {ins.estado || 'activa'}</p>
                        </div>
                        <div className="text-right space-y-2">
                          <span className="block text-sm font-black italic">${formatearMonto(calcularMontoInscripcionConDescuento(ins))}</span>
                          {obtenerDescuentoInscripcion(ins) > 0 && (
                            <span className="block text-[8px] font-black uppercase tracking-widest text-amber-700">Descuento: {obtenerDescuentoInscripcion(ins)}%</span>
                          )}
                          {(ins.estado || 'activa') === 'activa' && (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => solicitarRetiroInscripcion(ins.id, ins.grupos_tardes?.nombre || ins.clases_particulares?.nombre)} disabled={cargando} className="text-[8px] px-2 py-1 rounded-full bg-red-50 text-red-700 uppercase tracking-widest border border-red-200">
                                Retirar
                              </button>
                              <button onClick={() => abrirEditorDescuentoInscripcion(ins)} disabled={cargando} className="text-[8px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 uppercase tracking-widest border border-amber-300">
                                Descuento
                              </button>
                            </div>
                          )}
                          {(ins.estado || 'activa') === 'retirada' && (
                            <button onClick={() => solicitarReactivacionInscripcion(ins.id, ins.grupos_tardes?.nombre || ins.clases_particulares?.nombre)} disabled={cargando} className="text-[8px] px-2 py-1 rounded-full bg-green-50 text-green-700 uppercase tracking-widest border border-green-200">
                              Reactivar
                            </button>
                          )}
                          {inscripcionDescuentoEditId === ins.id && (
                            <div className="mt-2 p-2 border border-amber-200 bg-amber-50 rounded-xl space-y-2">
                              <p className="text-[8px] text-amber-700 font-black uppercase tracking-widest">Descuento %</p>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={descuentoPorcentajeDraft}
                                onChange={(e) => setDescuentoPorcentajeDraft(e.target.value)}
                                className="w-full text-right bg-white rounded-lg px-2 py-1 text-[10px] font-black border border-amber-200"
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={cancelarEditorDescuentoInscripcion} type="button" className="text-[8px] px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600 uppercase tracking-widest">Cancelar</button>
                                <button onClick={() => aplicarDescuentoInscripcion(ins)} type="button" disabled={cargando} className="text-[8px] px-2 py-1 rounded-full bg-amber-500 text-white uppercase tracking-widest">Aplicar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {inscripcionesFiltradas.length === 0 && <p className="text-xs text-gray-300 italic text-center p-10 border border-dashed rounded-[2rem]">{alumnoSeleccionadoId ? 'No hay inscripciones para el filtro seleccionado...' : 'Selecciona un alumno para ver sus clases e importes...'}</p>}
                  </div>
                </>
              )}

              {tabPanelDerecho === 'contable' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Rango de fechas</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Desde</label>
                        <input
                          type="date"
                          value={filtroFechaDesde}
                          onChange={(e) => setFiltroFechaDesde(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-2 py-1 text-[10px] font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Hasta</label>
                        <input
                          type="date"
                          value={filtroFechaHasta}
                          onChange={(e) => setFiltroFechaHasta(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-2 py-1 text-[10px] font-black"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={limpiarFiltroFechaContable}
                        disabled={cargandoFichaContable}
                        className="text-[8px] px-2 py-1 rounded-full uppercase tracking-widest bg-gray-100 text-gray-600 disabled:opacity-60"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={aplicarFiltroFechaContable}
                        disabled={cargandoFichaContable}
                        className="text-[8px] px-2 py-1 rounded-full uppercase tracking-widest bg-black text-white disabled:opacity-60"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Cobrado</p>
                      <p className="mt-1 text-sm font-black text-green-700">${formatearMonto(resumenContable.totalCobrado)}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Pendiente</p>
                      <p className="mt-1 text-sm font-black text-amber-700">${formatearMonto(resumenContable.totalPendiente)}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Anulado</p>
                      <p className="mt-1 text-sm font-black text-red-700">${formatearMonto(resumenContable.totalAnulado)}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Pagos</p>
                      <p className="mt-1 text-sm font-black text-black">{resumenContable.pagosRegistrados}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Último pago</p>
                      <button
                        onClick={() => void cargarFichaContableCliente()}
                        disabled={cargandoFichaContable}
                        className="text-[8px] px-2 py-1 rounded-full uppercase tracking-widest bg-gray-100 text-gray-600 disabled:opacity-60"
                      >
                        {cargandoFichaContable ? 'Cargando...' : 'Actualizar'}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] font-black text-black">{resumenContable.ultimoPago === 'N/A' ? 'Sin pagos registrados' : new Date(`${resumenContable.ultimoPago}T00:00:00`).toLocaleDateString('es-VE')}</p>
                  </div>

                  {mensajeFichaContable && (
                    <p className="text-[10px] p-3 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest">
                      {mensajeFichaContable}
                    </p>
                  )}

                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {movimientosContables.map((mov) => (
                      <div key={mov.id} className="p-3 bg-white border border-gray-100 rounded-2xl">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase text-black">{mov.alumnoNombre}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{mov.descripcion}</p>
                          </div>
                          <p className="text-[11px] font-black text-black">${formatearMonto(mov.monto)}</p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                          <p>Fecha: <span className="text-black">{mov.fecha ? new Date(`${mov.fecha}T00:00:00`).toLocaleDateString('es-VE') : 'N/A'}</span></p>
                          <p>Estado: <span className="text-black">{mov.estado}</span></p>
                          <p>Categoría: <span className="text-black">{mov.categoria}</span></p>
                          <p>Método: <span className="text-black">{mov.metodo}</span></p>
                          <p className="col-span-2">Cuenta destino: <span className="text-black">{mov.cuentaDestino}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-200"><CreditCard size={60} strokeWidth={1}/></div>
        )}
      </aside>
    </div>
  )
}