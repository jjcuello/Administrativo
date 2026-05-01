'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BadgeDollarSign, ChevronDown, Loader2, RefreshCcw } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatUSD } from '@/lib/currency'

type PersonalNomina = {
  id: string
  nombres: string | null
  apellidos: string | null
  cargo: string | null
  tipo_personal: string | null
  monto_base_mensual: number | null
  estado: string | null
  pm_telefono?: string | null
  telefono?: string | null
}

type GrupoNomina = 'docente' | 'administrativo'

type AjusteNomina = {
  inasistencias: number
  cantina: number
  otrasDeducciones: number
  extra: number
  comentario: string
  comentarioExtra: string
}

type AjusteMontoCampo = 'inasistencias' | 'cantina' | 'otrasDeducciones' | 'extra'

type EstadoPagoNomina = 'pendiente' | 'saldado' | 'vencido'

type NominaRow = {
  id: string
  nombre: string
  cargo: string
  telefonoWhatsapp: string | null
  grupo: GrupoNomina
  base: number
  inasistencias: number
  cantina: number
  otrasDeducciones: number
  extra: number
  comentario: string
  comentarioExtra: string
  descuentos: number
  netoBase: number
  neto: number
  pagoPeriodo: number
  arrastrePrevio: number
  adelantos: number
  adeudado: number
  saldoFavor: number
  estadoPago: EstadoPagoNomina
}

type NominaMensualItem = {
  id: string
  periodo_ym: string
  estado: string | null
  total_base: number | null
  total_descuentos: number | null
  total_neto: number | null
  updated_at: string | null
}

type NominaDetalleGuardado = {
  personal_id: string
  descuento_inasistencias: number | null
  descuento_cantina: number | null
  descuento_otras?: number | null
  monto_extra?: number | null
  comentario_descuento: string | null
  comentario_extra?: string | null
}

const EMPTY_AJUSTE_NOMINA: AjusteNomina = {
  inasistencias: 0,
  cantina: 0,
  otrasDeducciones: 0,
  extra: 0,
  comentario: '',
  comentarioExtra: '',
}

type AbonoTipoNomina = 'base' | 'extra'

type AbonoDetalleNomina = {
  id: string
  personalId: string
  tipo: AbonoTipoNomina
  montoUsd: number
  fechaPago: string | null
  referencia: string | null
  observaciones: string | null
  cuentaNombre: string | null
  categoriaNombre: string | null
}

type AdelantosPeriodoResult = {
  adelantos: Record<string, number>
  pagosPeriodo: Record<string, number>
  arrastrePrevio: Record<string, number>
  abonosPeriodo: Record<string, AbonoDetalleNomina[]>
  error: string | null
}

type CargaDetalleNominaResult = {
  detalle: NominaDetalleGuardado[]
  warning: string | null
  error: string | null
}

const normalizeText = (value?: string | null) => (
  (value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-VE')
)

const isDocenteCargo = (cargo?: string | null) => {
  const normalized = normalizeText(cargo)
  return (
    normalized.includes('prof')
    || normalized.includes('docent')
    || normalized.includes('maestr')
    || normalized.includes('instructor')
  )
}

const getGrupoPersonal = (persona: Pick<PersonalNomina, 'tipo_personal' | 'cargo'>): GrupoNomina => {
  const tipoPersonal = normalizeText(persona.tipo_personal)

  if (tipoPersonal.includes('admin')) return 'administrativo'
  if (tipoPersonal.includes('docent') || tipoPersonal.includes('prof') || tipoPersonal.includes('maestr') || tipoPersonal.includes('instructor')) {
    return 'docente'
  }

  return isDocenteCargo(persona.cargo) ? 'docente' : 'administrativo'
}

const getNombrePersonal = (persona: PersonalNomina) => {
  const apellidos = (persona.apellidos || '').trim()
  const nombres = (persona.nombres || '').trim()
  const full = `${apellidos}, ${nombres}`.replace(/^,\s*/, '').trim()
  return full || 'Sin nombre'
}

const getSafeMonto = (value?: number | null) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
}

const toWhatsappPhone = (raw?: string | null) => {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return null

  const normalized = digits.startsWith('00') ? digits.slice(2) : digits
  if (normalized.startsWith('58') && normalized.length >= 10) return normalized
  if (normalized.startsWith('0') && normalized.length >= 10) return `58${normalized.slice(1)}`
  if (normalized.length === 10) return `58${normalized}`
  if (normalized.length >= 10) return normalized

  return null
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const PERIODO_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

const MESES_ANIO_ESCOLAR = [
  { month: 9, label: 'Septiembre' },
  { month: 10, label: 'Octubre' },
  { month: 11, label: 'Noviembre' },
  { month: 12, label: 'Diciembre' },
  { month: 1, label: 'Enero' },
  { month: 2, label: 'Febrero' },
  { month: 3, label: 'Marzo' },
  { month: 4, label: 'Abril' },
  { month: 5, label: 'Mayo' },
  { month: 6, label: 'Junio' },
  { month: 7, label: 'Julio' },
  { month: 8, label: 'Agosto' },
]

type PeriodoYm = {
  year: number
  month: number
}

type AnioEscolar = {
  startYear: number
  endYear: number
}

const parsePeriodoYm = (periodo: string): PeriodoYm | null => {
  if (!PERIODO_REGEX.test(periodo)) return null

  const [year, month] = periodo.split('-').map(Number)
  return { year, month }
}

const toPeriodoYm = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

const getCurrentSchoolYearStart = () => {
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  return month >= 9 ? year : year - 1
}

const parseAnioEscolar = (value: string): AnioEscolar | null => {
  const match = value.match(/^(\d{4})-(\d{4})$/)
  if (!match) return null

  const startYear = Number(match[1])
  const endYear = Number(match[2])
  if (endYear !== startYear + 1) return null

  return { startYear, endYear }
}

const getAnioEscolarFromPeriodo = (periodo: string) => {
  const parsed = parsePeriodoYm(periodo)
  const startYear = parsed ? (parsed.month >= 9 ? parsed.year : parsed.year - 1) : getCurrentSchoolYearStart()
  return `${startYear}-${startYear + 1}`
}

const buildPeriodoFromAnioEscolar = (anioEscolar: string, month: number) => {
  const parsedSchoolYear = parseAnioEscolar(anioEscolar)
  const safeMonth = Math.min(Math.max(month, 1), 12)

  if (!parsedSchoolYear) {
    const fallbackStartYear = getCurrentSchoolYearStart()
    const year = safeMonth >= 9 ? fallbackStartYear : fallbackStartYear + 1
    return toPeriodoYm(year, safeMonth)
  }

  const year = safeMonth >= 9 ? parsedSchoolYear.startYear : parsedSchoolYear.endYear
  return toPeriodoYm(year, safeMonth)
}

const getPeriodoLabel = (periodo: string) => {
  const parsed = parsePeriodoYm(periodo)
  if (!parsed) return periodo

  const formatted = new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' }).format(
    new Date(parsed.year, parsed.month - 1, 1)
  )

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const getPeriodoLabelUpper = (periodo: string) => {
  const parsed = parsePeriodoYm(periodo)
  if (!parsed) return periodo.toUpperCase()

  const month = new Intl.DateTimeFormat('es-VE', { month: 'long' }).format(
    new Date(parsed.year, parsed.month - 1, 1)
  ).toUpperCase()

  return `${month} ${parsed.year}`
}

const isCategoriaNominaEgreso = (nombre?: string | null) => {
  const normalized = normalizeText(nombre)
  return normalized.includes('nomina base') || normalized.includes('nomina extra')
}

const getTipoAbonoNomina = (nombreCategoria?: string | null): AbonoTipoNomina => {
  const normalized = normalizeText(nombreCategoria)
  return normalized.includes('nomina extra') ? 'extra' : 'base'
}

const formatMontoMensaje = (value: number) => {
  const safe = roundMoney(getSafeMonto(value))
  const formatted = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)

  return `$${formatted}`
}

const formatFechaCortaMensaje = (fecha?: string | null) => {
  if (!fecha) return ''

  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return fecha

  return `${match[3]}/${match[2]}`
}

const formatDatePart = (value: number) => String(value).padStart(2, '0')

const getPeriodoDateRange = (periodo: string) => {
  const parsed = parsePeriodoYm(periodo)
  if (!parsed) return null

  const lastDay = new Date(parsed.year, parsed.month, 0).getDate()
  return {
    desde: `${periodo}-01`,
    hasta: `${periodo}-${formatDatePart(lastDay)}`,
  }
}

const getTodayYmd = () => {
  const now = new Date()
  return `${now.getFullYear()}-${formatDatePart(now.getMonth() + 1)}-${formatDatePart(now.getDate())}`
}

const getFechaCorteAdelantos = (periodo: string) => {
  const rango = getPeriodoDateRange(periodo)
  if (!rango) return null

  const today = getTodayYmd()
  if (today < rango.desde) return null

  return today
}

const getFechaLimitePagoNomina = (periodo: string) => {
  const parsed = parsePeriodoYm(periodo)
  if (!parsed) return null

  return new Date(parsed.year, parsed.month, 6, 23, 59, 59, 999)
}

const getEstadoPagoLabel = (estadoPago: EstadoPagoNomina) => {
  if (estadoPago === 'saldado') return 'Pago completo'
  if (estadoPago === 'vencido') return 'Pago vencido'
  return 'Pendiente de pago'
}

const getErrorText = (error: unknown, fallback: string) => {
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

const isMissingColumnError = (error: unknown, columnName: string) => {
  const code = (error && typeof error === 'object' && 'code' in error)
    ? String((error as { code?: unknown }).code || '')
    : ''

  const message = normalizeText(getErrorText(error, ''))
  const column = normalizeText(columnName)

  if (code === '42703') {
    return message.includes(column)
  }

  return message.includes(column) && (message.includes('does not exist') || message.includes('not exist'))
}

const buildAjustesSnapshot = (personas: PersonalNomina[], ajustesMap: Record<string, AjusteNomina>) => {
  return personas
    .map((persona) => {
      const ajuste = ajustesMap[persona.id] || EMPTY_AJUSTE_NOMINA
      const inasistencias = roundMoney(getSafeMonto(ajuste.inasistencias))
      const cantina = roundMoney(getSafeMonto(ajuste.cantina))
      const otrasDeducciones = roundMoney(getSafeMonto(ajuste.otrasDeducciones))
      const extra = roundMoney(getSafeMonto(ajuste.extra))
      const comentario = (ajuste.comentario || '').replace(/\s+/g, ' ').trim()
      const comentarioExtra = (ajuste.comentarioExtra || '').replace(/\s+/g, ' ').trim()
      return `${persona.id}:${inasistencias}:${cantina}:${otrasDeducciones}:${extra}:${comentario}:${comentarioExtra}`
    })
    .join('|')
}

const getNominaDraftStorageKey = (periodo: string) => `nomina_draft_${periodo}`

export default function GestionNominaPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const periodoUrl = searchParams.get('periodo') || ''
  const [personal, setPersonal] = useState<PersonalNomina[]>([])
  const [ajustes, setAjustes] = useState<Record<string, AjusteNomina>>({})
  const [adelantosPorPersonal, setAdelantosPorPersonal] = useState<Record<string, number>>({})
  const [pagosPeriodoPorPersonal, setPagosPeriodoPorPersonal] = useState<Record<string, number>>({})
  const [arrastrePrevioPorPersonal, setArrastrePrevioPorPersonal] = useState<Record<string, number>>({})
  const [abonosPeriodoPorPersonal, setAbonosPeriodoPorPersonal] = useState<Record<string, AbonoDetalleNomina[]>>({})
  const [loading, setLoading] = useState(false)
  const [guardandoNomina, setGuardandoNomina] = useState(false)
  const [guardandoBorrador, setGuardandoBorrador] = useState(false)
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [indiceActual, setIndiceActual] = useState(0)
  const [mensajeAutomaticoVisible, setMensajeAutomaticoVisible] = useState(false)
  const [historialNominas, setHistorialNominas] = useState<NominaMensualItem[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [abriendoNominaId, setAbriendoNominaId] = useState<string | null>(null)
  const [snapshotAjustesGuardados, setSnapshotAjustesGuardados] = useState('')
  const [ajustesInputTemporal, setAjustesInputTemporal] = useState<Record<string, string>>({})
  const [editorExtraEmpleadoId, setEditorExtraEmpleadoId] = useState<string | null>(null)
  const [estadoCopiaLink, setEstadoCopiaLink] = useState<'idle' | 'ok' | 'error'>('idle')
  const autoSaveTimeoutRef = useRef<number | null>(null)

  const periodoNomina = useMemo(() => {
    if (PERIODO_REGEX.test(periodoUrl)) return periodoUrl
    return new Date().toISOString().slice(0, 7)
  }, [periodoUrl])

  const actualizarPeriodoNomina = useCallback((nextPeriodo: string) => {
    if (!PERIODO_REGEX.test(nextPeriodo)) return

    const nextParams = new URLSearchParams(searchParamsString)
    nextParams.set('periodo', nextPeriodo)

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [pathname, router, searchParamsString])

  useEffect(() => {
    if (PERIODO_REGEX.test(periodoUrl)) return

    const nextParams = new URLSearchParams(searchParamsString)
    nextParams.set('periodo', periodoNomina)

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [pathname, periodoNomina, periodoUrl, router, searchParamsString])

  const anioEscolarSeleccionado = useMemo(() => getAnioEscolarFromPeriodo(periodoNomina), [periodoNomina])

  const opcionesAnioEscolar = useMemo(() => {
    const currentStartYear = getCurrentSchoolYearStart()
    const selectedSchoolYear = parseAnioEscolar(anioEscolarSeleccionado)

    const startYears = new Set<number>([
      currentStartYear,
      currentStartYear - 1,
      currentStartYear - 2,
      currentStartYear - 3,
    ])

    if (selectedSchoolYear) {
      startYears.add(selectedSchoolYear.startYear)
    }

    return Array.from(startYears)
      .sort((a, b) => b - a)
      .map((startYear) => ({
        value: `${startYear}-${startYear + 1}`,
        label: `${startYear} - ${startYear + 1}`,
      }))
  }, [anioEscolarSeleccionado])

  const periodoLabel = useMemo(() => getPeriodoLabel(periodoNomina), [periodoNomina])

  const construirAjustesIniciales = (personas: PersonalNomina[]) => {
    const ajustesBase: Record<string, AjusteNomina> = {}
    for (const persona of personas) {
      ajustesBase[persona.id] = { ...EMPTY_AJUSTE_NOMINA }
    }
    return ajustesBase
  }

  const recuperarAjustesBorrador = (periodo: string, ajustesBase: Record<string, AjusteNomina>) => {
    if (typeof window === 'undefined') {
      return { ajustes: ajustesBase, recuperados: 0 }
    }

    try {
      const raw = window.localStorage.getItem(getNominaDraftStorageKey(periodo))
      if (!raw) {
        return { ajustes: ajustesBase, recuperados: 0 }
      }

      const parsed = JSON.parse(raw) as Record<string, Partial<AjusteNomina>>
      const ajustesConBorrador: Record<string, AjusteNomina> = { ...ajustesBase }
      let recuperados = 0

      for (const [personalId, ajuste] of Object.entries(parsed)) {
        if (!ajustesConBorrador[personalId]) continue
        if (!ajuste || typeof ajuste !== 'object') continue

        ajustesConBorrador[personalId] = {
          inasistencias: getSafeMonto(ajuste.inasistencias ?? 0),
          cantina: getSafeMonto(ajuste.cantina ?? 0),
          otrasDeducciones: getSafeMonto(ajuste.otrasDeducciones ?? 0),
          extra: getSafeMonto(ajuste.extra ?? 0),
          comentario: typeof ajuste.comentario === 'string' ? ajuste.comentario : '',
          comentarioExtra: typeof ajuste.comentarioExtra === 'string' ? ajuste.comentarioExtra : '',
        }
        recuperados += 1
      }

      return { ajustes: ajustesConBorrador, recuperados }
    } catch {
      return { ajustes: ajustesBase, recuperados: 0 }
    }
  }

  const cargarPersonalActivosOrdenados = async (): Promise<{
    data: PersonalNomina[]
    docentes: number
    administrativos: number
    error: string | null
  }> => {
    const { data, error } = await supabase
      .from('personal')
      .select('*')
      .order('apellidos')
      .order('nombres')

    if (error) {
      return {
        data: [],
        docentes: 0,
        administrativos: 0,
        error: error.message,
      }
    }

    const dataPersonal = (data as PersonalNomina[] | null) ?? []
    const activos = dataPersonal.filter((persona) => normalizeText(persona.estado) !== 'cesado')

    const docentes = activos
      .filter((persona) => getGrupoPersonal(persona) === 'docente')
      .sort((a, b) => getNombrePersonal(a).localeCompare(getNombrePersonal(b), 'es'))

    const administrativos = activos
      .filter((persona) => getGrupoPersonal(persona) === 'administrativo')
      .sort((a, b) => getNombrePersonal(a).localeCompare(getNombrePersonal(b), 'es'))

    return {
      data: [...docentes, ...administrativos],
      docentes: docentes.length,
      administrativos: administrativos.length,
      error: null,
    }
  }

  const cargarDetalleNominaCompat = async (nominaId: string): Promise<CargaDetalleNominaResult> => {
    const selectV50 = 'personal_id, descuento_inasistencias, descuento_cantina, descuento_otras, monto_extra, comentario_descuento, comentario_extra'
    const selectV24 = 'personal_id, descuento_inasistencias, descuento_cantina, monto_extra, comentario_descuento, comentario_extra'

    const { data, error } = await supabase
      .from('nominas_mensuales_detalle')
      .select(selectV50)
      .eq('nomina_id', nominaId)

    if (!error) {
      return {
        detalle: (data as NominaDetalleGuardado[] | null) ?? [],
        warning: null,
        error: null,
      }
    }

    const faltaColumnaOtras = isMissingColumnError(error, 'descuento_otras')
    const faltanColumnasExtras = isMissingColumnError(error, 'monto_extra') || isMissingColumnError(error, 'comentario_extra')

    if (!faltaColumnaOtras && !faltanColumnasExtras) {
      return {
        detalle: [],
        warning: null,
        error: getErrorText(error, 'No se pudo abrir el detalle de la nómina guardada.'),
      }
    }

    if (faltaColumnaOtras && !faltanColumnasExtras) {
      const { data: v24Data, error: v24Error } = await supabase
        .from('nominas_mensuales_detalle')
        .select(selectV24)
        .eq('nomina_id', nominaId)

      if (v24Error) {
        return {
          detalle: [],
          warning: null,
          error: getErrorText(v24Error, 'No se pudo abrir el detalle de la nómina guardada.'),
        }
      }

      const rows = ((v24Data as NominaDetalleGuardado[] | null) ?? []).map((row) => ({
        ...row,
        descuento_otras: 0,
      }))

      return {
        detalle: rows,
        warning: 'La BD aún no tiene la columna descuento_otras en detalle de nómina. Ejecuta la migración v50 para persistir Otras Deducciones.',
        error: null,
      }
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('nominas_mensuales_detalle')
      .select('personal_id, descuento_inasistencias, descuento_cantina, comentario_descuento')
      .eq('nomina_id', nominaId)

    if (legacyError) {
      return {
        detalle: [],
        warning: null,
        error: getErrorText(legacyError, 'No se pudo abrir el detalle de la nómina guardada.'),
      }
    }

    const legacyRows = ((legacyData as Array<{
      personal_id: string
      descuento_inasistencias: number | null
      descuento_cantina: number | null
      comentario_descuento: string | null
    }> | null) ?? []).map((row) => ({
      personal_id: row.personal_id,
      descuento_inasistencias: row.descuento_inasistencias,
      descuento_cantina: row.descuento_cantina,
      descuento_otras: 0,
      comentario_descuento: row.comentario_descuento,
      monto_extra: 0,
      comentario_extra: '',
    }))

    return {
      detalle: legacyRows,
      warning: 'La BD aún no tiene columnas recientes en detalle de nómina. Ejecuta las migraciones v24 (extras) y v50 (otras deducciones).',
      error: null,
    }
  }

  const cargarAdelantosPeriodo = useCallback(async (periodo: string, personalIds: string[]): Promise<AdelantosPeriodoResult> => {
    const emptyResult: AdelantosPeriodoResult = {
      adelantos: {},
      pagosPeriodo: {},
      arrastrePrevio: {},
      abonosPeriodo: {},
      error: null,
    }

    if (!PERIODO_REGEX.test(periodo) || personalIds.length === 0) {
      return emptyResult
    }

    const fechaCorte = getFechaCorteAdelantos(periodo)
    if (!fechaCorte) {
      return emptyResult
    }

    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_egreso')
      .select('id, nombre')
      .is('deleted_at', null)

    if (categoriasError) {
      return {
        ...emptyResult,
        error: getErrorText(categoriasError, 'No se pudieron consultar categorías de egresos de nómina.'),
      }
    }

    const categoriasNominaIds = ((categoriasData as Array<{ id: string; nombre: string | null }> | null) ?? [])
      .filter((categoria) => isCategoriaNominaEgreso(categoria.nombre))
      .map((categoria) => categoria.id)

    const categoriaNombrePorId = new Map<string, string>()
    for (const categoria of ((categoriasData as Array<{ id: string; nombre: string | null }> | null) ?? [])) {
      categoriaNombrePorId.set(categoria.id, categoria.nombre || '')
    }

    if (categoriasNominaIds.length === 0) {
      return emptyResult
    }

    const warnings: string[] = []

    const { data: cuentasData, error: cuentasError } = await supabase
      .from('cuentas_financieras')
      .select('id, nombre')
      .is('deleted_at', null)

    const cuentaNombrePorId = new Map<string, string>()

    if (cuentasError) {
      warnings.push('No se pudieron consultar nombres de cuentas para detallar abonos.')
    } else {
      for (const cuenta of ((cuentasData as Array<{ id: string; nombre: string | null }> | null) ?? [])) {
        cuentaNombrePorId.set(cuenta.id, cuenta.nombre || '')
      }
    }

    const rangoPeriodo = getPeriodoDateRange(periodo)
    if (!rangoPeriodo) {
      return emptyResult
    }

    let usaPeriodoImputado = true
    let pagosData: Array<{
      id: string | null
      profesor_id: string | null
      categoria_id: string | null
      cuenta_id: string | null
      monto_usd: number | null
      referencia: string | null
      observaciones: string | null
      created_at: string | null
      periodo_nomina_ym?: string | null
      fecha_pago: string | null
    }> = []

    const pagosConPeriodo = await supabase
      .from('egresos')
      .select('id, profesor_id, categoria_id, cuenta_id, monto_usd, referencia, observaciones, created_at, periodo_nomina_ym, fecha_pago')
      .in('profesor_id', personalIds)
      .in('categoria_id', categoriasNominaIds)
      .not('periodo_nomina_ym', 'is', null)
      .lte('periodo_nomina_ym', periodo)
      .lte('fecha_pago', fechaCorte)
      .order('fecha_pago', { ascending: true })
      .order('created_at', { ascending: true })

    if (pagosConPeriodo.error) {
      if (!isMissingColumnError(pagosConPeriodo.error, 'periodo_nomina_ym')) {
        return {
          ...emptyResult,
          error: getErrorText(pagosConPeriodo.error, 'No se pudieron consultar adelantos de nómina del período.'),
        }
      }

      usaPeriodoImputado = false
      warnings.push('La BD aún no tiene periodo_nomina_ym en egresos. Se usan pagos por fecha de pago del mes (sin arrastre contable exacto).')

      const pagosLegacy = await supabase
        .from('egresos')
        .select('id, profesor_id, categoria_id, cuenta_id, monto_usd, referencia, observaciones, created_at, fecha_pago')
        .in('profesor_id', personalIds)
        .in('categoria_id', categoriasNominaIds)
        .gte('fecha_pago', rangoPeriodo.desde)
        .lte('fecha_pago', fechaCorte)
        .order('fecha_pago', { ascending: true })
        .order('created_at', { ascending: true })

      if (pagosLegacy.error) {
        return {
          ...emptyResult,
          error: getErrorText(pagosLegacy.error, 'No se pudieron consultar adelantos de nómina del período.'),
        }
      }

      pagosData = ((pagosLegacy.data as Array<{
        id: string | null
        profesor_id: string | null
        categoria_id: string | null
        cuenta_id: string | null
        monto_usd: number | null
        referencia: string | null
        observaciones: string | null
        created_at: string | null
        fecha_pago: string | null
      }> | null) ?? []).map((pago) => ({
        id: pago.id,
        profesor_id: pago.profesor_id,
        categoria_id: pago.categoria_id,
        cuenta_id: pago.cuenta_id,
        monto_usd: pago.monto_usd,
        referencia: pago.referencia,
        observaciones: pago.observaciones,
        created_at: pago.created_at,
        fecha_pago: pago.fecha_pago,
        periodo_nomina_ym: null,
      }))
    } else {
      pagosData = (pagosConPeriodo.data as Array<{
        id: string | null
        profesor_id: string | null
        categoria_id: string | null
        cuenta_id: string | null
        monto_usd: number | null
        referencia: string | null
        observaciones: string | null
        created_at: string | null
        periodo_nomina_ym: string | null
        fecha_pago: string | null
      }> | null) ?? []
    }

    const { data: nominasPreviasData, error: nominasPreviasError } = await supabase
      .from('nominas_mensuales')
      .select('id, periodo_ym')
      .is('deleted_at', null)
      .lt('periodo_ym', periodo)

    if (nominasPreviasError) {
      return {
        ...emptyResult,
        error: getErrorText(nominasPreviasError, 'No se pudieron consultar nóminas previas para calcular arrastres.'),
      }
    }

    const nominasPrevias = (nominasPreviasData as Array<{ id: string; periodo_ym?: string | null }> | null) ?? []
    const nominaIds = nominasPrevias.map((row) => row.id)
    const periodosConNominaPrevia = new Set(
      nominasPrevias
        .map((row) => (row.periodo_ym || '').trim())
        .filter((periodoYm) => PERIODO_REGEX.test(periodoYm))
    )
    const obligacionesPrevias: Record<string, number> = {}

    if (nominaIds.length > 0) {
      let detallePrevio: Array<{
        personal_id: string | null
        neto_base: number | null
        neto_total?: number | null
      }> = []

      const detalleConNetoTotal = await supabase
        .from('nominas_mensuales_detalle')
        .select('personal_id, neto_base, neto_total')
        .in('nomina_id', nominaIds)
        .in('personal_id', personalIds)

      if (detalleConNetoTotal.error) {
        if (!isMissingColumnError(detalleConNetoTotal.error, 'neto_total')) {
          return {
            ...emptyResult,
            error: getErrorText(detalleConNetoTotal.error, 'No se pudieron consultar obligaciones previas de nómina.'),
          }
        }

        warnings.push('La BD aún no tiene neto_total en detalle de nómina. Se usa neto_base para cálculos históricos.')

        const detalleLegacy = await supabase
          .from('nominas_mensuales_detalle')
          .select('personal_id, neto_base')
          .in('nomina_id', nominaIds)
          .in('personal_id', personalIds)

        if (detalleLegacy.error) {
          return {
            ...emptyResult,
            error: getErrorText(detalleLegacy.error, 'No se pudieron consultar obligaciones previas de nómina.'),
          }
        }

        detallePrevio = ((detalleLegacy.data as Array<{
          personal_id: string | null
          neto_base: number | null
        }> | null) ?? []).map((row) => ({
          personal_id: row.personal_id,
          neto_base: row.neto_base,
          neto_total: null,
        }))
      } else {
        detallePrevio = (detalleConNetoTotal.data as Array<{
          personal_id: string | null
          neto_base: number | null
          neto_total?: number | null
        }> | null) ?? []
      }

      for (const row of detallePrevio) {
        const personalId = row.personal_id || ''
        if (!personalId) continue

        const netoDetalle = roundMoney(getSafeMonto(row.neto_total ?? row.neto_base))
        if (!netoDetalle) continue

        obligacionesPrevias[personalId] = roundMoney((obligacionesPrevias[personalId] || 0) + netoDetalle)
      }
    }

    const pagos = pagosData
    const personalSet = new Set(personalIds)
    const pagosPrevios: Record<string, number> = {}
    const pagosPeriodo: Record<string, number> = {}
    const abonosPeriodo: Record<string, AbonoDetalleNomina[]> = {}
    const periodosArrastreIgnorados = new Set<string>()

    for (const pago of pagos) {
      const personalId = pago.profesor_id || ''

      if (!personalId || !personalSet.has(personalId)) continue

      const monto = roundMoney(getSafeMonto(pago.monto_usd))
      if (!monto) continue

      const categoriaNombre = categoriaNombrePorId.get(pago.categoria_id || '') || null
      const tipoAbono = getTipoAbonoNomina(categoriaNombre)
      const cuentaNombre = cuentaNombrePorId.get(pago.cuenta_id || '') || null

      if (!usaPeriodoImputado) {
        pagosPeriodo[personalId] = roundMoney((pagosPeriodo[personalId] || 0) + monto)

        if (!abonosPeriodo[personalId]) {
          abonosPeriodo[personalId] = []
        }

        abonosPeriodo[personalId].push({
          id: pago.id || `${personalId}:${pago.fecha_pago || ''}:${monto}`,
          personalId,
          tipo: tipoAbono,
          montoUsd: monto,
          fechaPago: pago.fecha_pago,
          referencia: pago.referencia,
          observaciones: pago.observaciones,
          cuentaNombre,
          categoriaNombre,
        })
        continue
      }

      const periodoPago = (pago.periodo_nomina_ym || '').trim()
      if (!PERIODO_REGEX.test(periodoPago)) continue

      if (periodoPago === periodo) {
        pagosPeriodo[personalId] = roundMoney((pagosPeriodo[personalId] || 0) + monto)

        if (!abonosPeriodo[personalId]) {
          abonosPeriodo[personalId] = []
        }

        abonosPeriodo[personalId].push({
          id: pago.id || `${personalId}:${pago.fecha_pago || ''}:${monto}`,
          personalId,
          tipo: tipoAbono,
          montoUsd: monto,
          fechaPago: pago.fecha_pago,
          referencia: pago.referencia,
          observaciones: pago.observaciones,
          cuentaNombre,
          categoriaNombre,
        })
      } else {
        // If a payment references a prior period with no saved nomina, we cannot
        // reliably decide whether it is debt settlement or true advance. Do not
        // carry it into current-month saldo to avoid false "pagado" states.
        if (!periodosConNominaPrevia.has(periodoPago)) {
          if (!periodosArrastreIgnorados.has(periodoPago)) {
            warnings.push(`Se ignoró arrastre de pago imputado a ${periodoPago} porque no existe nómina consolidada para ese período.`)
            periodosArrastreIgnorados.add(periodoPago)
          }
          continue
        }

        pagosPrevios[personalId] = roundMoney((pagosPrevios[personalId] || 0) + monto)
      }
    }

    for (const personalId of Object.keys(abonosPeriodo)) {
      abonosPeriodo[personalId].sort((a, b) => {
        const fechaA = a.fechaPago || ''
        const fechaB = b.fechaPago || ''
        if (fechaA === fechaB) return a.id.localeCompare(b.id)
        return fechaA.localeCompare(fechaB)
      })
    }

    const adelantos: Record<string, number> = {}
    const arrastrePrevio: Record<string, number> = {}

    for (const personalId of personalIds) {
      const saldoPrevio = roundMoney((pagosPrevios[personalId] || 0) - (obligacionesPrevias[personalId] || 0))
      arrastrePrevio[personalId] = roundMoney(Math.max(saldoPrevio, 0))
      adelantos[personalId] = roundMoney(Math.max(saldoPrevio + (pagosPeriodo[personalId] || 0), 0))
    }

    const warningsUnicos = Array.from(new Set(warnings.map((warning) => warning.trim()).filter(Boolean)))
    const resumenWarnings = warningsUnicos.length > 3
      ? `${warningsUnicos.slice(0, 3).join(' | ')} | +${warningsUnicos.length - 3} aviso(s) adicional(es).`
      : warningsUnicos.join(' | ')

    return {
      adelantos,
      pagosPeriodo,
      arrastrePrevio,
      abonosPeriodo,
      error: resumenWarnings || null,
    }
  }, [])

  const cargarHistorialNominas = async (silent = false) => {
    setLoadingHistorial(true)

    const { data, error } = await supabase
      .from('nominas_mensuales')
      .select('id, periodo_ym, estado, total_base, total_descuentos, total_neto, updated_at')
      .is('deleted_at', null)
      .order('periodo_ym', { ascending: false })
      .limit(24)

    if (error) {
      if (!silent) {
        setMensaje(`❌ ${getErrorText(error, 'No se pudo cargar el historial de nómina.')}`)
      }
      setLoadingHistorial(false)
      return
    }

    setHistorialNominas((data as NominaMensualItem[] | null) ?? [])
    setLoadingHistorial(false)
  }

  const abrirNominaGuardada = async (nomina: NominaMensualItem) => {
    setAbriendoNominaId(nomina.id)
    setLoading(true)
    setMensaje('')

    try {
      const basePersonal = await cargarPersonalActivosOrdenados()

      if (basePersonal.error) {
        setMensaje(`❌ ${basePersonal.error}`)
        setPersonal([])
        setAjustes({})
        setAdelantosPorPersonal({})
        setPagosPeriodoPorPersonal({})
        setArrastrePrevioPorPersonal({})
        setAbonosPeriodoPorPersonal({})
        setIndiceActual(0)
        setSnapshotAjustesGuardados('')
        return
      }

      const ajustesIniciales = construirAjustesIniciales(basePersonal.data)

      const detalleResult = await cargarDetalleNominaCompat(nomina.id)
      if (detalleResult.error) {
        setMensaje(`❌ ${detalleResult.error}`)
        return
      }

      const detalleRows = detalleResult.detalle
      let ajustesRecuperados = 0

      for (const row of detalleRows) {
        if (!ajustesIniciales[row.personal_id]) continue

        ajustesIniciales[row.personal_id] = {
          inasistencias: getSafeMonto(row.descuento_inasistencias),
          cantina: getSafeMonto(row.descuento_cantina),
          otrasDeducciones: getSafeMonto(row.descuento_otras),
          extra: getSafeMonto(row.monto_extra),
          comentario: (row.comentario_descuento || '').trim(),
          comentarioExtra: (row.comentario_extra || '').trim(),
        }
        ajustesRecuperados += 1
      }

      const borrador = recuperarAjustesBorrador(nomina.periodo_ym, ajustesIniciales)
      const adelantosPeriodo = await cargarAdelantosPeriodo(
        nomina.periodo_ym,
        basePersonal.data.map((persona) => persona.id)
      )

      actualizarPeriodoNomina(nomina.periodo_ym)
      setPersonal(basePersonal.data)
      setAjustes(borrador.ajustes)
      setAdelantosPorPersonal(adelantosPeriodo.adelantos)
      setPagosPeriodoPorPersonal(adelantosPeriodo.pagosPeriodo)
      setArrastrePrevioPorPersonal(adelantosPeriodo.arrastrePrevio)
      setAbonosPeriodoPorPersonal(adelantosPeriodo.abonosPeriodo)
      setIndiceActual(0)
      setSnapshotAjustesGuardados(buildAjustesSnapshot(basePersonal.data, ajustesIniciales))
      setMensaje(
        `✅ Nómina ${nomina.periodo_ym} abierta (${basePersonal.data.length} empleado(s), ${ajustesRecuperados} ajuste(s) recuperado(s)).`
        + (borrador.recuperados > 0 ? ` Borrador local aplicado (${borrador.recuperados} empleado(s)).` : '')
        + (detalleResult.warning ? ` ⚠️ ${detalleResult.warning}` : '')
        + (adelantosPeriodo.error ? ` ⚠️ ${adelantosPeriodo.error}` : '')
      )
    } catch (error) {
      setMensaje(`❌ ${getErrorText(error, 'No se pudo abrir la nómina guardada.')}`)
    } finally {
      setLoading(false)
      setAbriendoNominaId(null)
    }
  }

  const cargarPersonalNomina = async () => {
    setLoading(true)
    setMensaje('')

    const basePersonal = await cargarPersonalActivosOrdenados()

    if (basePersonal.error) {
      setMensaje(`❌ ${basePersonal.error}`)
      setPersonal([])
      setAjustes({})
      setAdelantosPorPersonal({})
      setPagosPeriodoPorPersonal({})
      setArrastrePrevioPorPersonal({})
      setAbonosPeriodoPorPersonal({})
      setIndiceActual(0)
      setSnapshotAjustesGuardados('')
      setLoading(false)
      return
    }

    const ordenados = basePersonal.data
    const ajustesIniciales = construirAjustesIniciales(ordenados)
    let ajustesDesdeBd = 0
    let nominaGuardadaPeriodo = false

    const { data: nominaPeriodo, error: nominaPeriodoError } = await supabase
      .from('nominas_mensuales')
      .select('id')
      .eq('periodo_ym', periodoNomina)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (nominaPeriodoError) {
      setMensaje(`❌ ${getErrorText(nominaPeriodoError, 'No se pudo consultar la nómina guardada del período.')}`)
      setAdelantosPorPersonal({})
      setPagosPeriodoPorPersonal({})
      setArrastrePrevioPorPersonal({})
      setAbonosPeriodoPorPersonal({})
      setLoading(false)
      return
    }

    const nominaGuardada = (nominaPeriodo as { id?: string } | null) ?? null
    let detalleSchemaWarning: string | null = null

    if (nominaGuardada?.id) {
      nominaGuardadaPeriodo = true
      const detalleResult = await cargarDetalleNominaCompat(nominaGuardada.id)
      if (detalleResult.error) {
        setMensaje(`❌ ${detalleResult.error}`)
        setLoading(false)
        return
      }

      detalleSchemaWarning = detalleResult.warning

      const detalleRows = detalleResult.detalle

      for (const row of detalleRows) {
        if (!ajustesIniciales[row.personal_id]) continue

        ajustesIniciales[row.personal_id] = {
          inasistencias: getSafeMonto(row.descuento_inasistencias),
          cantina: getSafeMonto(row.descuento_cantina),
          otrasDeducciones: getSafeMonto(row.descuento_otras),
          extra: getSafeMonto(row.monto_extra),
          comentario: (row.comentario_descuento || '').trim(),
          comentarioExtra: (row.comentario_extra || '').trim(),
        }
        ajustesDesdeBd += 1
      }
    }

    const borrador = nominaGuardadaPeriodo
      ? { ajustes: ajustesIniciales, recuperados: 0 }
      : recuperarAjustesBorrador(periodoNomina, ajustesIniciales)

    const adelantosPeriodo = await cargarAdelantosPeriodo(
      periodoNomina,
      ordenados.map((persona) => persona.id)
    )

    setPersonal(ordenados)
    setAjustes(borrador.ajustes)
    setAdelantosPorPersonal(adelantosPeriodo.adelantos)
    setPagosPeriodoPorPersonal(adelantosPeriodo.pagosPeriodo)
    setArrastrePrevioPorPersonal(adelantosPeriodo.arrastrePrevio)
    setAbonosPeriodoPorPersonal(adelantosPeriodo.abonosPeriodo)
    setIndiceActual(0)
    setSnapshotAjustesGuardados(buildAjustesSnapshot(ordenados, ajustesIniciales))

    if (ordenados.length === 0) {
      setMensaje('⚠️ No hay personal activo para procesar nómina.')
    } else if (nominaGuardadaPeriodo) {
      setMensaje(
        `✅ Personal cargado: ${ordenados.length} empleados (${basePersonal.docentes} docente(s), ${basePersonal.administrativos} administrativo(s)).`
        + ` Nómina del período recuperada desde BD (${ajustesDesdeBd} ajuste(s)).`
        + (detalleSchemaWarning ? ` ⚠️ ${detalleSchemaWarning}` : '')
        + (adelantosPeriodo.error ? ` ⚠️ ${adelantosPeriodo.error}` : '')
      )
    } else {
      setMensaje(
        `✅ Personal cargado: ${ordenados.length} empleados (${basePersonal.docentes} docente(s), ${basePersonal.administrativos} administrativo(s)).`
        + (borrador.recuperados > 0 ? ` Borrador local recuperado para ${borrador.recuperados} empleado(s).` : '')
        + (adelantosPeriodo.error ? ` ⚠️ ${adelantosPeriodo.error}` : '')
      )
    }

    setLoading(false)
    void cargarHistorialNominas(true)
  }

  const cargarPersonalNominaRef = useRef(cargarPersonalNomina)
  cargarPersonalNominaRef.current = cargarPersonalNomina

  const nominaRows = useMemo<NominaRow[]>(() => {
    const fechaLimitePago = getFechaLimitePagoNomina(periodoNomina)
    const periodoVencido = Boolean(fechaLimitePago && Date.now() > fechaLimitePago.getTime())

    return personal.map((persona) => {
      const ajuste = ajustes[persona.id] || EMPTY_AJUSTE_NOMINA
      const base = getSafeMonto(persona.monto_base_mensual)
      const inasistencias = Math.max(ajuste.inasistencias || 0, 0)
      const cantina = Math.max(ajuste.cantina || 0, 0)
      const otrasDeducciones = Math.max(ajuste.otrasDeducciones || 0, 0)
      const extra = Math.max(ajuste.extra || 0, 0)
      const descuentos = inasistencias + cantina + otrasDeducciones
      const netoBase = Math.max(base - descuentos, 0)
      const descuentoTrasladadoExtras = Math.max(descuentos - base, 0)
      const extraNeto = Math.max(extra - descuentoTrasladadoExtras, 0)
      const neto = roundMoney(netoBase + extraNeto)
      const pagoPeriodo = roundMoney(getSafeMonto(pagosPeriodoPorPersonal[persona.id] || 0))
      const arrastrePrevio = roundMoney(getSafeMonto(arrastrePrevioPorPersonal[persona.id] || 0))
      const adelantos = roundMoney(getSafeMonto(adelantosPorPersonal[persona.id] || 0))
      const adeudado = roundMoney(Math.max(neto - adelantos, 0))
      const saldoFavor = roundMoney(Math.max(adelantos - neto, 0))
      const estadoPago: EstadoPagoNomina = adeudado <= 0
        ? 'saldado'
        : periodoVencido
          ? 'vencido'
          : 'pendiente'

      return {
        id: persona.id,
        nombre: getNombrePersonal(persona),
        cargo: (persona.cargo || 'Sin cargo').trim() || 'Sin cargo',
        telefonoWhatsapp: toWhatsappPhone(persona.pm_telefono || persona.telefono),
        grupo: getGrupoPersonal(persona),
        base,
        inasistencias,
        cantina,
        otrasDeducciones,
        extra,
        comentario: ajuste.comentario || '',
        comentarioExtra: ajuste.comentarioExtra || '',
        descuentos,
        netoBase,
        neto,
        pagoPeriodo,
        arrastrePrevio,
        adelantos,
        adeudado,
        saldoFavor,
        estadoPago,
      }
    })
  }, [personal, ajustes, pagosPeriodoPorPersonal, arrastrePrevioPorPersonal, adelantosPorPersonal, periodoNomina])

  const snapshotAjustesActual = useMemo(
    () => buildAjustesSnapshot(personal, ajustes),
    [personal, ajustes]
  )

  const hayCambiosPendientes = nominaRows.length > 0 && snapshotAjustesActual !== snapshotAjustesGuardados
  const textoBotonFinalizar = guardandoNomina
    ? 'Guardando nómina'
    : hayCambiosPendientes
      ? 'Guardar cambios pendientes'
      : 'Finalizar nómina'
  const clasesBotonFinalizar = hayCambiosPendientes
    ? 'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-black bg-black px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xl transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60'
    : 'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-700 shadow-sm transition-all hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60'
  const personalIdsNomina = useMemo(() => personal.map((persona) => persona.id), [personal])

  const limpiarProgramacionAutosave = () => {
    if (!autoSaveTimeoutRef.current) return
    clearTimeout(autoSaveTimeoutRef.current)
    autoSaveTimeoutRef.current = null
  }

  const programarGuardadoBorrador = () => {
    if (typeof window === 'undefined') return
    if (loading || guardandoNomina || guardandoBorrador || !nominaRows.length) return

    limpiarProgramacionAutosave()
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveTimeoutRef.current = null
      void guardarBorradorNomina(true)
    }, 1200)
  }

  const refrescarMovimientosNomina = useCallback(async (silent = true) => {
    if (!PERIODO_REGEX.test(periodoNomina)) return
    if (personalIdsNomina.length === 0) return

    const adelantosPeriodo = await cargarAdelantosPeriodo(periodoNomina, personalIdsNomina)
    setAdelantosPorPersonal(adelantosPeriodo.adelantos)
    setPagosPeriodoPorPersonal(adelantosPeriodo.pagosPeriodo)
    setArrastrePrevioPorPersonal(adelantosPeriodo.arrastrePrevio)
    setAbonosPeriodoPorPersonal(adelantosPeriodo.abonosPeriodo)

    if (adelantosPeriodo.error && !silent) {
      setMensaje(`⚠️ ${adelantosPeriodo.error}`)
    }
  }, [periodoNomina, personalIdsNomina, cargarAdelantosPeriodo])

  useEffect(() => {
    return () => {
      limpiarProgramacionAutosave()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!PERIODO_REGEX.test(periodoNomina)) return
    if (personal.length === 0) return

    const ajustesPayload: Record<string, AjusteNomina> = {}
    for (const persona of personal) {
      const ajuste = ajustes[persona.id] || EMPTY_AJUSTE_NOMINA
      ajustesPayload[persona.id] = {
        inasistencias: getSafeMonto(ajuste.inasistencias),
        cantina: getSafeMonto(ajuste.cantina),
        otrasDeducciones: getSafeMonto(ajuste.otrasDeducciones),
        extra: getSafeMonto(ajuste.extra),
        comentario: ajuste.comentario || '',
        comentarioExtra: ajuste.comentarioExtra || '',
      }
    }

    try {
      window.localStorage.setItem(getNominaDraftStorageKey(periodoNomina), JSON.stringify(ajustesPayload))
    } catch {}
  }, [periodoNomina, personal, ajustes])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let activo = true

    const timerId = window.setTimeout(() => {
      if (!activo) return

      setCargandoPeriodo(true)
      void (async () => {
        try {
          await cargarPersonalNominaRef.current()
        } finally {
          if (activo) {
            setCargandoPeriodo(false)
          }
        }
      })()
    }, 0)

    return () => {
      activo = false
      window.clearTimeout(timerId)
    }
  }, [periodoNomina])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onEgresosRefresh = () => {
      void refrescarMovimientosNomina(false)
    }

    window.addEventListener('egresos:refresh', onEgresosRefresh)
    return () => window.removeEventListener('egresos:refresh', onEgresosRefresh)
  }, [refrescarMovimientosNomina])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!PERIODO_REGEX.test(periodoNomina)) return
    if (personalIdsNomina.length === 0) return

    const intervalId = window.setInterval(() => {
      void refrescarMovimientosNomina(true)
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [periodoNomina, personalIdsNomina, refrescarMovimientosNomina])

  const grupoDocente = useMemo(() => nominaRows.filter((row) => row.grupo === 'docente'), [nominaRows])
  const grupoAdministrativo = useMemo(() => nominaRows.filter((row) => row.grupo === 'administrativo'), [nominaRows])

  const resumen = useMemo(() => {
    const sum = (rows: NominaRow[], key: keyof Pick<NominaRow, 'base' | 'descuentos' | 'netoBase' | 'extra' | 'neto' | 'adelantos' | 'adeudado' | 'saldoFavor'>) => (
      rows.reduce((acc, row) => acc + row[key], 0)
    )

    return {
      docente: {
        base: sum(grupoDocente, 'base'),
        descuentos: sum(grupoDocente, 'descuentos'),
        netoBase: sum(grupoDocente, 'netoBase'),
        extra: sum(grupoDocente, 'extra'),
        neto: sum(grupoDocente, 'neto'),
        adelantos: sum(grupoDocente, 'adelantos'),
        adeudado: sum(grupoDocente, 'adeudado'),
        saldoFavor: sum(grupoDocente, 'saldoFavor'),
      },
      administrativo: {
        base: sum(grupoAdministrativo, 'base'),
        descuentos: sum(grupoAdministrativo, 'descuentos'),
        netoBase: sum(grupoAdministrativo, 'netoBase'),
        extra: sum(grupoAdministrativo, 'extra'),
        neto: sum(grupoAdministrativo, 'neto'),
        adelantos: sum(grupoAdministrativo, 'adelantos'),
        adeudado: sum(grupoAdministrativo, 'adeudado'),
        saldoFavor: sum(grupoAdministrativo, 'saldoFavor'),
      },
      general: {
        base: sum(nominaRows, 'base'),
        descuentos: sum(nominaRows, 'descuentos'),
        netoBase: sum(nominaRows, 'netoBase'),
        extra: sum(nominaRows, 'extra'),
        neto: sum(nominaRows, 'neto'),
        adelantos: sum(nominaRows, 'adelantos'),
        adeudado: sum(nominaRows, 'adeudado'),
        saldoFavor: sum(nominaRows, 'saldoFavor'),
      },
    }
  }, [grupoDocente, grupoAdministrativo, nominaRows])

  const actual = nominaRows[indiceActual] || null

  useEffect(() => {
    setMensajeAutomaticoVisible(false)
  }, [actual?.id])

  const fechaLimitePagoPeriodo = useMemo(() => {
    const fecha = getFechaLimitePagoNomina(periodoNomina)
    if (!fecha) return ''
    return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }).format(fecha)
  }, [periodoNomina])

  const mensajePagoAutomatico = useMemo(() => {
    if (!actual) return ''

    const periodoTitulo = getPeriodoLabelUpper(periodoNomina)
    const nombreEmpleado = actual.nombre.toUpperCase()
    const abonosPeriodo = (abonosPeriodoPorPersonal[actual.id] || []).slice()
    const abonosBase = abonosPeriodo.filter((abono) => abono.tipo === 'base')
    const abonosExtra = abonosPeriodo.filter((abono) => abono.tipo === 'extra')

    const subtotalBase = roundMoney(getSafeMonto(actual.netoBase))
    const subtotalExtrasBruto = roundMoney(getSafeMonto(actual.extra))
    const baseBruta = roundMoney(getSafeMonto(actual.base))
    const descuentoTotal = roundMoney(getSafeMonto(actual.descuentos))
    const descuentoTrasladadoExtras = roundMoney(Math.max(descuentoTotal - baseBruta, 0))
    const subtotalExtras = roundMoney(Math.max(subtotalExtrasBruto - descuentoTrasladadoExtras, 0))
    const arrastreBase = roundMoney(getSafeMonto(actual.arrastrePrevio))
    const baseAbonosPeriodo = roundMoney(abonosBase.reduce((acc, abono) => acc + abono.montoUsd, 0))
    const extrasAbonosPeriodo = roundMoney(abonosExtra.reduce((acc, abono) => acc + abono.montoUsd, 0))

    const poolBase = roundMoney(arrastreBase + baseAbonosPeriodo)
    const baseAplicado = roundMoney(Math.min(subtotalBase, poolBase))
    const saldoBaseHaciaExtras = roundMoney(Math.max(poolBase - subtotalBase, 0))
    const restanteBase = roundMoney(Math.max(subtotalBase - baseAplicado, 0))

    const poolExtras = roundMoney(saldoBaseHaciaExtras + extrasAbonosPeriodo)
    const extrasAplicado = roundMoney(Math.min(subtotalExtras, poolExtras))
    const restanteExtras = roundMoney(Math.max(subtotalExtras - extrasAplicado, 0))

    const deduccionesBase: string[] = []
    const deduccionesExtras: string[] = []
    let baseDisponibleParaDeducciones = baseBruta

    const deduccionesDistribuidas = [
      { value: roundMoney(Math.max(getSafeMonto(actual.inasistencias), 0)), label: 'INASISTENCIAS' },
      { value: roundMoney(Math.max(getSafeMonto(actual.cantina), 0)), label: 'CONSUMO DE CANTINA' },
      { value: roundMoney(Math.max(getSafeMonto(actual.otrasDeducciones), 0)), label: 'OTRAS DEDUCCIONES' },
    ]

    for (const deduccion of deduccionesDistribuidas) {
      if (deduccion.value <= 0) continue

      const aplicadoBase = roundMoney(Math.min(deduccion.value, baseDisponibleParaDeducciones))
      const aplicadoExtras = roundMoney(Math.max(deduccion.value - aplicadoBase, 0))

      if (aplicadoBase > 0) {
        deduccionesBase.push(`- ${formatMontoMensaje(aplicadoBase)} ${deduccion.label}`)
      }

      if (aplicadoExtras > 0) {
        deduccionesExtras.push(`- ${formatMontoMensaje(aplicadoExtras)} ${deduccion.label} (TRASLADADO DESDE BASE)`)
      }

      baseDisponibleParaDeducciones = roundMoney(Math.max(baseDisponibleParaDeducciones - aplicadoBase, 0))
    }

    const comentarioDescuento = (actual.comentario || '').trim()
    if (comentarioDescuento) {
      if (deduccionesBase.length > 0 || deduccionesExtras.length === 0) {
        deduccionesBase.push(`- DETALLE: ${comentarioDescuento.toUpperCase()}`)
      } else {
        deduccionesExtras.push(`- DETALLE: ${comentarioDescuento.toUpperCase()}`)
      }
    }

    if (deduccionesBase.length === 0) {
      deduccionesBase.push('- SIN DEDUCCIONES')
    }

    if (deduccionesExtras.length === 0) {
      deduccionesExtras.push('- SIN DEDUCCIONES')
    }

    const buildAbonoLine = (abono: AbonoDetalleNomina) => {
      const partes = [
        formatFechaCortaMensaje(abono.fechaPago),
        (abono.cuentaNombre || '').trim().toUpperCase(),
        (abono.observaciones || '').trim().toUpperCase(),
        (abono.referencia || '').trim() ? `REF ${(abono.referencia || '').trim()}` : '',
      ].filter(Boolean)

      return `- ${formatMontoMensaje(abono.montoUsd)}${partes.length ? ` ${partes.join(' ')}` : ''}`
    }

    const abonosBaseLines: string[] = []
    if (arrastreBase > 0) {
      abonosBaseLines.push(`- ${formatMontoMensaje(arrastreBase)} ARRASTRE A FAVOR DE PERÍODOS ANTERIORES`)
    }
    for (const abono of abonosBase) {
      abonosBaseLines.push(buildAbonoLine(abono))
    }
    if (abonosBaseLines.length === 0) {
      abonosBaseLines.push('- SIN ABONOS REGISTRADOS')
    }
    if (saldoBaseHaciaExtras > 0) {
      abonosBaseLines.push(`- ${formatMontoMensaje(saldoBaseHaciaExtras)} SALDO A FAVOR TRASLADADO A EXTRAS`)
    }

    const abonosExtrasLines: string[] = []
    if (saldoBaseHaciaExtras > 0) {
      abonosExtrasLines.push(`- ${formatMontoMensaje(saldoBaseHaciaExtras)} SALDO A FAVOR DESDE BASE`)
    }
    for (const abono of abonosExtra) {
      abonosExtrasLines.push(buildAbonoLine(abono))
    }
    if (abonosExtrasLines.length === 0) {
      abonosExtrasLines.push('- SIN ABONOS REGISTRADOS')
    }

    const detalleExtraLines = (actual.comentarioExtra || '').trim()
      ? actual.comentarioExtra
        .split(/\r?\n+/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((line) => `- ${line.toUpperCase()}`)
      : ['- EXTRAS DEL PERÍODO']

    return [
      `DETALLE DE PAGO BASE ${periodoTitulo}`,
      '',
      `EMPLEADO: ${nombreEmpleado}`,
      '',
      'BASE:',
      `${formatMontoMensaje(actual.base)}`,
      '',
      'DEDUCCIONES:',
      ...deduccionesBase,
      '__',
      `${formatMontoMensaje(subtotalBase)} SUB TOTAL BASE`,
      '',
      'ABONOS:',
      ...abonosBaseLines,
      '__',
      `${formatMontoMensaje(restanteBase)} RESTANTE A PAGAR`,
      '',
      `DETALLE DE PAGO EXTRAS ${periodoTitulo}`,
      '',
      nombreEmpleado,
      '',
      'EXTRAS:',
      `${formatMontoMensaje(subtotalExtrasBruto)}`,
      'DETALLE:',
      ...detalleExtraLines,
      '',
      'DEDUCCIONES:',
      ...deduccionesExtras,
      '__',
      `${formatMontoMensaje(subtotalExtras)} SUB TOTAL EXTRAS`,
      '',
      'ABONOS:',
      ...abonosExtrasLines,
      '__',
      `${formatMontoMensaje(restanteExtras)} RESTANTE A PAGAR`,
      ...(actual.saldoFavor > 0
        ? ['', `SALDO A FAVOR PARA PRÓXIMO PERÍODO: ${formatMontoMensaje(actual.saldoFavor)}`]
        : []),
    ].join('\n')
  }, [actual, periodoNomina, abonosPeriodoPorPersonal])

  const whatsappHrefActual = actual?.telefonoWhatsapp
    ? `https://wa.me/${actual.telefonoWhatsapp}?text=${encodeURIComponent(mensajePagoAutomatico)}`
    : ''

  const getAjusteInputKey = (empleadoId: string, campo: AjusteMontoCampo) => `${empleadoId}:${campo}`

  const normalizarMontoInput = (raw: string) => raw.trim().replace(/,/g, '.')

  const parseMontoInput = (raw: string) => {
    const normalized = normalizarMontoInput(raw)
    if (!normalized || normalized === '.') return null
    if (!/^\d*\.?\d*$/.test(normalized)) return null

    const parsed = Number.parseFloat(normalized)
    if (!Number.isFinite(parsed) || parsed < 0) return null

    return parsed
  }

  const actualizarAjusteNumerico = (empleadoId: string, campo: AjusteMontoCampo, monto: number) => {
    const safeValue = Number.isFinite(monto) && monto > 0 ? monto : 0

    setAjustes((prev) => ({
      ...prev,
      [empleadoId]: {
        ...(prev[empleadoId] || EMPTY_AJUSTE_NOMINA),
        [campo]: safeValue,
      },
    }))

    programarGuardadoBorrador()
  }

  const actualizarAjuste = (empleadoId: string, campo: AjusteMontoCampo, value: string) => {
    const key = getAjusteInputKey(empleadoId, campo)
    setAjustesInputTemporal((prev) => ({ ...prev, [key]: value }))

    const normalized = normalizarMontoInput(value)
    if (!normalized) {
      actualizarAjusteNumerico(empleadoId, campo, 0)
      return
    }

    const parsed = parseMontoInput(value)
    if (parsed !== null) {
      actualizarAjusteNumerico(empleadoId, campo, parsed)
    }
  }

  const confirmarAjuste = (empleadoId: string, campo: AjusteMontoCampo) => {
    const key = getAjusteInputKey(empleadoId, campo)
    const raw = ajustesInputTemporal[key]

    setAjustesInputTemporal((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, key)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })

    if (raw === undefined) return

    const normalized = normalizarMontoInput(raw)
    if (!normalized) {
      actualizarAjusteNumerico(empleadoId, campo, 0)
      return
    }

    const parsed = parseMontoInput(raw)
    if (parsed !== null) {
      actualizarAjusteNumerico(empleadoId, campo, parsed)
    }
  }

  const getMontoInputValue = (empleadoId: string, campo: AjusteMontoCampo, currentValue: number) => {
    const key = getAjusteInputKey(empleadoId, campo)
    if (Object.prototype.hasOwnProperty.call(ajustesInputTemporal, key)) {
      return ajustesInputTemporal[key]
    }

    return currentValue === 0 ? '' : String(currentValue)
  }

  const actualizarComentario = (empleadoId: string, comentario: string) => {
    setAjustes((prev) => ({
      ...prev,
      [empleadoId]: {
        ...(prev[empleadoId] || EMPTY_AJUSTE_NOMINA),
        comentario,
      },
    }))

    programarGuardadoBorrador()
  }

  const actualizarComentarioExtra = (empleadoId: string, comentarioExtra: string) => {
    setAjustes((prev) => ({
      ...prev,
      [empleadoId]: {
        ...(prev[empleadoId] || EMPTY_AJUSTE_NOMINA),
        comentarioExtra,
      },
    }))

    programarGuardadoBorrador()
  }

  const irAnterior = () => setIndiceActual((prev) => Math.max(prev - 1, 0))
  const irSiguiente = () => setIndiceActual((prev) => Math.min(prev + 1, Math.max(nominaRows.length - 1, 0)))
  const seleccionarEmpleado = (empleadoId: string) => {
    const index = nominaRows.findIndex((row) => row.id === empleadoId)
    if (index >= 0) {
      setIndiceActual(index)
    }
  }
  const guardarEmpleadoActual = async () => {
    if (!actual) return

    const guardado = await guardarBorradorNomina(true)

    if (!guardado) {
      setMensaje('⚠️ No se pudo guardar este empleado en borrador en nube. Revisa la conexión e inténtalo de nuevo.')
      return
    }

    if (indiceActual >= nominaRows.length - 1) {
      setMensaje('✅ Cambios del empleado guardados en borrador en nube. Ya estás en el último empleado; usa “Finalizar nómina” para cerrar el período.')
      return
    }

    irSiguiente()
  }

  const seleccionarAnioEscolar = (value: string) => {
    const parsedPeriodo = parsePeriodoYm(periodoNomina)
    const month = parsedPeriodo?.month ?? 9
    actualizarPeriodoNomina(buildPeriodoFromAnioEscolar(value, month))
  }

  const seleccionarMesEscolar = (month: number) => {
    actualizarPeriodoNomina(buildPeriodoFromAnioEscolar(anioEscolarSeleccionado, month))
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

  const persistirNominaEnBd = async ({
    estado,
    silent = false,
    refrescarHistorial = false,
    limpiarBorradorLocal = false,
  }: {
    estado: 'borrador' | 'cerrada'
    silent?: boolean
    refrescarHistorial?: boolean
    limpiarBorradorLocal?: boolean
  }) => {
    if (!nominaRows.length) {
      if (!silent) {
        setMensaje('⚠️ Primero carga el personal para calcular la nómina del período.')
      }
      return false
    }

    if (!PERIODO_REGEX.test(periodoNomina)) {
      if (!silent) {
        setMensaje('⚠️ Define un período válido en formato AAAA-MM.')
      }
      return false
    }

    if (estado === 'cerrada') {
      setGuardandoNomina(true)
    } else {
      setGuardandoBorrador(true)
    }

    if (!silent) {
      setMensaje('')
    }

    try {
      const nominaPayload = {
        periodo_ym: periodoNomina,
        fecha_cierre: `${periodoNomina}-01`,
        estado,
        total_base: roundMoney(resumen.general.base),
        total_descuentos: roundMoney(resumen.general.descuentos),
        total_extras: roundMoney(resumen.general.extra),
        total_neto: roundMoney(resumen.general.neto),
        updated_at: new Date().toISOString(),
      }

      const { data: existente, error: existenteError } = await supabase
        .from('nominas_mensuales')
        .select('id')
        .eq('periodo_ym', periodoNomina)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existenteError) {
        if (silent && estado === 'borrador') {
          setMensaje('⚠️ No se pudo guardar borrador en nube. Tus cambios siguen guardados localmente.')
        } else {
          setMensaje(`❌ ${getErrorText(existenteError, 'No se pudo validar la nómina del período.')}`)
        }
        return false
      }

      const nominaExistente = (existente as { id?: string } | null) ?? null
      let nominaId = nominaExistente?.id || ''
      const fueActualizada = Boolean(nominaId)

      if (nominaId) {
        const { error: updateError } = await supabase
          .from('nominas_mensuales')
          .update(nominaPayload)
          .eq('id', nominaId)

        if (updateError) {
          if (silent && estado === 'borrador') {
            setMensaje('⚠️ No se pudo guardar borrador en nube. Tus cambios siguen guardados localmente.')
          } else {
            setMensaje(`❌ ${getErrorText(updateError, 'No se pudo actualizar la nómina del período.')}`)
          }
          return false
        }

        const { error: clearError } = await supabase
          .from('nominas_mensuales_detalle')
          .delete()
          .eq('nomina_id', nominaId)

        if (clearError) {
          if (silent && estado === 'borrador') {
            setMensaje('⚠️ No se pudo guardar borrador en nube. Tus cambios siguen guardados localmente.')
          } else {
            setMensaje(`❌ ${getErrorText(clearError, 'No se pudo limpiar el detalle de la nómina anterior.')}`)
          }
          return false
        }
      } else {
        const { data: creada, error: createError } = await supabase
          .from('nominas_mensuales')
          .insert([nominaPayload])
          .select('id')
          .single()

        if (createError) {
          if (silent && estado === 'borrador') {
            setMensaje('⚠️ No se pudo guardar borrador en nube. Tus cambios siguen guardados localmente.')
          } else {
            setMensaje(`❌ ${getErrorText(createError, 'No se pudo crear la nómina mensual.')}`)
          }
          return false
        }

        const nominaCreada = (creada as { id?: string } | null) ?? null
        if (!nominaCreada?.id) {
          if (silent && estado === 'borrador') {
            setMensaje('⚠️ No se pudo guardar borrador en nube. Tus cambios siguen guardados localmente.')
          } else {
            setMensaje('❌ No se obtuvo el identificador de la nómina creada.')
          }
          return false
        }

        nominaId = nominaCreada.id
      }

      const detallePayload = nominaRows.map((row) => ({
        nomina_id: nominaId,
        personal_id: row.id,
        grupo: row.grupo,
        base_mensual: roundMoney(row.base),
        descuento_inasistencias: roundMoney(row.inasistencias),
        descuento_cantina: roundMoney(row.cantina),
        descuento_otras: roundMoney(row.otrasDeducciones),
        monto_extra: roundMoney(row.extra),
        comentario_descuento: row.comentario.trim() || null,
        comentario_extra: row.comentarioExtra.trim() || null,
        descuento_total: roundMoney(row.descuentos),
        neto_base: roundMoney(row.netoBase),
        neto_total: roundMoney(row.neto),
      }))

      let { error: detalleError } = await supabase
        .from('nominas_mensuales_detalle')
        .insert(detallePayload)

      if (detalleError && isMissingColumnError(detalleError, 'descuento_otras')) {
        const legacyDetallePayload = detallePayload.map(({ descuento_otras, ...row }) => row)
        const legacyInsert = await supabase
          .from('nominas_mensuales_detalle')
          .insert(legacyDetallePayload)

        detalleError = legacyInsert.error

        if (!detalleError && !silent) {
          setMensaje('⚠️ Nómina guardada sin persistir Otras Deducciones en BD. Ejecuta la migración v50 para habilitar ese campo en nube.')
        }
      }

      if (detalleError) {
        if (silent && estado === 'borrador') {
          setMensaje('⚠️ No se pudo guardar borrador en nube. Tus cambios siguen guardados localmente.')
        } else {
          setMensaje(`❌ ${getErrorText(detalleError, 'No se pudo guardar el detalle de la nómina.')}`)
        }
        return false
      }

      if (limpiarBorradorLocal && typeof window !== 'undefined') {
        window.localStorage.removeItem(getNominaDraftStorageKey(periodoNomina))
      }

      setSnapshotAjustesGuardados(snapshotAjustesActual)

      if (!silent) {
        if (estado === 'cerrada') {
          setMensaje(`✅ Nómina ${fueActualizada ? 'actualizada' : 'guardada'} para ${periodoNomina} (${nominaRows.length} empleado(s)).`)
        } else {
          setMensaje(`✅ Borrador de nómina ${fueActualizada ? 'actualizado' : 'guardado'} para ${periodoNomina} (${nominaRows.length} empleado(s)).`)
        }
      }

      if (refrescarHistorial) {
        void cargarHistorialNominas(true)
      }

      return true
    } catch (error) {
      if (silent && estado === 'borrador') {
        setMensaje('⚠️ No se pudo guardar borrador en nube. Tus cambios siguen guardados localmente.')
      } else {
        setMensaje(`❌ ${getErrorText(error, 'No se pudo finalizar la nómina.')}`)
      }
      return false
    } finally {
      if (estado === 'cerrada') {
        setGuardandoNomina(false)
      } else {
        setGuardandoBorrador(false)
      }
    }
  }

  const guardarBorradorNomina = async (silent = true) => {
    if (guardandoNomina || guardandoBorrador || loading) return false

    return persistirNominaEnBd({
      estado: 'borrador',
      silent,
      refrescarHistorial: false,
      limpiarBorradorLocal: false,
    })
  }

  const finalizarCargaBase = async () => {
    limpiarProgramacionAutosave()

    await persistirNominaEnBd({
      estado: 'cerrada',
      silent: false,
      refrescarHistorial: true,
      limpiarBorradorLocal: true,
    })
  }

  const renderGrupo = (titulo: string, rows: NominaRow[]) => (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold tracking-tight text-black">{titulo}</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-400">{rows.length} empleado(s)</p>

      <div className="mt-4 space-y-2">
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-3 text-xs text-gray-400">
            Sin personal en este grupo.
          </p>
        )}

        {rows.map((row) => {
          const isActive = actual?.id === row.id
          const esSaldado = row.estadoPago === 'saldado'
          const esVencido = row.estadoPago === 'vencido'

          const cardClass = esSaldado
            ? (isActive ? 'border-green-700 bg-green-700 text-white' : 'border-green-200 bg-green-50 hover:border-green-300')
            : esVencido
              ? (isActive ? 'border-red-700 bg-red-700 text-white' : 'border-red-200 bg-red-50 hover:border-red-300')
              : isActive
                ? 'border-black bg-black text-white'
                : 'border-gray-100 bg-gray-50 hover:border-gray-300'

          const nombreClass = isActive
            ? 'text-white'
            : esSaldado
              ? 'text-green-900'
              : esVencido
                ? 'text-red-900'
                : 'text-black'

          const cargoClass = isActive
            ? 'text-gray-200'
            : esSaldado
              ? 'text-green-700'
              : esVencido
                ? 'text-red-700'
                : 'text-gray-400'

          const detalleClass = isActive
            ? 'text-white/90'
            : esSaldado
              ? 'text-green-800'
              : esVencido
                ? 'text-red-800'
                : 'text-gray-600'

          const metricBoxClass = isActive
            ? 'flex min-h-[68px] flex-col items-center justify-center rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-center'
            : esSaldado
              ? 'flex min-h-[68px] flex-col items-center justify-center rounded-lg border border-green-200/80 bg-white/70 px-2 py-2 text-center'
              : esVencido
                ? 'flex min-h-[68px] flex-col items-center justify-center rounded-lg border border-red-200/80 bg-white/70 px-2 py-2 text-center'
                : 'flex min-h-[68px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-2 text-center'

          const metricLabelClass = isActive
            ? 'text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-white/70'
            : 'text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-gray-400'

          const metricValueClass = isActive
            ? 'mt-1 text-xs font-bold leading-none text-white'
            : esSaldado
              ? 'mt-1 text-xs font-bold leading-none text-green-900'
              : esVencido
                ? 'mt-1 text-xs font-bold leading-none text-red-900'
                : 'mt-1 text-xs font-bold leading-none text-black'

          const metricAdeudadoValueClass = isActive
            ? 'mt-1 text-xs font-bold leading-none text-white'
            : esSaldado
              ? 'mt-1 text-xs font-bold leading-none text-green-700'
              : esVencido
                ? 'mt-1 text-xs font-bold leading-none text-red-700'
                : 'mt-1 text-xs font-bold leading-none text-black'

          return (
            <button
              type="button"
              key={row.id}
              onClick={() => seleccionarEmpleado(row.id)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${cardClass}`}
            >
              <p className={`text-sm font-bold ${nombreClass}`}>{row.nombre}</p>
              <p className={`text-[10px] uppercase tracking-[0.12em] ${cargoClass}`}>{row.cargo}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className={metricBoxClass}>
                  <p className={metricLabelClass}>Base</p>
                  <p className={metricValueClass}>${formatUSD(row.base)}</p>
                </div>
                <div className={metricBoxClass}>
                  <p className={metricLabelClass}>Extras</p>
                  <p className={metricValueClass}>${formatUSD(row.extra)}</p>
                </div>
                <div className={metricBoxClass}>
                  <p className={metricLabelClass}>Pago mes</p>
                  <p className={metricValueClass}>${formatUSD(row.pagoPeriodo)}</p>
                </div>
                <div className={metricBoxClass}>
                  <p className={metricLabelClass}>Arrastre</p>
                  <p className={metricValueClass}>${formatUSD(row.arrastrePrevio)}</p>
                </div>
                <div className={metricBoxClass}>
                  <p className={metricLabelClass}>Descuento</p>
                  <p className={metricValueClass}>${formatUSD(row.descuentos)}</p>
                </div>
                <div className={metricBoxClass}>
                  <p className={metricLabelClass}>Adeudado</p>
                  <p className={metricAdeudadoValueClass}>${formatUSD(row.adeudado)}</p>
                </div>
              </div>
              <p className={`mt-3 text-center text-[10px] uppercase tracking-[0.1em] ${detalleClass}`}>
                {isActive
                  ? `Editando este empleado · ${getEstadoPagoLabel(row.estadoPago)}`
                  : `${getEstadoPagoLabel(row.estadoPago)} · Click para editar`}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <section className="relative mx-auto w-full max-w-[1650px] rounded-[2.8rem] border border-gray-200/80 bg-white/95 p-8 shadow-2xl backdrop-blur md:p-12">
        <div className="absolute right-6 top-6 sm:right-8 sm:top-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <Image
              src="/logo_ana.jpg"
              alt="Academia Nacional de Ajedrez"
              width={96}
              height={96}
              className="h-auto w-12 object-contain sm:w-14 md:w-16"
              priority
            />
          </div>
        </div>

        <button
          onClick={() => router.push('/gestion')}
          className="mb-8 mr-20 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black sm:mr-24 md:mr-28"
        >
          <ArrowLeft size={14} /> Volver a gestión
        </button>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <BadgeDollarSign size={36} strokeWidth={1.5} className="mb-6 text-black" />
          <h1 className="text-4xl font-bold tracking-tight text-black md:text-5xl">Nómina Mensual</h1>
          <p className="mt-4 max-w-4xl text-base text-gray-600 md:text-lg">
            Salida 1 · Base + Extras: calcula sueldo base (menos descuentos), suma extras del mes y descuenta pagos ya imputados para obtener adeudado/saldo a favor por empleado.
          </p>

          <div className="mt-8 grid gap-4 xl:grid-cols-[0.72fr_2.92fr_0.96fr]">
            <aside className="rounded-[2rem] border border-gray-200 bg-gray-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Año escolar</p>
              <select
                value={anioEscolarSeleccionado}
                onChange={(e) => seleccionarAnioEscolar(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 text-sm font-bold text-black shadow-sm"
              >
                {opcionesAnioEscolar.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="mt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Meses (septiembre → agosto)</p>
                <div className="mt-3 space-y-2">
                  {MESES_ANIO_ESCOLAR.map((mes) => {
                    const periodoMes = buildPeriodoFromAnioEscolar(anioEscolarSeleccionado, mes.month)
                    const isActive = periodoMes === periodoNomina

                    return (
                      <button
                        key={mes.month}
                        onClick={() => seleccionarMesEscolar(mes.month)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-bold transition-all ${isActive
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span>{mes.label}</span>
                        <span className={`text-[10px] font-semibold tracking-[0.08em] ${isActive ? 'text-gray-200' : 'text-gray-400'}`}>
                          {periodoMes}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm md:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Panel de nómina</p>
              <p className="mt-2 text-sm text-gray-600">
                Período seleccionado: <span className="font-bold text-black">{periodoLabel}</span> ({periodoNomina})
              </p>
              <div className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Enlace compartible del período actual</p>
                  <button
                    type="button"
                    onClick={() => void copiarEnlacePeriodo()}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-700 transition-all hover:border-black hover:text-black"
                  >
                    Copiar enlace
                  </button>
                </div>
                {estadoCopiaLink === 'ok' && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-green-700">✅ Enlace copiado.</p>
                )}
                {estadoCopiaLink === 'error' && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-red-700">❌ No se pudo copiar el enlace.</p>
                )}
              </div>
              {cargandoPeriodo && (
                <p className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                  <Loader2 size={12} className="animate-spin" /> Cargando período...
                </p>
              )}

              {nominaRows.length > 0 && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <label htmlFor="selector-empleado-nomina" className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    Ir a empleado
                  </label>
                  <select
                    id="selector-empleado-nomina"
                    value={actual?.id || ''}
                    onChange={(e) => seleccionarEmpleado(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-black"
                  >
                    {nominaRows.map((row, idx) => (
                      <option key={row.id} value={row.id}>
                        {idx + 1}. {row.nombre} · {row.cargo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {actual ? (
                <div className="mt-4 rounded-[2rem] border border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        Empleado {indiceActual + 1} de {nominaRows.length}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-black">{actual.nombre}</h2>
                      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">{actual.cargo}</p>
                    </div>

                    {whatsappHrefActual ? (
                      <a
                        href={whatsappHrefActual}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-green-600 bg-green-500 text-white shadow-sm transition-all hover:bg-green-600"
                        aria-label={`Enviar mensaje de nómina por WhatsApp a ${actual.nombre}`}
                        title="Enviar por WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                          <path d="M19.11 4.91A9.816 9.816 0 0 0 12.14 2c-5.44 0-9.85 4.41-9.85 9.85 0 1.74.45 3.44 1.31 4.93L2 22l5.37-1.41a9.93 9.93 0 0 0 4.77 1.22h.01c5.43 0 9.85-4.42 9.85-9.85 0-2.63-1.03-5.11-2.89-6.95zM12.15 20.13h-.01a8.27 8.27 0 0 1-4.21-1.15l-.3-.18-3.19.84.85-3.11-.2-.32a8.23 8.23 0 0 1-1.26-4.38c0-4.55 3.71-8.26 8.27-8.26 2.21 0 4.29.86 5.86 2.42a8.2 8.2 0 0 1 2.42 5.86c0 4.55-3.71 8.27-8.23 8.27zm4.54-6.18c-.25-.13-1.47-.72-1.7-.8-.23-.08-.39-.13-.56.13-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.77-1.84-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.23.9 2.42 1.02 2.58.13.17 1.76 2.68 4.27 3.76.6.26 1.07.41 1.43.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.17.21-.58.21-1.07.15-1.17-.06-.1-.22-.17-.47-.29z" />
                        </svg>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400"
                        aria-label="Sin teléfono válido para WhatsApp"
                        title="Registra el teléfono del docente en Gestión > Personal"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                          <path d="M19.11 4.91A9.816 9.816 0 0 0 12.14 2c-5.44 0-9.85 4.41-9.85 9.85 0 1.74.45 3.44 1.31 4.93L2 22l5.37-1.41a9.93 9.93 0 0 0 4.77 1.22h.01c5.43 0 9.85-4.42 9.85-9.85 0-2.63-1.03-5.11-2.89-6.95zM12.15 20.13h-.01a8.27 8.27 0 0 1-4.21-1.15l-.3-.18-3.19.84.85-3.11-.2-.32a8.23 8.23 0 0 1-1.26-4.38c0-4.55 3.71-8.26 8.27-8.26 2.21 0 4.29.86 5.86 2.42a8.2 8.2 0 0 1 2.42 5.86c0 4.55-3.71 8.27-8.23 8.27zm4.54-6.18c-.25-.13-1.47-.72-1.7-.8-.23-.08-.39-.13-.56.13-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.77-1.84-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09 0 1.23.9 2.42 1.02 2.58.13.17 1.76 2.68 4.27 3.76.6.26 1.07.41 1.43.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.17.21-.58.21-1.07.15-1.17-.06-.1-.22-.17-.47-.29z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-700">Base mensual: ${formatUSD(actual.base)}</p>
                  {!actual.telefonoWhatsapp && (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-amber-700">
                      Sin teléfono válido para WhatsApp. Regístralo en Gestión &gt; Personal.
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.15fr]">
                    <div className="space-y-3">
                      <label className="block rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Inasistencias ($)</p>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={getMontoInputValue(actual.id, 'inasistencias', actual.inasistencias)}
                          onChange={(e) => actualizarAjuste(actual.id, 'inasistencias', e.target.value)}
                          onBlur={() => confirmarAjuste(actual.id, 'inasistencias')}
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-black"
                          placeholder="0.00"
                        />
                      </label>

                      <label className="block rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Consumo cantina ($)</p>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={getMontoInputValue(actual.id, 'cantina', actual.cantina)}
                          onChange={(e) => actualizarAjuste(actual.id, 'cantina', e.target.value)}
                          onBlur={() => confirmarAjuste(actual.id, 'cantina')}
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-black"
                          placeholder="0.00"
                        />
                      </label>

                      <label className="block rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Otras deducciones ($)</p>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={getMontoInputValue(actual.id, 'otrasDeducciones', actual.otrasDeducciones)}
                          onChange={(e) => actualizarAjuste(actual.id, 'otrasDeducciones', e.target.value)}
                          onBlur={() => confirmarAjuste(actual.id, 'otrasDeducciones')}
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-black"
                          placeholder="0.00"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <button
                        type="button"
                        onClick={() => setEditorExtraEmpleadoId((prev) => (prev === actual.id ? null : actual.id))}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition-all hover:border-gray-400"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Extra</p>
                        <p className="mt-1 text-xl font-bold text-black">${formatUSD(actual.extra)}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-gray-400">
                          {editorExtraEmpleadoId === actual.id ? 'Ocultar editor' : 'Editar extra'}
                        </p>
                      </button>

                      {editorExtraEmpleadoId === actual.id && (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Extra del empleado</p>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={getMontoInputValue(actual.id, 'extra', actual.extra)}
                            onChange={(e) => actualizarAjuste(actual.id, 'extra', e.target.value)}
                            onBlur={() => confirmarAjuste(actual.id, 'extra')}
                            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-black"
                            placeholder="Monto extra del mes"
                          />
                          <textarea
                            value={actual.comentarioExtra}
                            onChange={(e) => actualizarComentarioExtra(actual.id, e.target.value)}
                            className="mt-3 min-h-[92px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                            placeholder="Detalle del extra (horas, clases o actividad)."
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <label className="mt-3 block rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Comentario del descuento</p>
                    <textarea
                      value={actual.comentario}
                      onChange={(e) => actualizarComentario(actual.id, e.target.value)}
                      className="mt-2 min-h-[78px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black"
                      placeholder="Ej: 2 inasistencias por reposo no justificado, consumo de cantina y otras deducciones del mes."
                    />
                  </label>

                  <p className="mt-4 text-sm font-bold text-black">
                    Neto base del empleado: ${formatUSD(actual.netoBase)}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Extras del período: ${formatUSD(actual.extra)}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Neto total del empleado: ${formatUSD(actual.neto)}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Pagos imputados al período: ${formatUSD(actual.pagoPeriodo)}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Arrastre a favor de períodos anteriores: ${formatUSD(actual.arrastrePrevio)}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Adelantos aplicables a este período: ${formatUSD(actual.adelantos)}
                  </p>
                  <p className={`mt-1 text-sm font-bold ${actual.estadoPago === 'saldado'
                    ? 'text-green-700'
                    : actual.estadoPago === 'vencido'
                      ? 'text-red-700'
                      : 'text-black'
                  }`}>
                    Pago adeudado a la fecha: ${formatUSD(actual.adeudado)}
                  </p>
                  {actual.saldoFavor > 0 && (
                    <p className="mt-1 text-sm font-bold text-green-700">
                      Saldo a favor para próximo período: ${formatUSD(actual.saldoFavor)}
                    </p>
                  )}
                  {actual.estadoPago === 'vencido' && fechaLimitePagoPeriodo && (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-600">
                      Vencido desde el 06 del mes siguiente ({fechaLimitePagoPeriodo}).
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={irAnterior}
                      disabled={indiceActual === 0 || guardandoBorrador || guardandoNomina}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => void guardarEmpleadoActual()}
                      disabled={nominaRows.length === 0 || guardandoBorrador || guardandoNomina}
                      className="rounded-xl bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {guardandoBorrador
                        ? 'Guardando...'
                        : indiceActual >= nominaRows.length - 1
                          ? 'Guardar cambios'
                          : 'Guardar y siguiente'}
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                    <button
                      type="button"
                      onClick={() => setMensajeAutomaticoVisible((prev) => !prev)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-all hover:border-gray-300"
                      aria-expanded={mensajeAutomaticoVisible}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Mensaje automático para docente</p>
                      <div className="inline-flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                          {mensajeAutomaticoVisible ? 'Ocultar' : 'Mostrar'}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-gray-500 transition-transform ${mensajeAutomaticoVisible ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {mensajeAutomaticoVisible && (
                      <textarea
                        readOnly
                        value={mensajePagoAutomatico}
                        className="mt-2 min-h-[320px] w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-black"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                  Carga data de nómina para comenzar el ajuste empleado por empleado.
                </div>
              )}

              {nominaRows.length > 0 && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {renderGrupo('Personal docente', grupoDocente)}
                  {renderGrupo('Personal administrativo', grupoAdministrativo)}
                </div>
              )}
            </div>

            <aside className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Salidas y acciones</p>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => void cargarPersonalNomina()}
                  disabled={loading || guardandoNomina || guardandoBorrador}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xl transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Cargar data de nómina
                </button>

                <button
                  onClick={() => void finalizarCargaBase()}
                  disabled={guardandoNomina || loading || guardandoBorrador}
                  className={clasesBotonFinalizar}
                >
                  {guardandoNomina ? <Loader2 size={14} className="animate-spin" /> : null}
                  {textoBotonFinalizar}
                </button>

                <button
                  onClick={() => void cargarHistorialNominas()}
                  disabled={loadingHistorial || loading || guardandoNomina || guardandoBorrador}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-700 shadow-sm transition-all hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingHistorial ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  {loadingHistorial ? 'Actualizando historial' : 'Actualizar historial'}
                </button>
              </div>

              {mensaje && (
                <p className="mt-4 max-h-44 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium leading-relaxed text-gray-700">
                  {mensaje}
                </p>
              )}

              {nominaRows.length > 0 && (
                <p className={`mt-4 rounded-2xl border px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${hayCambiosPendientes
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}>
                  {guardandoBorrador
                    ? 'Guardando borrador en nube...'
                    : hayCambiosPendientes
                      ? 'Cambios pendientes · Se guardan automáticamente en borrador en nube'
                      : 'Sin cambios pendientes en esta nómina'}
                </p>
              )}

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Docente</p>
                  <p className="mt-2 text-sm text-gray-600">Base: ${formatUSD(resumen.docente.base)}</p>
                  <p className="text-sm text-gray-600">Descuentos: ${formatUSD(resumen.docente.descuentos)}</p>
                  <p className="text-sm text-gray-600">Neto base: ${formatUSD(resumen.docente.netoBase)}</p>
                  <p className="text-sm text-gray-600">Extras: ${formatUSD(resumen.docente.extra)}</p>
                  <p className="text-sm text-gray-600">Neto total: ${formatUSD(resumen.docente.neto)}</p>
                  <p className="text-sm text-gray-600">Adelantos: ${formatUSD(resumen.docente.adelantos)}</p>
                  <p className="text-sm font-bold text-black">Adeudado: ${formatUSD(resumen.docente.adeudado)}</p>
                  <p className="text-sm text-gray-600">Saldo a favor: ${formatUSD(resumen.docente.saldoFavor)}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Administrativo</p>
                  <p className="mt-2 text-sm text-gray-600">Base: ${formatUSD(resumen.administrativo.base)}</p>
                  <p className="text-sm text-gray-600">Descuentos: ${formatUSD(resumen.administrativo.descuentos)}</p>
                  <p className="text-sm text-gray-600">Neto base: ${formatUSD(resumen.administrativo.netoBase)}</p>
                  <p className="text-sm text-gray-600">Extras: ${formatUSD(resumen.administrativo.extra)}</p>
                  <p className="text-sm text-gray-600">Neto total: ${formatUSD(resumen.administrativo.neto)}</p>
                  <p className="text-sm text-gray-600">Adelantos: ${formatUSD(resumen.administrativo.adelantos)}</p>
                  <p className="text-sm font-bold text-black">Adeudado: ${formatUSD(resumen.administrativo.adeudado)}</p>
                  <p className="text-sm text-gray-600">Saldo a favor: ${formatUSD(resumen.administrativo.saldoFavor)}</p>
                </div>

                <div className="rounded-2xl border border-black bg-black p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">Total nómina</p>
                  <p className="mt-2 text-sm text-gray-200">Base: ${formatUSD(resumen.general.base)}</p>
                  <p className="text-sm text-gray-200">Descuentos: ${formatUSD(resumen.general.descuentos)}</p>
                  <p className="text-sm text-gray-200">Neto base: ${formatUSD(resumen.general.netoBase)}</p>
                  <p className="text-sm text-gray-200">Extras: ${formatUSD(resumen.general.extra)}</p>
                  <p className="text-sm text-gray-200">Neto total: ${formatUSD(resumen.general.neto)}</p>
                  <p className="text-sm text-gray-200">Adelantos: ${formatUSD(resumen.general.adelantos)}</p>
                  <p className="text-sm font-bold text-white">Adeudado: ${formatUSD(resumen.general.adeudado)}</p>
                  <p className="text-sm text-gray-200">Saldo a favor: ${formatUSD(resumen.general.saldoFavor)}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Historial de nómina</p>

                  {historialNominas.length === 0 && !loadingHistorial && (
                    <p className="mt-2 rounded-xl border border-dashed border-gray-200 bg-white p-3 text-[10px] text-gray-500">
                      Sin períodos cargados. Usa “Actualizar historial” para consultar nóminas guardadas.
                    </p>
                  )}

                  <div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {historialNominas.map((nomina) => {
                      const isPeriodoActual = nomina.periodo_ym === periodoNomina
                      const isAbriendo = abriendoNominaId === nomina.id

                      return (
                        <button
                          key={nomina.id}
                          onClick={() => void abrirNominaGuardada(nomina)}
                          disabled={isAbriendo || loading || guardandoNomina || guardandoBorrador}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${isPeriodoActual
                            ? 'border-black bg-black text-white'
                            : 'border-gray-200 bg-white hover:border-gray-400'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-bold ${isPeriodoActual ? 'text-white' : 'text-black'}`}>{getPeriodoLabel(nomina.periodo_ym)}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${isPeriodoActual ? 'bg-white text-black' : 'bg-gray-100 text-gray-500'}`}>
                              {nomina.estado || 'cerrada'}
                            </span>
                          </div>

                          <p className={`mt-1 text-[10px] ${isPeriodoActual ? 'text-gray-300' : 'text-gray-500'}`}>
                            Neto: ${formatUSD(getSafeMonto(nomina.total_neto))}
                          </p>

                          <p className={`mt-1 text-[9px] uppercase tracking-[0.08em] ${isPeriodoActual ? 'text-gray-300' : 'text-gray-400'}`}>
                            {isAbriendo ? 'Abriendo nómina...' : 'Abrir período guardado'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}
