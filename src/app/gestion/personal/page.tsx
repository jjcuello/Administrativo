'use client'
import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { UserPlus, Edit3, UserMinus, Landmark, Smartphone, School, UserCheck, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatUSD } from '@/lib/currency'

const PERSONAL_STORAGE_BUCKET = 'personal-documentos'
const APELLIDO_TEMPORAL = 'SIN APELLIDO (TEMP)'
const CARGO_TEMPORAL = 'SIN CARGO (TEMP)'

const generarCedulaTemporal = () => {
  const semillaTiempo = Date.now().toString().slice(-8)
  const semillaRandom = Math.floor(Math.random() * 90 + 10).toString()
  return `9${semillaTiempo}${semillaRandom}`
}

const normalizarTextoArchivo = (value: string) => (
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
)

const construirSlugPersona = (nombres?: string, apellidos?: string) => {
  const nombre = normalizarTextoArchivo((nombres || '').split(' ')[0] || 'personal')
  const apellido = normalizarTextoArchivo((apellidos || '').split(' ')[0] || 'empleado')
  return `${nombre || 'personal'}.${apellido || 'empleado'}`
}

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      }
    } catch {
      return []
    }
  }
  return []
}

const fileNameFromPath = (path?: string | null) => {
  if (!path) return ''
  const chunks = path.split('/')
  return chunks[chunks.length - 1] || path
}

const isPngFile = (file: File) => (
  file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
)

const isPdfFile = (file: File) => (
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
)

const getErrorText = (error: unknown, fallback = 'Error desconocido') => {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

type EstadoPersonal = 'activo' | 'cesado' | 'eliminado'

const normalizarEstado = (estado?: string | null) => (estado || '').trim().toLowerCase()

const esEstadoActivo = (estado?: string | null) => normalizarEstado(estado) === 'activo'
const esEstadoCesado = (estado?: string | null) => normalizarEstado(estado) === 'cesado'
const esEstadoEliminado = (estado?: string | null) => normalizarEstado(estado) === 'eliminado'

const ESTADOS_CANDIDATOS: Record<EstadoPersonal, string[]> = {
  activo: ['activo', 'ACTIVO'],
  cesado: ['cesado', 'CESADO'],
  eliminado: ['eliminado', 'ELIMINADO'],
}

const esErrorCheckEstadoPersonal = (error: unknown) => (
  getErrorText(error, '').toLowerCase().includes('personal_estado_check')
)

const estaEnPapelera = (registro?: { estado?: string | null; deleted_at?: string | null } | null) => (
  esEstadoEliminado(registro?.estado) || !!(registro?.deleted_at && String(registro.deleted_at).trim())
)

const esErrorColumnaBancoCedula = (error: unknown) => {
  const mensaje = getErrorText(error, '').toLowerCase()
  return (
    mensaje.includes('banco_cedula_titular') &&
    (
      mensaje.includes('column') ||
      mensaje.includes('schema cache') ||
      mensaje.includes('does not exist') ||
      mensaje.includes('no existe')
    )
  )
}

type Personal = {
  id?: string
  nombres?: string
  apellidos?: string
  cedula_tipo?: string
  cedula_numero?: string
  cargo?: string
  estado?: string
  monto_base_mensual?: number
  tipo_personal?: string
  fecha_nacimiento?: string
  correo_personal?: string
  correo_institucional?: string
  telefono?: string
  email?: string
  direccion?: string
  fecha_ingreso?: string
  fecha_egreso?: string
  tipo_contrato?: string
  jornada_laboral?: string
  horario_laboral?: string
  contacto_emergencia_nombre?: string
  contacto_emergencia_telefono?: string
  observaciones_laborales?: string
  foto_carnet_path?: string
  certificado_salud_path?: string
  certificado_foniatrico_path?: string
  certificado_salud_mental_path?: string
  rif?: string
  rif_pdf_path?: string
  soportes_academicos_paths?: unknown
  banco_nombre?: string
  banco_numero_cuenta?: string
  banco_cedula_titular?: string
  pm_telefono?: string
  pm_cedula?: string
  pm_banco?: string
  deleted_at?: string | null
}
type ColegioShort = { id?: string; nombre?: string; tipo?: string }
type PersonalAsignado = { id?: string; nombres?: string; apellidos?: string; cargo?: string; estado?: string; deleted_at?: string | null }

type GrupoNomina = 'administrativo' | 'docente'

export default function GestionPersonal() {
  const router = useRouter()
  const [vista, setVista] = useState('menu') 
  const [modoPapelera, setModoPapelera] = useState(false)
  const [modoCargaRapida, setModoCargaRapida] = useState(true)
  const [seleccionado, setSeleccionado] = useState<Personal | null>(null)
  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', cedula_tipo: 'V', cedula_numero: '',
    cargo: '', tipo_personal: 'profesor', monto_base_mensual: '',
    fecha_nacimiento: '',
    correo_personal: '', correo_institucional: '',
    telefono: '', direccion: '',
    fecha_ingreso: '', fecha_egreso: '',
    tipo_contrato: '', jornada_laboral: '', horario_laboral: '',
    contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
    observaciones_laborales: '',
    foto_carnet_path: '',
    certificado_salud_path: '',
    certificado_foniatrico_path: '',
    certificado_salud_mental_path: '',
    rif: '',
    rif_pdf_path: '',
    banco_nombre: '', banco_numero_cuenta: '',
    banco_cedula_titular: '',
    pm_telefono: '', pm_cedula: '', pm_banco: ''
  })
  const [soportesAcademicosPaths, setSoportesAcademicosPaths] = useState<string[]>([])
  const [fotoCarnetFile, setFotoCarnetFile] = useState<File | null>(null)
  const [certificadoSaludFile, setCertificadoSaludFile] = useState<File | null>(null)
  const [certificadoFoniatricoFile, setCertificadoFoniatricoFile] = useState<File | null>(null)
  const [certificadoSaludMentalFile, setCertificadoSaludMentalFile] = useState<File | null>(null)
  const [rifPdfFile, setRifPdfFile] = useState<File | null>(null)
  const [soportesAcademicosFiles, setSoportesAcademicosFiles] = useState<File[]>([])
  const [archivoInputVersion, setArchivoInputVersion] = useState(0)
  const [listaPersonal, setListaPersonal] = useState<Personal[]>([])
  const [colegios, setColegios] = useState<ColegioShort[]>([])
  const [sedesAsignadas, setSedesAsignadas] = useState<string[]>([])
  const [sedePrincipal, setSedePrincipal] = useState<string>('')
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string | null>(null)
  const [asignadosPorSede, setAsignadosPorSede] = useState<Record<string, PersonalAsignado[]>>({})
  const [conteoAsignadosPorSede, setConteoAsignadosPorSede] = useState<Record<string, number>>({})
  const [gruposNominaAbiertos, setGruposNominaAbiertos] = useState<Record<GrupoNomina, boolean>>({
    administrativo: false,
    docente: false,
  })
  const [cargandoSede, setCargandoSede] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const debounced = useDebounce(busqueda, 350)

  const getEstadoCandidates = (objetivo: EstadoPersonal) => {
    const encontrados = [
      ...listaPersonal.map((item) => String(item.estado || '').trim()).filter(Boolean),
      String(seleccionado?.estado || '').trim(),
    ].filter((estado) => normalizarEstado(estado) === objetivo)

    const candidatos = [...encontrados, ...ESTADOS_CANDIDATOS[objetivo]]
    return Array.from(new Set(candidatos.filter(Boolean)))
  }

  const actualizarEstadoPersonal = async (
    personalId: string,
    objetivo: EstadoPersonal,
    extraPayload: Record<string, unknown> = {}
  ): Promise<{ error: unknown; estadoAplicado: string }> => {
    const candidates = getEstadoCandidates(objetivo)
    let lastError: unknown = null

    for (const estadoValue of candidates) {
      const { error } = await supabase
        .from('personal')
        .update({ ...extraPayload, estado: estadoValue })
        .eq('id', personalId)

      if (!error) {
        return {
          error: null as unknown,
          estadoAplicado: estadoValue,
        }
      }

      lastError = error
      if (!esErrorCheckEstadoPersonal(error)) break
    }

    return {
      error: lastError,
      estadoAplicado: '',
    }
  }

  const insertarPersonalConEstado = async (
    payload: Record<string, unknown>,
    objetivo: EstadoPersonal
  ): Promise<{ error: unknown; id?: string; estadoAplicado: string }> => {
    const candidates = getEstadoCandidates(objetivo)
    let lastError: unknown = null

    for (const estadoValue of candidates) {
      const result = await supabase
        .from('personal')
        .insert([{ ...payload, estado: estadoValue }])
        .select('id')
        .single()

      if (!result.error) {
        return {
          error: null as unknown,
          id: result.data?.id as string | undefined,
          estadoAplicado: estadoValue,
        }
      }

      lastError = result.error
      if (!esErrorCheckEstadoPersonal(result.error)) break
    }

    return {
      error: lastError,
      id: undefined as string | undefined,
      estadoAplicado: '',
    }
  }

  const obtenerGrupoNomina = (personal: Personal): GrupoNomina => {
    const tipo = (personal.tipo_personal || '').trim().toLowerCase()
    const cargo = (personal.cargo || '').trim().toLowerCase()

    if (tipo.includes('admin')) return 'administrativo'
    if (tipo.includes('docen') || tipo.includes('profe') || tipo.includes('maestr')) return 'docente'

    if (cargo.includes('docen') || cargo.includes('profe') || cargo.includes('maestr')) return 'docente'
    if (
      cargo.includes('admin') ||
      cargo.includes('coordin') ||
      cargo.includes('director') ||
      cargo.includes('gerente') ||
      cargo.includes('secret') ||
      cargo.includes('operaci') ||
      cargo.includes('contab') ||
      cargo.includes('rrhh')
    ) {
      return 'administrativo'
    }

    return tipo === 'administrativo' ? 'administrativo' : 'docente'
  }

  const personalPorGrupo = useMemo(() => {
    const administrativo: Personal[] = []
    const docente: Personal[] = []

    for (const personal of listaPersonal) {
      if (obtenerGrupoNomina(personal) === 'administrativo') administrativo.push(personal)
      else docente.push(personal)
    }

    return { administrativo, docente }
  }, [listaPersonal])

  const alternarGrupoNomina = (grupo: GrupoNomina) => {
    setGruposNominaAbiertos(prev => ({ ...prev, [grupo]: !prev[grupo] }))
  }

  const cargarAsignadosPorSede = async (sedeId?: string | null) => {
    if (!sedeId) return
    setCargandoSede(true)
    setErrorCarga('')

    const normalizar = (rows: PersonalAsignado[]) => {
      const m = new Map<string, PersonalAsignado>()
      for (const row of rows) {
        if (!row.id) continue
        if (estaEnPapelera(row)) continue
        if (!m.has(row.id)) m.set(row.id, row)
      }
      return Array.from(m.values()).sort((a, b) => `${a.apellidos || ''} ${a.nombres || ''}`.localeCompare(`${b.apellidos || ''} ${b.nombres || ''}`))
    }

    const idsAsignados = new Set<string>()

    const { data: asignaciones, error: asignErr } = await supabase
      .from('personal_colegios')
      .select('personal_id')
      .eq('colegio_id', sedeId)

    if (!asignErr && asignaciones) {
      for (const item of asignaciones as Array<{ personal_id?: string }>) {
        if (item.personal_id) idsAsignados.add(item.personal_id)
      }
    }

    const { data: grupos, error: gruposErr } = await supabase
      .from('grupos_tardes')
      .select('profesor_id')
      .eq('sede_id', sedeId)

    if (!gruposErr && grupos) {
      for (const item of grupos as Array<{ profesor_id?: string }>) {
        if (item.profesor_id) idsAsignados.add(item.profesor_id)
      }
    }

    if (asignErr && gruposErr) {
      console.error('Error cargando asignaciones por sede', { sedeId, asignErr, gruposErr })
      setErrorCarga('No se pudo obtener personal asignado para la sede seleccionada')
      setAsignadosPorSede(prev => ({ ...prev, [sedeId]: [] }))
      setConteoAsignadosPorSede(prev => ({ ...prev, [sedeId]: 0 }))
      setCargandoSede(false)
      return
    }

    let acumulado: PersonalAsignado[] = []
    const ids = Array.from(idsAsignados)
    if (ids.length > 0) {
      const { data: personalRows, error: personalErr } = await supabase
        .from('personal')
        .select('id, nombres, apellidos, cargo, estado, deleted_at')
        .in('id', ids)

      if (personalErr) {
        // Some environments still lack personal.deleted_at; fallback without that column.
        const { data: personalRowsFallback, error: personalFallbackErr } = await supabase
          .from('personal')
          .select('id, nombres, apellidos, cargo, estado')
          .in('id', ids)

        if (personalFallbackErr) {
          console.error('Error cargando detalle de personal por sede', { sedeId, error: getErrorText(personalFallbackErr), raw: personalFallbackErr })
          setErrorCarga('No se pudo obtener personal asignado para la sede seleccionada')
        } else {
          acumulado = ((personalRowsFallback || []) as PersonalAsignado[]).map(item => ({ ...item, deleted_at: null }))
        }
      } else {
        acumulado = (personalRows || []) as PersonalAsignado[]
      }
    }

    const normalizados = normalizar(acumulado)
    setAsignadosPorSede(prev => ({ ...prev, [sedeId]: normalizados }))
    setConteoAsignadosPorSede(prev => ({ ...prev, [sedeId]: normalizados.length }))
    setCargandoSede(false)
  }

  const precargarConteoAsignados = useCallback(async (sedes: ColegioShort[]) => {
    const ids = sedes.map(s => s.id).filter(Boolean) as string[]
    if (!ids.length) return

    const setsPorSede: Record<string, Set<string>> = {}
    for (const id of ids) setsPorSede[id] = new Set<string>()

    const { data: asignaciones } = await supabase
      .from('personal_colegios')
      .select('colegio_id, personal_id')
      .in('colegio_id', ids)

    if (asignaciones) {
      for (const item of asignaciones as Array<{ colegio_id?: string; personal_id?: string }>) {
        if (item.colegio_id && item.personal_id && setsPorSede[item.colegio_id]) {
          setsPorSede[item.colegio_id].add(item.personal_id)
        }
      }
    }

    const { data: grupos } = await supabase
      .from('grupos_tardes')
      .select('sede_id, profesor_id')
      .in('sede_id', ids)

    if (grupos) {
      for (const item of grupos as Array<{ sede_id?: string; profesor_id?: string }>) {
        if (item.sede_id && item.profesor_id && setsPorSede[item.sede_id]) {
          setsPorSede[item.sede_id].add(item.profesor_id)
        }
      }
    }

    let eliminadosRows: Array<{ id?: string; estado?: string | null; deleted_at?: string | null }> = []

    const { data: eliminados, error: eliminadosError } = await supabase
      .from('personal')
      .select('id, estado, deleted_at')
      .or('estado.eq.eliminado,deleted_at.not.is.null')

    if (!eliminadosError && eliminados) {
      eliminadosRows = eliminados as Array<{ id?: string; estado?: string | null; deleted_at?: string | null }>
    } else {
      const { data: eliminadosFallback } = await supabase
        .from('personal')
        .select('id, estado')
        .ilike('estado', 'eliminado')

      eliminadosRows = (eliminadosFallback || []) as Array<{ id?: string; estado?: string | null; deleted_at?: string | null }>
    }

    const idsEliminados = new Set(
      eliminadosRows
        .filter((item) => estaEnPapelera(item))
        .map(item => item.id)
        .filter(Boolean) as string[]
    )
    if (idsEliminados.size > 0) {
      for (const id of ids) {
        for (const idEliminado of idsEliminados) {
          setsPorSede[id].delete(idEliminado)
        }
      }
    }

    const conteos: Record<string, number> = {}
    for (const id of ids) conteos[id] = setsPorSede[id].size
    setConteoAsignadosPorSede(conteos)
  }, [])

  const toggleSede = async (sedeId?: string) => {
    if (!sedeId) return
    if (sedeSeleccionada === sedeId) {
      setSedeSeleccionada(null)
      return
    }
    setSedeSeleccionada(sedeId)
    if (!asignadosPorSede[sedeId]) {
      await cargarAsignadosPorSede(sedeId)
    }
  }

  const limpiarArchivosPendientes = () => {
    setFotoCarnetFile(null)
    setCertificadoSaludFile(null)
    setCertificadoFoniatricoFile(null)
    setCertificadoSaludMentalFile(null)
    setRifPdfFile(null)
    setSoportesAcademicosFiles([])
    setArchivoInputVersion(prev => prev + 1)
  }

  const limpiarFormulario = () => {
    setFormData({
      nombres: '', apellidos: '', cedula_tipo: 'V', cedula_numero: '',
      cargo: '', tipo_personal: 'profesor', monto_base_mensual: '',
      fecha_nacimiento: '',
      correo_personal: '', correo_institucional: '',
      telefono: '', direccion: '',
      fecha_ingreso: '', fecha_egreso: '',
      tipo_contrato: '', jornada_laboral: '', horario_laboral: '',
      contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
      observaciones_laborales: '',
      foto_carnet_path: '',
      certificado_salud_path: '',
      certificado_foniatrico_path: '',
      certificado_salud_mental_path: '',
      rif: '',
      rif_pdf_path: '',
      banco_nombre: '', banco_numero_cuenta: '',
      banco_cedula_titular: '',
      pm_telefono: '', pm_cedula: '', pm_banco: ''
    })
    setSoportesAcademicosPaths([])
    limpiarArchivosPendientes()
    setSedesAsignadas([])
    setSedePrincipal('')
  }

  const getPublicUrlStorage = (path?: string | null) => {
    if (!path) return ''
    return supabase.storage.from(PERSONAL_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
  }

  const subirArchivoStorage = async (path: string, file: File) => {
    const { error } = await supabase.storage
      .from(PERSONAL_STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined })

    if (error) throw new Error(error.message)
  }

  const manejarArchivoSimple = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
    validator: (file: File) => boolean,
    mensajeError: string
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      setter(null)
      return
    }
    if (!validator(file)) {
      setMensaje(`❌ ${mensajeError}`)
      setter(null)
      return
    }
    setter(file)
  }

  const manejarSoportesAcademicos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const invalid = files.find(file => !isPdfFile(file))
    if (invalid) {
      setMensaje('❌ Todos los soportes académicos deben ser PDF')
      return
    }
    setSoportesAcademicosFiles(prev => [...prev, ...files])
  }

  const removerSoporteAcademico = (index: number) => {
    setSoportesAcademicosFiles(prev => prev.filter((_, idx) => idx !== index))
  }

  const removerSoporteAcademicoGuardado = (path: string) => {
    setSoportesAcademicosPaths(prev => prev.filter(item => item !== path))
  }

  const toggleSedeAsignada = (sedeId?: string) => {
    if (!sedeId) return
    setSedesAsignadas(prev => {
      if (prev.includes(sedeId)) {
        const next = prev.filter(id => id !== sedeId)
        if (sedePrincipal === sedeId) setSedePrincipal(next[0] || '')
        return next
      }
      const next = [...prev, sedeId]
      if (!sedePrincipal) setSedePrincipal(sedeId)
      return next
    })
  }

  const cargarAsignacionesPersonal = async (personalId?: string) => {
    if (!personalId) return
    const { data } = await supabase
      .from('personal_colegios')
      .select('colegio_id, principal')
      .eq('personal_id', personalId)

    const asignadas = (data || []).map((row: { colegio_id?: string }) => row.colegio_id).filter(Boolean) as string[]
    const principal = (data || []).find((row: { principal?: boolean; colegio_id?: string }) => row.principal)?.colegio_id || asignadas[0] || ''
    setSedesAsignadas(asignadas)
    setSedePrincipal(principal)
  }

  const guardarAsignacionesPersonal = async (personalId?: string) => {
    if (!personalId) return

    await supabase.from('personal_colegios').delete().eq('personal_id', personalId)

    if (!sedesAsignadas.length) return

    const principalElegida = sedesAsignadas.includes(sedePrincipal) ? sedePrincipal : sedesAsignadas[0]
    const payload = sedesAsignadas.map(colegioId => ({
      personal_id: personalId,
      colegio_id: colegioId,
      principal: colegioId === principalElegida,
    }))

    await supabase.from('personal_colegios').insert(payload)
  }

  const cargarDatos = useCallback(async (term?: string) => {
    setErrorCarga('')
    const mostrarEliminados = modoPapelera
    if (!term) {
      const { data: pers, error } = await supabase.from('personal').select('*').order('estado', { ascending: true }).order('apellidos', { ascending: true })
      if (error) setErrorCarga(error.message)
      if (pers) {
        const filtrados = (pers as Personal[]).filter((item) => mostrarEliminados ? estaEnPapelera(item) : !estaEnPapelera(item))
        setListaPersonal(filtrados)
      }
    } else {
      const q = `%${term}%`
      const { data: pers, error } = await supabase.from('personal').select('*')
        .or(`nombres.ilike.${q},apellidos.ilike.${q},cedula_numero.ilike.${q}`)
        .order('estado', { ascending: true }).order('apellidos', { ascending: true })
      if (error) setErrorCarga(error.message)
      if (pers) {
        const filtrados = (pers as Personal[]).filter((item) => mostrarEliminados ? estaEnPapelera(item) : !estaEnPapelera(item))
        setListaPersonal(filtrados)
      }
    }

    if (modoPapelera) {
      setSedeSeleccionada(null)
      setAsignadosPorSede({})
      setCargandoSede(false)
      return
    }

    const { data: col, error: colError } = await supabase.from('colegios').select('id, nombre, tipo').order('nombre')
    if (colError) setErrorCarga(colError.message)
    if (col) {
      const sedes = col as ColegioShort[]
      setColegios(sedes)
      await precargarConteoAsignados(sedes)
    }
  }, [modoPapelera, precargarConteoAsignados])

  useEffect(() => { (async () => { await cargarDatos() })() }, [cargarDatos])
  useEffect(() => { (async () => { await cargarDatos(debounced) })() }, [debounced, cargarDatos])

  const manejarSeleccion = (p: Personal) => {
    const seleccionadoCompleto = p.id
      ? (listaPersonal.find((item) => item.id === p.id) || p)
      : p

    setSeleccionado(seleccionadoCompleto)
    setVista('menu')
    setMensaje('')
  }

  const iniciarEdicion = async () => {
    if (!seleccionado) return
    setFormData({ 
      nombres: seleccionado.nombres || '',
      apellidos: seleccionado.apellidos || '',
      monto_base_mensual: seleccionado.monto_base_mensual?.toString() || '',
      cedula_tipo: seleccionado.cedula_tipo || 'V',
      cedula_numero: seleccionado.cedula_numero || '',
      cargo: seleccionado.cargo || '',
      tipo_personal: seleccionado.tipo_personal || 'profesor',
      fecha_nacimiento: seleccionado.fecha_nacimiento || '',
      correo_personal: seleccionado.correo_personal || seleccionado.email || '',
      correo_institucional: seleccionado.correo_institucional || '',
      telefono: seleccionado.telefono || '',
      direccion: seleccionado.direccion || '',
      fecha_ingreso: seleccionado.fecha_ingreso || '',
      fecha_egreso: seleccionado.fecha_egreso || '',
      tipo_contrato: seleccionado.tipo_contrato || '',
      jornada_laboral: seleccionado.jornada_laboral || '',
      horario_laboral: seleccionado.horario_laboral || '',
      contacto_emergencia_nombre: seleccionado.contacto_emergencia_nombre || '',
      contacto_emergencia_telefono: seleccionado.contacto_emergencia_telefono || '',
      observaciones_laborales: seleccionado.observaciones_laborales || '',
      foto_carnet_path: seleccionado.foto_carnet_path || '',
      certificado_salud_path: seleccionado.certificado_salud_path || '',
      certificado_foniatrico_path: seleccionado.certificado_foniatrico_path || '',
      certificado_salud_mental_path: seleccionado.certificado_salud_mental_path || '',
      rif: seleccionado.rif || '',
      rif_pdf_path: seleccionado.rif_pdf_path || '',
      banco_nombre: seleccionado.banco_nombre || '',
      banco_numero_cuenta: seleccionado.banco_numero_cuenta || '',
      banco_cedula_titular: seleccionado.banco_cedula_titular || '',
      pm_telefono: seleccionado.pm_telefono || '',
      pm_cedula: seleccionado.pm_cedula || '',
      pm_banco: seleccionado.pm_banco || '',
    })
    setSoportesAcademicosPaths(parseStringArray(seleccionado.soportes_academicos_paths))
    limpiarArchivosPendientes()
    await cargarAsignacionesPersonal(seleccionado.id)
    setVista('editar')
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    const nombres = formData.nombres.trim()
    const apellidosIngresados = formData.apellidos.trim()
    const cedulaTipo = (formData.cedula_tipo || 'V').trim() || 'V'
    const cedulaNumeroIngresada = formData.cedula_numero.trim()
    const cargoIngresado = formData.cargo.trim()
    const montoBaseMensual = parseFloat(formData.monto_base_mensual || '0')

    if (!nombres || !Number.isFinite(montoBaseMensual)) {
      setMensaje('❌ Completa nombres y sueldo base')
      setCargando(false)
      return
    }

    const apellidos = modoCargaRapida
      ? (apellidosIngresados || seleccionado?.apellidos || APELLIDO_TEMPORAL)
      : apellidosIngresados

    const cedulaNumero = modoCargaRapida
      ? (cedulaNumeroIngresada || seleccionado?.cedula_numero || generarCedulaTemporal())
      : cedulaNumeroIngresada

    const cargo = modoCargaRapida
      ? (cargoIngresado || seleccionado?.cargo || CARGO_TEMPORAL)
      : cargoIngresado

    if (!modoCargaRapida && (!apellidos || !cedulaNumero || !cargo)) {
      setMensaje('❌ En modo normal completa nombres, apellidos, cédula, cargo y sueldo base')
      setCargando(false)
      return
    }

    const usoCedulaTemporal = modoCargaRapida && !cedulaNumeroIngresada && !seleccionado?.cedula_numero
    const usoCargoTemporal = modoCargaRapida && !cargoIngresado && !seleccionado?.cargo
    const usoApellidoTemporal = modoCargaRapida && !apellidosIngresados && !seleccionado?.apellidos

    if (formData.fecha_ingreso && formData.fecha_egreso && formData.fecha_egreso < formData.fecha_ingreso) {
      setMensaje('❌ La fecha de egreso no puede ser menor a la fecha de ingreso')
      setCargando(false)
      return
    }
    const hayDatosAvanzados = !!(
      formData.fecha_nacimiento
      || formData.correo_personal
      || formData.correo_institucional
      || formData.foto_carnet_path
      || formData.certificado_salud_path
      || formData.certificado_foniatrico_path
      || formData.certificado_salud_mental_path
      || formData.rif
      || formData.rif_pdf_path
      || formData.banco_cedula_titular
      || soportesAcademicosPaths.length
      || fotoCarnetFile
      || certificadoSaludFile
      || certificadoFoniatricoFile
      || certificadoSaludMentalFile
      || rifPdfFile
      || soportesAcademicosFiles.length
    )
    const fullPayloadSinCedulaBanco = {
      nombres,
      apellidos,
      cedula_tipo: cedulaTipo,
      cedula_numero: cedulaNumero,
      cargo,
      tipo_personal: formData.tipo_personal,
      monto_base_mensual: montoBaseMensual,
      fecha_nacimiento: formData.fecha_nacimiento || null,
      correo_personal: formData.correo_personal || null,
      correo_institucional: formData.correo_institucional || null,
      telefono: formData.telefono,
      email: formData.correo_personal || null,
      direccion: formData.direccion,
      fecha_ingreso: formData.fecha_ingreso || null,
      fecha_egreso: formData.fecha_egreso || null,
      tipo_contrato: formData.tipo_contrato,
      jornada_laboral: formData.jornada_laboral,
      horario_laboral: formData.horario_laboral,
      contacto_emergencia_nombre: formData.contacto_emergencia_nombre,
      contacto_emergencia_telefono: formData.contacto_emergencia_telefono,
      observaciones_laborales: formData.observaciones_laborales,
      foto_carnet_path: formData.foto_carnet_path || null,
      certificado_salud_path: formData.certificado_salud_path || null,
      certificado_foniatrico_path: formData.certificado_foniatrico_path || null,
      certificado_salud_mental_path: formData.certificado_salud_mental_path || null,
      rif: formData.rif || null,
      rif_pdf_path: formData.rif_pdf_path || null,
      soportes_academicos_paths: soportesAcademicosPaths,
      banco_nombre: formData.banco_nombre,
      banco_numero_cuenta: formData.banco_numero_cuenta,
      pm_telefono: formData.pm_telefono,
      pm_cedula: formData.pm_cedula,
      pm_banco: formData.pm_banco,
    }

    const fullPayload = {
      ...fullPayloadSinCedulaBanco,
      banco_cedula_titular: formData.banco_cedula_titular || null,
    }

    const corePayload = {
      nombres,
      apellidos,
      cedula_tipo: cedulaTipo,
      cedula_numero: cedulaNumero,
      cargo,
      monto_base_mensual: montoBaseMensual,
    }

    let error = null
    let personalId = seleccionado?.id
    let usoFallbackCore = false
    let usoFallbackSinCedulaBanco = false
    if (vista === 'editar') {
      const r1 = await supabase.from('personal').update(fullPayload).eq('id', seleccionado?.id)
      error = r1.error
      if (error && esErrorColumnaBancoCedula(error)) {
        const r1b = await supabase.from('personal').update(fullPayloadSinCedulaBanco).eq('id', seleccionado?.id)
        error = r1b.error
        if (!error) usoFallbackSinCedulaBanco = true
      }
      if (error) {
        const r2 = await supabase.from('personal').update(corePayload).eq('id', seleccionado?.id)
        error = r2.error
        if (!error) usoFallbackCore = true
      }
    } else {
      const r1 = await insertarPersonalConEstado(fullPayload as Record<string, unknown>, 'activo')
      error = r1.error
      if (r1.id) personalId = r1.id
      if (error && esErrorColumnaBancoCedula(error)) {
        const r1b = await insertarPersonalConEstado(fullPayloadSinCedulaBanco as Record<string, unknown>, 'activo')
        error = r1b.error
        if (r1b.id) personalId = r1b.id
        if (!error) usoFallbackSinCedulaBanco = true
      }
      if (error) {
        const r2 = await insertarPersonalConEstado(corePayload as Record<string, unknown>, 'activo')
        error = r2.error
        if (r2.id) personalId = r2.id
        if (!error) usoFallbackCore = true
      }
    }

    if (error) setMensaje('❌ ' + getErrorText(error))
    else {
      let mensajeFinal = vista === 'editar' ? '✅ Personal actualizado' : '✅ Personal registrado'

      if (personalId && !usoFallbackCore) {
        try {
          const slugPersona = construirSlugPersona(formData.nombres, formData.apellidos)
          const updatesDocumentos: Record<string, unknown> = {}

          if (fotoCarnetFile) {
            const path = `${personalId}/foto_carnet_${slugPersona}.png`
            await subirArchivoStorage(path, fotoCarnetFile)
            updatesDocumentos.foto_carnet_path = path
          }

          if (certificadoSaludFile) {
            const path = `${personalId}/certificado_salud_${slugPersona}.pdf`
            await subirArchivoStorage(path, certificadoSaludFile)
            updatesDocumentos.certificado_salud_path = path
          }

          if (certificadoFoniatricoFile) {
            const path = `${personalId}/certificado_foniatrico_${slugPersona}.pdf`
            await subirArchivoStorage(path, certificadoFoniatricoFile)
            updatesDocumentos.certificado_foniatrico_path = path
          }

          if (certificadoSaludMentalFile) {
            const path = `${personalId}/certificado_salud_mental_${slugPersona}.pdf`
            await subirArchivoStorage(path, certificadoSaludMentalFile)
            updatesDocumentos.certificado_salud_mental_path = path
          }

          if (rifPdfFile) {
            const path = `${personalId}/rif_${slugPersona}.pdf`
            await subirArchivoStorage(path, rifPdfFile)
            updatesDocumentos.rif_pdf_path = path
          }

          const soportesSubidos: string[] = []
          if (soportesAcademicosFiles.length > 0) {
            for (let idx = 0; idx < soportesAcademicosFiles.length; idx += 1) {
              const soporte = soportesAcademicosFiles[idx]
              const path = `${personalId}/soportes_academicos/soporte_academico_${slugPersona}_${Date.now()}_${idx + 1}.pdf`
              await subirArchivoStorage(path, soporte)
              soportesSubidos.push(path)
            }
          }

          if (soportesSubidos.length > 0) {
            updatesDocumentos.soportes_academicos_paths = [...soportesAcademicosPaths, ...soportesSubidos]
          }

          if (Object.keys(updatesDocumentos).length > 0) {
            const { error: errorDocs } = await supabase
              .from('personal')
              .update(updatesDocumentos)
              .eq('id', personalId)

            if (errorDocs) throw new Error(errorDocs.message)

            if (typeof updatesDocumentos.foto_carnet_path === 'string') {
              setFormData(prev => ({ ...prev, foto_carnet_path: updatesDocumentos.foto_carnet_path as string }))
            }
            if (typeof updatesDocumentos.certificado_salud_path === 'string') {
              setFormData(prev => ({ ...prev, certificado_salud_path: updatesDocumentos.certificado_salud_path as string }))
            }
            if (typeof updatesDocumentos.certificado_foniatrico_path === 'string') {
              setFormData(prev => ({ ...prev, certificado_foniatrico_path: updatesDocumentos.certificado_foniatrico_path as string }))
            }
            if (typeof updatesDocumentos.certificado_salud_mental_path === 'string') {
              setFormData(prev => ({ ...prev, certificado_salud_mental_path: updatesDocumentos.certificado_salud_mental_path as string }))
            }
            if (typeof updatesDocumentos.rif_pdf_path === 'string') {
              setFormData(prev => ({ ...prev, rif_pdf_path: updatesDocumentos.rif_pdf_path as string }))
            }
            if (Array.isArray(updatesDocumentos.soportes_academicos_paths)) {
              setSoportesAcademicosPaths(updatesDocumentos.soportes_academicos_paths as string[])
            }
          }

          limpiarArchivosPendientes()
        } catch (errorSubida) {
          mensajeFinal = `⚠️ Personal guardado, pero hubo error al subir documentos: ${getErrorText(errorSubida, 'verifica bucket/policies de storage')}`
        }
      }

      if (usoFallbackCore && hayDatosAvanzados) {
        mensajeFinal = '⚠️ Personal guardado sin campos/documentos avanzados. Ejecuta la migración v30.'
      }

      if (usoFallbackSinCedulaBanco && !usoFallbackCore) {
        mensajeFinal = '⚠️ Personal guardado sin cédula titular bancaria. Ejecuta la migración v32.'
      }

      if (usoCedulaTemporal || usoCargoTemporal || usoApellidoTemporal) {
        const detallesTemporales: string[] = []
        if (usoApellidoTemporal) detallesTemporales.push(`apellido temporal "${APELLIDO_TEMPORAL}"`)
        if (usoCedulaTemporal) detallesTemporales.push(`cédula temporal ${cedulaTipo}-${cedulaNumero}`)
        if (usoCargoTemporal) detallesTemporales.push(`cargo temporal "${CARGO_TEMPORAL}"`)

        const avisoTemporal = `Se aplicó modo mínimo temporal (${detallesTemporales.join(' y ')}).`

        if (mensajeFinal.startsWith('⚠️')) {
          mensajeFinal = `${mensajeFinal} ${avisoTemporal}`
        } else {
          mensajeFinal = `⚠️ ${mensajeFinal.replace(/^✅\s*/, '')}. ${avisoTemporal}`
        }
      }

      await guardarAsignacionesPersonal(personalId)
      setMensaje(mensajeFinal)
      await cargarDatos()
      setTimeout(() => {
        setVista('menu')
        setSeleccionado(null)
        limpiarFormulario()
      }, 700)
    }
    setCargando(false)
  }

  const cambiarEstado = async (st: EstadoPersonal) => {
    if (!seleccionado?.id) return
    const { error, estadoAplicado } = await actualizarEstadoPersonal(seleccionado.id, st)
    if (error) {
      setMensaje('❌ ' + getErrorText(error))
      return
    }
    setMensaje(`✅ Estado cambiado a ${(estadoAplicado || st).toUpperCase()}`)
    await cargarDatos()
    setSeleccionado(null)
  }

  const borrarPersonal = async () => {
    if (!seleccionado?.id) return

    const nombreCompleto = `${seleccionado.apellidos || ''} ${seleccionado.nombres || ''}`.trim() || 'este registro'

    const alerta = window.confirm(
      `⚠️ Vas a marcar como ELIMINADO a ${nombreCompleto}.\nNo se borrará físicamente, pero quedará fuera del listado operativo.\n\n¿Deseas continuar?`
    )
    if (!alerta) return

    const reconfirmar = window.confirm('Confirmación final: ¿seguro que deseas aplicar borrado lógico?')
    if (!reconfirmar) return

    setCargando(true)

    const deletedAt = new Date().toISOString()

    const r1 = await actualizarEstadoPersonal(seleccionado.id, 'eliminado', { deleted_at: deletedAt })
    let error = r1.error
    let mensajeFinal = '✅ Personal marcado como eliminado (borrado lógico)'

    if (error) {
      const r2 = await actualizarEstadoPersonal(seleccionado.id, 'cesado', { deleted_at: deletedAt })
      error = r2.error
      if (!error) {
        mensajeFinal = '✅ Personal enviado a papelera (modo compatible con tu base de datos).'
      }
    }

    if (error) {
      const r3 = await actualizarEstadoPersonal(seleccionado.id, 'eliminado')
      error = r3.error
      if (!error) {
        mensajeFinal = '⚠️ Personal marcado como eliminado (sin columna deleted_at).'
      }
    }

    if (error && esErrorCheckEstadoPersonal(error)) {
      const borradoFisico = await supabase
        .from('personal')
        .delete()
        .eq('id', seleccionado.id)

      if (!borradoFisico.error) {
        error = null
        mensajeFinal = '✅ Personal eliminado definitivamente (borrado físico por compatibilidad de constraint).'
      }
    }

    if (error) {
      setMensaje('❌ ' + getErrorText(error))
      setCargando(false)
      return
    }

    setMensaje(mensajeFinal)
    await cargarDatos()
    setSeleccionado(null)
    limpiarFormulario()
    setCargando(false)
  }

  const activarPapelera = () => {
    setModoPapelera(true)
    setVista('menu')
    setSeleccionado(null)
    setMensaje('')
  }

  const salirPapelera = () => {
    setModoPapelera(false)
    setVista('menu')
    setSeleccionado(null)
    setMensaje('')
  }

  const restaurarPersonal = async () => {
    if (!seleccionado?.id) return
    if (!estaEnPapelera(seleccionado)) {
      setMensaje('⚠️ Selecciona un registro eliminado desde la papelera para restaurar')
      return
    }

    const nombreCompleto = `${seleccionado.apellidos || ''} ${seleccionado.nombres || ''}`.trim() || 'este registro'
    const confirmar = window.confirm(`Vas a restaurar a ${nombreCompleto} y volverá al listado activo. ¿Deseas continuar?`)
    if (!confirmar) return

    setCargando(true)

    const r1 = await actualizarEstadoPersonal(seleccionado.id, 'activo', { deleted_at: null })

    let error = r1.error
    let mensajeFinal = '✅ Personal restaurado correctamente'

    if (error) {
      const r2 = await actualizarEstadoPersonal(seleccionado.id, 'activo')
      error = r2.error
      if (!error) {
        mensajeFinal = '⚠️ Personal restaurado sin limpiar deleted_at (columna no disponible).'
      }
    }

    if (error) {
      setMensaje('❌ ' + getErrorText(error))
      setCargando(false)
      return
    }

    setMensaje(mensajeFinal)
    await cargarDatos()
    setSeleccionado(null)
    limpiarFormulario()
    setCargando(false)
  }

  const formatearMonto = formatUSD
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      {/* IZQUIERDA: ÁRBOL */}
      <aside className="md:w-[20%] w-full md:border-r border-b md:border-b-0 border-gray-100 bg-gray-50/50 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase flex items-center gap-2 font-black"><School size={12}/> {modoPapelera ? 'Papelera' : 'Estructura'}</h3>
        {modoPapelera ? (
          <div className="p-4 rounded-2xl border border-gray-200 bg-white text-[10px] text-gray-500 italic">
            Estás en modo papelera. Aquí solo puedes restaurar registros eliminados desde la columna derecha.
          </div>
        ) : (
          <div className="space-y-3">
            {colegios.map(c => (
              <div key={c.id} className="space-y-2">
                <button onClick={() => toggleSede(c.id)} className={`w-full flex items-center justify-between gap-2 p-3 border rounded-2xl shadow-sm text-[11px] font-black transition-all ${sedeSeleccionada === c.id ? 'bg-black text-white border-black' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                  <span className="flex items-center gap-2 text-left"><ChevronRight size={14} className={sedeSeleccionada === c.id ? 'text-gray-300 rotate-90 transition-all' : 'text-gray-300 transition-all'}/> {c.nombre}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${sedeSeleccionada === c.id ? 'bg-white text-black' : 'bg-gray-100 text-gray-500'}`}>{(c.tipo || 'colegio').toUpperCase()}</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${sedeSeleccionada === c.id ? 'bg-yellow-400 text-black' : 'bg-black text-white'}`}>{conteoAsignadosPorSede[c.id || ''] || 0}</span>
                  </span>
                </button>

                {sedeSeleccionada === c.id && (
                  <div className="ml-4 p-3 rounded-xl bg-white border border-gray-100 space-y-2">
                    {cargandoSede && <p className="text-[10px] text-gray-400 italic">Cargando personal asignado...</p>}
                    {!cargandoSede && (asignadosPorSede[c.id || ''] || []).length === 0 && (
                      <p className="text-[10px] text-gray-400 italic">No hay profesores asignados en esta sede.</p>
                    )}
                    {!cargandoSede && (asignadosPorSede[c.id || ''] || []).map(p => (
                      <button key={p.id} onClick={() => p.id && manejarSeleccion({ ...p, id: p.id })} className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-all">
                        <p className="text-[10px] font-black uppercase leading-tight">{p.apellidos}, {p.nombres}</p>
                        <p className="text-[8px] text-gray-400 uppercase">{p.cargo || 'DOCENTE'} · {p.estado || 'activo'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* CENTRO: GESTIÓN */}
      <main className="md:w-[42%] w-full p-6 md:p-12 overflow-y-auto md:border-r border-gray-100 bg-white">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-4 transition-all">
              <ArrowLeft size={14}/> VOLVER ATRÁS
            </button>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">{vista === 'menu' ? (modoPapelera ? 'Papelera Personal' : 'Gestión') : 'Ficha Personal'}</h1>
            <div className="max-w-[628px] mt-4">
              <div className="relative">
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, apellido o cédula..." className="w-full pl-4 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-sm" />
              </div>
            </div>
          </div>
          {vista !== 'menu' && <button onClick={() => setVista('menu')} className="text-[10px] text-gray-400 font-black hover:text-black border-b border-gray-100">CANCELAR</button>}
        </header>

        {vista === 'menu' ? (
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
            <button onClick={() => { setSeleccionado(null); setVista('crear'); limpiarFormulario() }} disabled={modoPapelera} className={`flex items-center gap-6 p-8 bg-black text-white rounded-[2.5rem] shadow-xl transition-all text-left ${modoPapelera ? 'opacity-30' : 'hover:scale-[1.02]'}`}>
              <UserPlus size={28}/> <p className="text-xl italic">1. Nuevo Registro</p>
            </button>
            <button onClick={iniciarEdicion} disabled={modoPapelera || !seleccionado} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${(seleccionado && !modoPapelera) ? 'bg-white border-black shadow-xl' : 'opacity-30'}`}>
              <Edit3 size={28}/> <p className="text-xl italic">2. Editar Datos</p>
            </button>
            <button onClick={() => cambiarEstado(esEstadoActivo(seleccionado?.estado) ? 'cesado' : 'activo')} disabled={modoPapelera || !seleccionado} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${(seleccionado && !modoPapelera) ? (esEstadoActivo(seleccionado?.estado) ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600') : 'opacity-30'}`}>
              {esEstadoActivo(seleccionado?.estado) ? <UserMinus size={28}/> : <UserCheck size={28}/>} <p className="text-xl italic">{esEstadoActivo(seleccionado?.estado) ? '3. Cesar' : '3. Reactivar Personal'}</p>
            </button>
            <button onClick={borrarPersonal} disabled={modoPapelera || !seleccionado || cargando} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${(seleccionado && !modoPapelera) ? 'bg-red-50 border-red-200 text-red-700' : 'opacity-30'}`}>
              <Trash2 size={28}/> <p className="text-xl italic">4. Borrar Personal</p>
            </button>
            <button
              onClick={() => { if (modoPapelera) salirPapelera(); else activarPapelera() }}
              className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${modoPapelera ? 'bg-white border-black shadow-xl' : 'bg-gray-50 border-gray-200 hover:border-black'}`}
            >
              <Trash2 size={28}/> <p className="text-xl italic">{modoPapelera ? '0. Salir de Papelera' : '0. Ver Papelera'}</p>
            </button>
            {modoPapelera && (
              <button onClick={restaurarPersonal} disabled={!seleccionado || cargando || !estaEnPapelera(seleccionado)} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${(seleccionado && estaEnPapelera(seleccionado)) ? 'bg-green-50 border-green-200 text-green-700' : 'opacity-30'}`}>
                <UserCheck size={28}/> <p className="text-xl italic">5. Restaurar Personal</p>
              </button>
            )}
            {seleccionado && (
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50 text-xs">
                <p className="text-gray-400 mb-1">SELECCIONADO</p>
                <p className="font-black">{seleccionado.apellidos}, {seleccionado.nombres}</p>
                <p className="text-gray-500">{seleccionado.cedula_tipo}-{seleccionado.cedula_numero} · {seleccionado.estado}</p>
              </div>
            )}
            {!seleccionado && (
              <div className="p-5 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400 italic">
                {modoPapelera
                  ? 'Selecciona una persona eliminada en la columna derecha para restaurarla.'
                  : 'Selecciona una persona en la columna derecha para habilitar editar/estado.'}
              </div>
            )}
            {mensaje && <p className={`text-center text-[10px] p-3 rounded-2xl font-black ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : mensaje.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{mensaje}</p>}
            {errorCarga && <p className="text-center text-[10px] p-3 bg-red-50 text-red-700 rounded-2xl font-black">❌ {errorCarga}</p>}
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 text-black">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2 md:min-w-[18rem]">
                  <div>
                    <p className="text-[9px] text-gray-400 font-black uppercase">Modo carga rápida</p>
                    <p className="text-[10px] font-black">{modoCargaRapida ? 'ACTIVADO' : 'DESACTIVADO'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModoCargaRapida(prev => !prev)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all ${modoCargaRapida ? 'bg-black' : 'bg-gray-300'}`}
                    aria-pressed={modoCargaRapida}
                    aria-label="Alternar modo de carga rápida"
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${modoCargaRapida ? 'translate-x-8' : 'translate-x-1'}`} />
                  </button>
                </div>

                <button type="submit" disabled={cargando} className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black italic shadow-lg transition-all disabled:opacity-60">GUARDAR CAMBIOS</button>
              </div>

              <p className="text-[9px] text-gray-500 font-black uppercase">
                {modoCargaRapida
                  ? 'Temporal: permite guardar con nombres y sueldo base; completa cédula/cargo/apellido automáticamente si faltan.'
                  : 'Modo normal: requiere nombres, apellidos, cédula, cargo y sueldo base.'}
              </p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 font-black">
              <div className="grid grid-cols-2 gap-4 text-black">
                <input required placeholder="NOMBRES" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} />
                <input required={!modoCargaRapida} placeholder={modoCargaRapida ? 'APELLIDOS (opcional temporal)' : 'APELLIDOS'} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
              </div>
              <div className="grid grid-cols-12 gap-2 text-black">
                <select className="col-span-3 bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.cedula_tipo} onChange={e => setFormData({...formData, cedula_tipo: e.target.value})}>
                  <option value="V">V</option><option value="E">E</option>
                </select>
                <input required={!modoCargaRapida} placeholder={modoCargaRapida ? 'CÉDULA (opcional temporal)' : 'CÉDULA'} className="col-span-9 bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.cedula_numero} onChange={e => setFormData({...formData, cedula_numero: e.target.value})} />
              </div>
              <input required={!modoCargaRapida} placeholder={modoCargaRapida ? 'CARGO (opcional temporal)' : 'CARGO'} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none text-black" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
              <div>
                <p className="mb-2 text-[9px] text-gray-400 font-black uppercase">Tipo de personal</p>
                <select
                  className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none text-black"
                  value={formData.tipo_personal}
                  onChange={e => setFormData({...formData, tipo_personal: e.target.value})}
                >
                  <option value="profesor">Docente</option>
                  <option value="administrativo">Administrativo</option>
                </select>
              </div>
              <div className="relative text-black">
                <span className="absolute left-4 top-4 text-gray-300 font-black">$</span>
                <input required type="number" step="0.01" className="w-full bg-gray-100 rounded-xl p-4 pl-8 text-lg font-black border-none" value={formData.monto_base_mensual} onChange={e => setFormData({...formData, monto_base_mensual: e.target.value})} />
              </div>
              <div>
                <p className="mb-2 text-[9px] text-gray-400 font-black uppercase">Fecha de nacimiento</p>
                <input type="date" className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none text-black" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3 text-black">
              <p className="text-[9px] text-gray-400 font-black uppercase">Datos laborales</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Fecha de ingreso</p>
                  <input type="date" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.fecha_ingreso} onChange={e => setFormData({...formData, fecha_ingreso: e.target.value})} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Fecha de egreso</p>
                  <input type="date" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.fecha_egreso} onChange={e => setFormData({...formData, fecha_egreso: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="TIPO DE CONTRATO" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.tipo_contrato} onChange={e => setFormData({...formData, tipo_contrato: e.target.value})} />
                <input placeholder="JORNADA LABORAL" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.jornada_laboral} onChange={e => setFormData({...formData, jornada_laboral: e.target.value})} />
              </div>
              <input placeholder="HORARIO / TURNO" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.horario_laboral} onChange={e => setFormData({...formData, horario_laboral: e.target.value})} />
              <input placeholder="TELÉFONO DE CONTACTO" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="CORREO PERSONAL" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.correo_personal} onChange={e => setFormData({...formData, correo_personal: e.target.value})} />
                <input placeholder="CORREO INSTITUCIONAL" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.correo_institucional} onChange={e => setFormData({...formData, correo_institucional: e.target.value})} />
              </div>
              <input placeholder="DIRECCIÓN" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3 text-black">
              <p className="text-[9px] text-gray-400 font-black uppercase">Documentos y soportes</p>

              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-black uppercase mb-2">Foto tipo carnet (PNG)</p>
                <input key={`foto-carnet-${archivoInputVersion}`} type="file" accept=".png,image/png" className="w-full text-[10px]" onChange={e => manejarArchivoSimple(e, setFotoCarnetFile, isPngFile, 'La foto de carnet debe ser PNG')} />
                {fotoCarnetFile && <p className="mt-2 text-[9px] text-gray-500">Pendiente: {fotoCarnetFile.name}</p>}
                {formData.foto_carnet_path && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <a href={getPublicUrlStorage(formData.foto_carnet_path)} target="_blank" rel="noreferrer" className="text-[9px] text-blue-700 underline">{fileNameFromPath(formData.foto_carnet_path)}</a>
                    <button type="button" className="text-[9px] text-red-600" onClick={() => setFormData({ ...formData, foto_carnet_path: '' })}>Quitar</button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-black uppercase mb-2">Certificado de salud (PDF)</p>
                <input key={`cert-salud-${archivoInputVersion}`} type="file" accept=".pdf,application/pdf" className="w-full text-[10px]" onChange={e => manejarArchivoSimple(e, setCertificadoSaludFile, isPdfFile, 'El Certificado de Salud debe ser PDF')} />
                {certificadoSaludFile && <p className="mt-2 text-[9px] text-gray-500">Pendiente: {certificadoSaludFile.name}</p>}
                {formData.certificado_salud_path && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <a href={getPublicUrlStorage(formData.certificado_salud_path)} target="_blank" rel="noreferrer" className="text-[9px] text-blue-700 underline">{fileNameFromPath(formData.certificado_salud_path)}</a>
                    <button type="button" className="text-[9px] text-red-600" onClick={() => setFormData({ ...formData, certificado_salud_path: '' })}>Quitar</button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-black uppercase mb-2">Certificado foniátrico (PDF)</p>
                <input key={`cert-foniatrico-${archivoInputVersion}`} type="file" accept=".pdf,application/pdf" className="w-full text-[10px]" onChange={e => manejarArchivoSimple(e, setCertificadoFoniatricoFile, isPdfFile, 'El Certificado Foniátrico debe ser PDF')} />
                {certificadoFoniatricoFile && <p className="mt-2 text-[9px] text-gray-500">Pendiente: {certificadoFoniatricoFile.name}</p>}
                {formData.certificado_foniatrico_path && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <a href={getPublicUrlStorage(formData.certificado_foniatrico_path)} target="_blank" rel="noreferrer" className="text-[9px] text-blue-700 underline">{fileNameFromPath(formData.certificado_foniatrico_path)}</a>
                    <button type="button" className="text-[9px] text-red-600" onClick={() => setFormData({ ...formData, certificado_foniatrico_path: '' })}>Quitar</button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] text-gray-400 font-black uppercase mb-2">Certificado salud mental (PDF)</p>
                <input key={`cert-salud-mental-${archivoInputVersion}`} type="file" accept=".pdf,application/pdf" className="w-full text-[10px]" onChange={e => manejarArchivoSimple(e, setCertificadoSaludMentalFile, isPdfFile, 'El Certificado de Salud Mental debe ser PDF')} />
                {certificadoSaludMentalFile && <p className="mt-2 text-[9px] text-gray-500">Pendiente: {certificadoSaludMentalFile.name}</p>}
                {formData.certificado_salud_mental_path && (
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <a href={getPublicUrlStorage(formData.certificado_salud_mental_path)} target="_blank" rel="noreferrer" className="text-[9px] text-blue-700 underline">{fileNameFromPath(formData.certificado_salud_mental_path)}</a>
                    <button type="button" className="text-[9px] text-red-600" onClick={() => setFormData({ ...formData, certificado_salud_mental_path: '' })}>Quitar</button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100 space-y-2">
                <p className="text-[9px] text-gray-400 font-black uppercase">RIF</p>
                <input placeholder="RIF (ALFANUMÉRICO)" className="w-full bg-gray-50 rounded-xl p-3 text-xs font-bold border-none" value={formData.rif} onChange={e => setFormData({...formData, rif: e.target.value})} />
                <input key={`rif-pdf-${archivoInputVersion}`} type="file" accept=".pdf,application/pdf" className="w-full text-[10px]" onChange={e => manejarArchivoSimple(e, setRifPdfFile, isPdfFile, 'El soporte PDF del RIF debe ser PDF')} />
                {rifPdfFile && <p className="text-[9px] text-gray-500">Pendiente: {rifPdfFile.name}</p>}
                {formData.rif_pdf_path && (
                  <div className="flex items-center justify-between gap-3">
                    <a href={getPublicUrlStorage(formData.rif_pdf_path)} target="_blank" rel="noreferrer" className="text-[9px] text-blue-700 underline">{fileNameFromPath(formData.rif_pdf_path)}</a>
                    <button type="button" className="text-[9px] text-red-600" onClick={() => setFormData({ ...formData, rif_pdf_path: '' })}>Quitar</button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100 space-y-2">
                <p className="text-[9px] text-gray-400 font-black uppercase">Soportes académicos (PDF, múltiples, opcional)</p>
                <input key={`soportes-academicos-${archivoInputVersion}`} type="file" multiple accept=".pdf,application/pdf" className="w-full text-[10px]" onChange={manejarSoportesAcademicos} />

                {soportesAcademicosFiles.length > 0 && (
                  <div className="space-y-1">
                    {soportesAcademicosFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3">
                        <p className="text-[9px] text-gray-500">Pendiente: {file.name}</p>
                        <button type="button" className="text-[9px] text-red-600" onClick={() => removerSoporteAcademico(idx)}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}

                {soportesAcademicosPaths.length > 0 && (
                  <div className="space-y-1">
                    {soportesAcademicosPaths.map(path => (
                      <div key={path} className="flex items-center justify-between gap-3">
                        <a href={getPublicUrlStorage(path)} target="_blank" rel="noreferrer" className="text-[9px] text-blue-700 underline">{fileNameFromPath(path)}</a>
                        <button type="button" className="text-[9px] text-red-600" onClick={() => removerSoporteAcademicoGuardado(path)}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3 text-black">
              <p className="text-[9px] text-gray-400 font-black uppercase">Contacto de emergencia</p>
              <input placeholder="NOMBRE CONTACTO EMERGENCIA" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.contacto_emergencia_nombre} onChange={e => setFormData({...formData, contacto_emergencia_nombre: e.target.value})} />
              <input placeholder="TELÉFONO CONTACTO EMERGENCIA" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.contacto_emergencia_telefono} onChange={e => setFormData({...formData, contacto_emergencia_telefono: e.target.value})} />
              <textarea placeholder="OBSERVACIONES LABORALES" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none min-h-24" value={formData.observaciones_laborales} onChange={e => setFormData({...formData, observaciones_laborales: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-2 text-black">
                <p className="text-[9px] text-gray-400 font-black uppercase"><Landmark size={12} className="inline mr-1"/> Datos Banco</p>
                <input placeholder="NOMBRE BANCO" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.banco_nombre} onChange={e => setFormData({...formData, banco_nombre: e.target.value})} />
                <input placeholder="CÉDULA TITULAR" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.banco_cedula_titular} onChange={e => setFormData({...formData, banco_cedula_titular: e.target.value})} />
                <input placeholder="NRO CUENTA (20 DÍGITOS)" className="w-full bg-white rounded-xl p-3 text-[10px] font-mono border-none" value={formData.banco_numero_cuenta} onChange={e => setFormData({...formData, banco_numero_cuenta: e.target.value})} />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-2 text-black">
                <p className="text-[9px] text-gray-400 font-black uppercase"><Smartphone size={12} className="inline mr-1"/> Pago Móvil</p>
                <input placeholder="TELÉFONO" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.pm_telefono} onChange={e => setFormData({...formData, pm_telefono: e.target.value})} />
                <input placeholder="CÉDULA TITULAR" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.pm_cedula} onChange={e => setFormData({...formData, pm_cedula: e.target.value})} />
                <input placeholder="BANCO RECEPTOR" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.pm_banco} onChange={e => setFormData({...formData, pm_banco: e.target.value})} />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3 text-black">
              <p className="text-[9px] text-gray-400 font-black uppercase"><School size={12} className="inline mr-1"/> Asignación de Sedes (múltiple)</p>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {colegios.map((s) => {
                  const checked = !!s.id && sedesAsignadas.includes(s.id)
                  return (
                    <label key={s.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-gray-100 cursor-pointer">
                      <span className="text-[10px] font-black uppercase">{s.nombre}</span>
                      <input type="checkbox" checked={checked} onChange={() => toggleSedeAsignada(s.id)} />
                    </label>
                  )
                })}
              </div>
              {sedesAsignadas.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-2">Sede principal</p>
                  <select className="w-full bg-white rounded-xl p-3 text-xs font-black border border-gray-100" value={sedePrincipal} onChange={e => setSedePrincipal(e.target.value)}>
                    {sedesAsignadas.map(id => {
                      const sede = colegios.find(s => s.id === id)
                      return <option key={id} value={id}>{sede?.nombre || id}</option>
                    })}
                  </select>
                </div>
              )}
            </div>
            <button disabled={cargando} className="w-full bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all disabled:opacity-60">GUARDAR CAMBIOS</button>
            {mensaje && <p className={`text-center text-[10px] p-4 rounded-2xl font-black ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : mensaje.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{mensaje}</p>}
          </form>
        )}
      </main>
      <aside className="md:w-[38%] w-full bg-gray-50/20 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase font-black">{modoPapelera ? 'Papelera de Personal' : 'Nómina Registrada'}</h3>
        <div className="space-y-3">
          {listaPersonal.length === 0 && (
            <p className="p-4 rounded-2xl border border-dashed border-gray-200 text-[10px] text-gray-400 italic">
              {modoPapelera ? 'No hay personal eliminado para mostrar.' : 'No hay personal registrado para mostrar.'}
            </p>
          )}

          {listaPersonal.length > 0 && ([
            { key: 'administrativo' as GrupoNomina, titulo: 'Personal Administrativo', data: personalPorGrupo.administrativo },
            { key: 'docente' as GrupoNomina, titulo: 'Personal Docente', data: personalPorGrupo.docente },
          ]).map((grupo) => (
            <div key={grupo.key} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => alternarGrupoNomina(grupo.key)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <span className="text-[10px] text-gray-500 tracking-[0.12em] uppercase font-black">{grupo.titulo}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-black">{grupo.data.length}</span>
                  <ChevronRight size={14} className={`text-gray-400 transition-all ${gruposNominaAbiertos[grupo.key] ? 'rotate-90' : ''}`} />
                </span>
              </button>

              {gruposNominaAbiertos[grupo.key] && (
                <div className="border-t border-gray-100 divide-y divide-gray-100 max-h-[26rem] overflow-y-auto">
                  {grupo.data.length === 0 && (
                    <p className="px-4 py-3 text-[10px] text-gray-400 italic">Sin personal en este grupo.</p>
                  )}

                  {grupo.data.map((p) => {
                    const eliminado = estaEnPapelera(p)
                    const cesado = esEstadoCesado(p.estado)
                    const activo = seleccionado?.id === p.id

                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => manejarSeleccion(p)}
                        className={`w-full px-4 py-3 transition-all text-left flex items-center justify-between gap-3 ${activo ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'} ${cesado ? 'opacity-70' : ''} ${eliminado ? 'opacity-70' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className={`text-[8px] font-black uppercase ${activo ? 'text-gray-300' : 'text-gray-400'}`}>
                            {eliminado ? '🗑️ ELIMINADO' : cesado ? '⚠️ CESADO' : p.cargo || (grupo.key === 'docente' ? 'DOCENTE' : 'ADMINISTRATIVO')}
                          </p>
                          <p className="text-[11px] font-black uppercase leading-tight truncate">{`${p.apellidos || ''}, ${p.nombres || ''}`.replace(/^,\s*/, '')}</p>
                          <p className={`text-[10px] font-mono ${activo ? 'text-gray-300' : 'text-gray-300'}`}>{p.cedula_tipo}-{p.cedula_numero}</p>
                        </div>
                        <p className={`text-sm italic font-black shrink-0 ${activo ? 'text-white' : 'text-black'}`}>${formatearMonto(p.monto_base_mensual)}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
