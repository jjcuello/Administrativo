'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Landmark, Loader2, RefreshCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatUSD } from '@/lib/currency'

type Cuenta = {
  id: string
  nombre: string | null
  saldo_inicial: number | null
  moneda: string | null
  activo: boolean | null
}

type MovimientoRegistro = {
  id: string
  fecha: string
  concepto: string
  monto: number
  saldo: number
  rubro: string
}

type ItemVista =
  | { type: 'mes'; key: string; label: string }
  | { type: 'mov'; key: string; row: MovimientoRegistro }

type RubroResumen = {
  label: string
  monto: number
}

type ResumenCuentaMes = {
  periodoYm: string
  cuentaNombre: string
  ingresosGlobal: number
  egresosGlobal: number
  ingresos: RubroResumen[]
  egresos: RubroResumen[]
  totalIngresos: number
  totalEgresos: number
}

type RubroDistribucion = {
  label: string
  monto: number
  porcentaje: number
}

type TendenciaMes = {
  periodoYm: string
  label: string
  ingresos: number
  egresos: number
  neto: number
}

type ResumenDistribucionEscolar = {
  anioEscolar: string
  rangoLabel: string
  periodoHastaYm: string
  ingresos: RubroDistribucion[]
  egresos: RubroDistribucion[]
  totalIngresos: number
  totalEgresos: number
  totalEgresosAbs: number
  resultadoNeto: number
  ratioEgresoIngreso: number
  margenNeto: number
  promedioIngresos: number
  promedioEgresos: number
  tendencia: TendenciaMes[]
  mejorMesIngreso: string
  mejorMesEgreso: string
  mejorMesNeto: string
  peorMesNeto: string
  rubroIngresoPrincipal: string
  rubroEgresoPrincipal: string
}

type BalanceRubro = {
  label: string
  entrada: number
  salida: number
  saldo: number
  pendiente?: boolean
}

type ResumenBalanceEscolar = {
  anioEscolar: string
  rangoLabel: string
  periodoHastaYm: string
  ingresos: BalanceRubro[]
  egresos: BalanceRubro[]
  ajustesPendientes: BalanceRubro[]
  totalEntradas: number
  totalSalidas: number
  totalAjustes: number
  resultadoEjercicio: number
  resultadoAjustado: number
}

type RubroRule = {
  label: string
  match: string[]
}

type IngresoMesRow = {
  categoria_id: string | null
  cuenta_destino_id: string | null
  monto_usd: number | null
}

type EgresoMesRow = {
  categoria_id: string | null
  cuenta_id: string | null
  monto_usd: number | null
}

type IngresoPeriodoRow = {
  categoria_id: string | null
  monto_usd: number | null
  fecha_ingreso: string | null
}

type EgresoPeriodoRow = {
  categoria_id: string | null
  monto_usd: number | null
  fecha_pago: string | null
}

type CategoriaRow = {
  id: string
  nombre: string | null
}

type PieSegment = {
  label: string
  monto: number
  porcentaje: number
  startAngle: number
  endAngle: number
  colorClass: string
}

type ChartPoint = {
  x: number
  y: number
}

type NetoBarRect = {
  x: number
  y: number
  width: number
  height: number
  isPositive: boolean
  label: string
  value: number
}

const PERIODO_YM_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

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

const INGRESO_RUBROS: RubroRule[] = [
  { label: 'MAÑANA', match: ['manana', 'mañana'] },
  { label: 'TARDE', match: ['tarde'] },
  { label: 'NÚCLEO', match: ['nucleo', 'núcleo'] },
  { label: 'TORNEOS', match: ['torneo', 'club deportivo', 'club'] },
  { label: 'PARTICULARES', match: ['particular'] },
  { label: 'VIRTUALES', match: ['virtual'] },
  { label: 'VENTAS', match: ['venta'] },
  { label: 'CAPITAL', match: ['capital', 'aporte', 'donacion', 'donación'] },
]

const EGRESO_RUBROS: RubroRule[] = [
  { label: 'UTILIDADES', match: ['utilidad'] },
  { label: 'PROFESORES', match: ['nomina', 'nómina', 'profesor'] },
  { label: 'PROVEEDORES', match: ['proveedor', 'inventario', 'suministro', 'uniforme', 'equipo', 'activo', 'compra'] },
  { label: 'REDES', match: ['red', 'internet', 'wifi', 'telefon', 'condominio', 'servicios fijos'] },
  { label: 'CAPITAL', match: ['capital', 'prestamo', 'préstamo', 'interes', 'interés', 'pasivo'] },
  { label: 'GASTOS OPERATIVOS', match: ['operativo', 'mantenimiento', 'reparacion', 'reparación', 'transporte', 'logistica', 'logística'] },
  { label: 'GASTOS ADMINISTRATIVOS', match: ['administrativo', 'honorario', 'papeleria', 'papelería', 'oficina', 'publicidad', 'marketing', 'social media', 'diseno', 'diseño', 'audiovisual', 'promocion', 'promoción', 'banner', 'banners', 'ads'] },
]

const INGRESO_RUBROS_DISTRIBUCION: RubroRule[] = [
  { label: 'TOTAL MAÑANA', match: ['manana', 'mañana'] },
  { label: 'TOTAL TARDE', match: ['tarde'] },
  { label: 'TOTAL NUCLEO', match: ['nucleo', 'núcleo'] },
  { label: 'TOTAL TORNEOS', match: ['torneo', 'club deportivo', 'club'] },
  { label: 'TOTAL PARTICULARES', match: ['particular'] },
  { label: 'TOTAL VIRTUALES', match: ['virtual'] },
  { label: 'TOTAL VENTAS', match: ['venta'] },
  { label: 'TOTAL APORTES (CAPITAL)', match: ['aporte capital', 'aporte', 'capital'] },
  { label: 'TOTAL DONACIONES', match: ['donacion', 'donación'] },
]

const EGRESO_RUBROS_DISTRIBUCION: RubroRule[] = [
  { label: 'TOTAL UTILIDADES', match: ['utilidad'] },
  { label: 'TOTAL PROFESORES', match: ['nomina base', 'nomina extra', 'nomina', 'nómina', 'profesor'] },
  { label: 'TOTAL PROVEEDORES', match: ['proveedor', 'inventario', 'suministro', 'uniforme', 'equipo', 'activo', 'compra'] },
  { label: 'TOTAL REDES', match: ['red', 'internet', 'wifi', 'telefon', 'condominio', 'servicios fijos'] },
  { label: 'TOTAL PASIVOS (CAPITAL)', match: ['pasivo', 'capital', 'prestamo', 'préstamo', 'interes', 'interés'] },
  { label: 'TOTAL GASTOS OPERATIVOS', match: ['operativo', 'mantenimiento', 'reparacion', 'reparación', 'transporte', 'logistica', 'logística'] },
  { label: 'TOTAL GASTOS ADMINISTRATIVOS', match: ['administrativo', 'honorario', 'papeleria', 'papelería', 'oficina', 'publicidad', 'marketing', 'social media', 'diseno', 'diseño', 'audiovisual', 'promocion', 'promoción', 'banner', 'banners', 'ads'] },
]

const BALANCE_AJUSTES_PENDIENTES = [
  'INVENTARIO (FUENTE NO DISPONIBLE)',
  'RESULTADO CAMBIARIO (FUENTE NO DISPONIBLE)',
]

const ORDEN_CUENTAS_PREFERIDO = [
  'efectivo',
  'banco provincial',
  'pago movil',
  'patria',
  'fondos extranjeros',
  'binance',
  'banco exterior',
]

const PIE_COLORS_INGRESOS = [
  'text-green-600',
  'text-emerald-500',
  'text-lime-500',
  'text-cyan-500',
  'text-sky-500',
  'text-indigo-500',
  'text-violet-500',
  'text-amber-500',
  'text-yellow-500',
]

const PIE_COLORS_EGRESOS = [
  'text-red-600',
  'text-rose-500',
  'text-orange-500',
  'text-amber-500',
  'text-fuchsia-500',
  'text-pink-500',
  'text-purple-500',
]

const CHART_LAYOUT = {
  width: 760,
  height: 240,
  paddingX: 28,
  paddingTop: 18,
  paddingBottom: 34,
}

const PIE_LABEL_MIN_PERCENT = 5
const CATEGORIA_TRANSFERENCIA_INTERNA = 'transferencia interna'

const roundMoney = (value: number) => Math.round(value * 100) / 100

const normalizeText = (value?: string | null) => (
  (value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-VE')
    .replace(/\s+/g, ' ')
    .trim()
)

const isTransferenciaInternaCategoria = (value?: string | null) => (
  normalizeText(value) === CATEGORIA_TRANSFERENCIA_INTERNA
)

const excludeTransferenciaInternaRows = <TRow extends { categoria_id: string | null },>(
  rows: TRow[],
  categoriasById: Map<string, string>
) => {
  return rows.filter((row) => {
    const categoriaNombre = categoriasById.get(row.categoria_id || '') || ''
    return !isTransferenciaInternaCategoria(categoriaNombre)
  })
}

const createRubrosBase = (rules: RubroRule[]): RubroResumen[] => (
  rules.map((rule) => ({ label: rule.label, monto: 0 }))
)

const createEmptyResumenMes = (periodoYm: string, cuentaNombre?: string | null): ResumenCuentaMes => ({
  periodoYm,
  cuentaNombre: cuentaNombre || 'Cuenta',
  ingresosGlobal: 0,
  egresosGlobal: 0,
  ingresos: createRubrosBase(INGRESO_RUBROS),
  egresos: createRubrosBase(EGRESO_RUBROS),
  totalIngresos: 0,
  totalEgresos: 0,
})

const createEmptyDistribucionEscolar = (periodoYm: string): ResumenDistribucionEscolar => ({
  anioEscolar: getAnioEscolarFromPeriodo(periodoYm),
  rangoLabel: '',
  periodoHastaYm: periodoYm,
  ingresos: INGRESO_RUBROS_DISTRIBUCION.map((rule) => ({ label: rule.label, monto: 0, porcentaje: 0 })),
  egresos: EGRESO_RUBROS_DISTRIBUCION.map((rule) => ({ label: rule.label, monto: 0, porcentaje: 0 })),
  totalIngresos: 0,
  totalEgresos: 0,
  totalEgresosAbs: 0,
  resultadoNeto: 0,
  ratioEgresoIngreso: 0,
  margenNeto: 0,
  promedioIngresos: 0,
  promedioEgresos: 0,
  tendencia: [],
  mejorMesIngreso: 'N/A',
  mejorMesEgreso: 'N/A',
  mejorMesNeto: 'N/A',
  peorMesNeto: 'N/A',
  rubroIngresoPrincipal: 'N/A',
  rubroEgresoPrincipal: 'N/A',
})

const createEmptyBalanceEscolar = (periodoYm: string): ResumenBalanceEscolar => ({
  anioEscolar: getAnioEscolarFromPeriodo(periodoYm),
  rangoLabel: '',
  periodoHastaYm: periodoYm,
  ingresos: INGRESO_RUBROS_DISTRIBUCION.map((rule) => ({
    label: rule.label,
    entrada: 0,
    salida: 0,
    saldo: 0,
  })),
  egresos: EGRESO_RUBROS_DISTRIBUCION.map((rule) => ({
    label: rule.label,
    entrada: 0,
    salida: 0,
    saldo: 0,
  })),
  ajustesPendientes: BALANCE_AJUSTES_PENDIENTES.map((label) => ({
    label,
    entrada: 0,
    salida: 0,
    saldo: 0,
    pendiente: true,
  })),
  totalEntradas: 0,
  totalSalidas: 0,
  totalAjustes: 0,
  resultadoEjercicio: 0,
  resultadoAjustado: 0,
})

const getMonthDateRange = (periodoYm: string) => {
  if (!PERIODO_YM_REGEX.test(periodoYm)) return null

  const [year, month] = periodoYm.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()

  return {
    from: `${periodoYm}-01`,
    to: `${periodoYm}-${String(lastDay).padStart(2, '0')}`,
  }
}

const formatPeriodoYm = (periodoYm: string) => {
  if (!PERIODO_YM_REGEX.test(periodoYm)) return periodoYm

  const [year, month] = periodoYm.split('-').map(Number)
  const fecha = new Date(year, month - 1, 1)
  if (Number.isNaN(fecha.getTime())) return periodoYm

  return new Intl.DateTimeFormat('es-VE', {
    month: 'long',
    year: 'numeric',
  }).format(fecha)
}

const parsePeriodoYm = (periodoYm: string) => {
  if (!PERIODO_YM_REGEX.test(periodoYm)) return null

  const [year, month] = periodoYm.split('-').map(Number)
  return { year, month }
}

const getCurrentSchoolYearStart = () => {
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  return month >= 9 ? year : year - 1
}

const parseAnioEscolar = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{4})$/)
  if (!match) return null

  const startYear = Number(match[1])
  const endYear = Number(match[2])
  if (endYear !== startYear + 1) return null

  return { startYear, endYear }
}

const getAnioEscolarFromPeriodo = (periodoYm: string) => {
  const parsed = parsePeriodoYm(periodoYm)
  const startYear = parsed ? (parsed.month >= 9 ? parsed.year : parsed.year - 1) : getCurrentSchoolYearStart()
  return `${startYear}-${startYear + 1}`
}

const buildPeriodoFromAnioEscolar = (anioEscolar: string, month: number) => {
  const parsedSchoolYear = parseAnioEscolar(anioEscolar)
  const safeMonth = Math.min(Math.max(month, 1), 12)

  if (!parsedSchoolYear) {
    const fallbackStartYear = getCurrentSchoolYearStart()
    const year = safeMonth >= 9 ? fallbackStartYear : fallbackStartYear + 1
    return `${year}-${String(safeMonth).padStart(2, '0')}`
  }

  const year = safeMonth >= 9 ? parsedSchoolYear.startYear : parsedSchoolYear.endYear
  return `${year}-${String(safeMonth).padStart(2, '0')}`
}

const buildOpcionesAnioEscolar = (anioEscolarSeleccionado: string) => {
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
      label: `${startYear}-${startYear + 1}`,
    }))
}

const getRangoEscolarLabel = (periodoYm: string) => {
  const parsedSchoolYear = parseAnioEscolar(getAnioEscolarFromPeriodo(periodoYm))
  if (!parsedSchoolYear) return formatPeriodoYm(periodoYm)

  const periodoInicio = `${parsedSchoolYear.startYear}-09`
  return `${formatPeriodoYm(periodoInicio)} - ${formatPeriodoYm(periodoYm)}`
}

const getPeriodosEscolaresHasta = (periodoYm: string) => {
  const anioEscolar = getAnioEscolarFromPeriodo(periodoYm)
  const periodos: string[] = []

  for (const mes of MESES_ANIO_ESCOLAR) {
    const ym = buildPeriodoFromAnioEscolar(anioEscolar, mes.month)
    periodos.push(ym)
    if (ym === periodoYm) break
  }

  return periodos
}

const formatPeriodoCorto = (periodoYm: string) => {
  const etiqueta = formatPeriodoYm(periodoYm)
  const [mes] = etiqueta.split(' ')
  return (mes || etiqueta).slice(0, 3).toUpperCase()
}

const buildRubrosConPorcentaje = (rows: RubroResumen[], total: number, useAbsolute = false): RubroDistribucion[] => {
  const denominador = useAbsolute ? Math.abs(total) : total

  return rows.map((row) => {
    const base = useAbsolute ? Math.abs(row.monto) : row.monto
    const porcentaje = denominador > 0 ? roundMoney((base * 100) / denominador) : 0

    return {
      label: row.label,
      monto: row.monto,
      porcentaje,
    }
  })
}

const formatPorcentaje = (value: number) => {
  return `${new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`
}

const polarToCartesian = (cx: number, cy: number, radius: number, angleDeg: number) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180

  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

const describePieSlicePath = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

const buildPieSegments = (
  items: RubroDistribucion[],
  colorClasses: string[],
  useAbsolute = false
): PieSegment[] => {
  const slices = items.filter((item) => {
    const value = useAbsolute ? Math.abs(item.monto) : item.monto
    return value > 0 && item.porcentaje > 0
  })

  let currentAngle = 0

  return slices.map((item, index) => {
    const isLast = index === slices.length - 1
    const span = (item.porcentaje / 100) * 360
    const startAngle = currentAngle
    const endAngle = isLast ? 360 : Math.min(360, currentAngle + span)
    currentAngle = endAngle

    return {
      label: item.label,
      monto: item.monto,
      porcentaje: item.porcentaje,
      startAngle,
      endAngle,
      colorClass: colorClasses[index % colorClasses.length],
    }
  })
}

const buildLineCoordinates = (values: number[], maxValue: number): ChartPoint[] => {
  const { width, height, paddingX, paddingTop, paddingBottom } = CHART_LAYOUT
  const plotWidth = width - (paddingX * 2)
  const plotHeight = height - paddingTop - paddingBottom
  const safeMax = maxValue > 0 ? maxValue : 1

  return values.map((value, index) => {
    const x = values.length <= 1
      ? paddingX + (plotWidth / 2)
      : paddingX + (index / (values.length - 1)) * plotWidth
    const y = paddingTop + (1 - (value / safeMax)) * plotHeight

    return { x, y }
  })
}

const toPolylinePoints = (points: ChartPoint[]) => {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

const buildNetoBarRects = (rows: TendenciaMes[]): NetoBarRect[] => {
  const { width, height, paddingX, paddingTop, paddingBottom } = CHART_LAYOUT
  const plotTop = paddingTop
  const plotBottom = height - paddingBottom
  const plotWidth = width - (paddingX * 2)
  const baselineY = plotTop + ((plotBottom - plotTop) / 2)
  const slots = Math.max(rows.length, 1)
  const step = plotWidth / slots
  const barWidth = Math.min(28, step * 0.62)
  const maxAbs = rows.reduce((maximo, row) => {
    return Math.max(maximo, Math.abs(row.neto))
  }, 0) || 1

  return rows.map((row, index) => {
    const centerX = paddingX + (step * index) + (step / 2)
    const heightValue = (Math.abs(row.neto) / maxAbs) * ((plotBottom - plotTop) / 2)
    const y = row.neto >= 0 ? baselineY - heightValue : baselineY

    return {
      x: centerX - (barWidth / 2),
      y,
      width: barWidth,
      height: heightValue,
      isPositive: row.neto >= 0,
      label: row.label,
      value: row.neto,
    }
  })
}

const buildResumenRubros = (
  rows: Array<{ categoria_id: string | null; monto_usd: number | null }>,
  categoriasById: Map<string, string>,
  rules: RubroRule[],
  sign: 1 | -1,
  fallbackLabel?: string
) => {
  const totals = new Map<string, number>()
  for (const rule of rules) totals.set(rule.label, 0)

  for (const row of rows) {
    const montoBase = roundMoney(Math.abs(Number(row.monto_usd || 0)))
    if (!montoBase) continue

    const categoriaNombre = categoriasById.get(row.categoria_id || '') || ''
    const categoriaNormalizada = normalizeText(categoriaNombre)
    if (!categoriaNormalizada) continue

    const rule = rules.find((rubro) => rubro.match.some((keyword) => categoriaNormalizada.includes(normalizeText(keyword))))
    const targetLabel = rule?.label || fallbackLabel
    if (!targetLabel) continue

    if (!totals.has(targetLabel)) totals.set(targetLabel, 0)
    const acumulado = totals.get(targetLabel) || 0
    totals.set(targetLabel, roundMoney(acumulado + (sign * montoBase)))
  }

  return rules.map((rule) => ({
    label: rule.label,
    monto: roundMoney(totals.get(rule.label) || 0),
  }))
}

const buildBalanceRubros = (rows: RubroResumen[], kind: 'ingreso' | 'egreso'): BalanceRubro[] => {
  return rows.map((row) => {
    const montoBase = roundMoney(Math.abs(row.monto))

    if (kind === 'ingreso') {
      return {
        label: row.label,
        entrada: montoBase,
        salida: 0,
        saldo: montoBase,
      }
    }

    return {
      label: row.label,
      entrada: 0,
      salida: montoBase,
      saldo: roundMoney(-montoBase),
    }
  })
}

const toDateOnly = (value?: string | null) => {
  if (!value) return ''

  const raw = String(value).trim()
  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (directMatch) return directMatch[1]

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

const formatFechaCorta = (fechaIso: string) => {
  if (!fechaIso) return 'Sin fecha'
  const parsed = new Date(`${fechaIso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return fechaIso

  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

const formatMes = (fechaIso: string) => {
  const parsed = new Date(`${fechaIso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Sin mes'

  const label = new Intl.DateTimeFormat('es-VE', {
    month: 'long',
    year: 'numeric',
  }).format(parsed)

  return label.toLocaleLowerCase('es-VE')
}

const formatMontoConSigno = (monto: number) => {
  if (monto < 0) return `-$${formatUSD(Math.abs(monto))}`
  return `$${formatUSD(monto)}`
}

const formatMontoColumna = (monto: number) => {
  if (!monto) return '—'
  return `$${formatUSD(monto)}`
}

const formatMontoConSignoCompact = (monto: number) => {
  const absValue = formatUSD(Math.abs(monto), { withSymbol: true, compact: true })
  if (monto < 0) return `-${absValue}`
  return absValue
}

const getPieTooltipText = (label: string, monto: number, porcentaje: number) => {
  return `${label}: ${formatMontoConSigno(monto)} (${formatPorcentaje(porcentaje)})`
}

const sortCuentasByPreferredOrder = (rows: Cuenta[]) => {
  const rankByName = new Map(ORDEN_CUENTAS_PREFERIDO.map((name, index) => [name, index]))

  return [...rows].sort((a, b) => {
    const aName = normalizeText(a.nombre)
    const bName = normalizeText(b.nombre)
    const aRank = rankByName.has(aName) ? (rankByName.get(aName) as number) : Number.MAX_SAFE_INTEGER
    const bRank = rankByName.has(bName) ? (rankByName.get(bName) as number) : Number.MAX_SAFE_INTEGER

    if (aRank !== bRank) return aRank - bRank
    return aName.localeCompare(bName, 'es')
  })
}

const getErrorText = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }

  return fallback
}

export default function GestionSociosRegistroPage() {
  const router = useRouter()
  const currentPeriodoYm = new Date().toISOString().slice(0, 7)
  const [moduloActivo, setModuloActivo] = useState<'registro' | 'resumen' | 'distribucion' | 'balance'>('registro')
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [cuentaId, setCuentaId] = useState('')
  const [periodoRegistroYm, setPeriodoRegistroYm] = useState(currentPeriodoYm)
  const [movimientos, setMovimientos] = useState<MovimientoRegistro[]>([])
  const [saldoAperturaRegistro, setSaldoAperturaRegistro] = useState(0)
  const [cargandoCuentas, setCargandoCuentas] = useState(true)
  const [cargandoRegistro, setCargandoRegistro] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [periodoResumenYm, setPeriodoResumenYm] = useState(currentPeriodoYm)
  const [resumenMesCuenta, setResumenMesCuenta] = useState<ResumenCuentaMes>(() => createEmptyResumenMes(currentPeriodoYm, 'Cuenta'))
  const [cargandoResumenMes, setCargandoResumenMes] = useState(false)
  const [mensajeResumenMes, setMensajeResumenMes] = useState('')
  const [periodoDistribucionYm, setPeriodoDistribucionYm] = useState(currentPeriodoYm)
  const [resumenDistribucion, setResumenDistribucion] = useState<ResumenDistribucionEscolar>(() => createEmptyDistribucionEscolar(currentPeriodoYm))
  const [cargandoDistribucion, setCargandoDistribucion] = useState(false)
  const [mensajeDistribucion, setMensajeDistribucion] = useState('')
  const [periodoBalanceYm, setPeriodoBalanceYm] = useState(currentPeriodoYm)
  const [resumenBalance, setResumenBalance] = useState<ResumenBalanceEscolar>(() => createEmptyBalanceEscolar(currentPeriodoYm))
  const [cargandoBalance, setCargandoBalance] = useState(false)
  const [mensajeBalance, setMensajeBalance] = useState('')

  const anioEscolarRegistro = useMemo(
    () => getAnioEscolarFromPeriodo(periodoRegistroYm),
    [periodoRegistroYm]
  )

  const mesRegistroSeleccionado = useMemo(() => {
    const parsed = parsePeriodoYm(periodoRegistroYm)
    return parsed?.month || (new Date().getMonth() + 1)
  }, [periodoRegistroYm])

  const opcionesAnioEscolarRegistro = useMemo(() => {
    return buildOpcionesAnioEscolar(anioEscolarRegistro)
  }, [anioEscolarRegistro])

  const anioEscolarResumen = useMemo(
    () => getAnioEscolarFromPeriodo(periodoResumenYm),
    [periodoResumenYm]
  )

  const mesResumenSeleccionado = useMemo(() => {
    const parsed = parsePeriodoYm(periodoResumenYm)
    return parsed?.month || (new Date().getMonth() + 1)
  }, [periodoResumenYm])

  const opcionesAnioEscolarResumen = useMemo(() => {
    return buildOpcionesAnioEscolar(anioEscolarResumen)
  }, [anioEscolarResumen])

  const anioEscolarDistribucion = useMemo(
    () => getAnioEscolarFromPeriodo(periodoDistribucionYm),
    [periodoDistribucionYm]
  )

  const mesDistribucionSeleccionado = useMemo(() => {
    const parsed = parsePeriodoYm(periodoDistribucionYm)
    return parsed?.month || (new Date().getMonth() + 1)
  }, [periodoDistribucionYm])

  const opcionesAnioEscolarDistribucion = useMemo(() => {
    return buildOpcionesAnioEscolar(anioEscolarDistribucion)
  }, [anioEscolarDistribucion])

  const anioEscolarBalance = useMemo(
    () => getAnioEscolarFromPeriodo(periodoBalanceYm),
    [periodoBalanceYm]
  )

  const mesBalanceSeleccionado = useMemo(() => {
    const parsed = parsePeriodoYm(periodoBalanceYm)
    return parsed?.month || (new Date().getMonth() + 1)
  }, [periodoBalanceYm])

  const opcionesAnioEscolarBalance = useMemo(() => {
    return buildOpcionesAnioEscolar(anioEscolarBalance)
  }, [anioEscolarBalance])

  const cuentaSeleccionada = useMemo(
    () => cuentas.find((cuenta) => cuenta.id === cuentaId) || null,
    [cuentas, cuentaId]
  )

  const cargarCuentas = useCallback(async () => {
    setCargandoCuentas(true)
    setMensaje('')

    const { data, error } = await supabase
      .from('cuentas_financieras')
      .select('id, nombre, saldo_inicial, moneda, activo')
      .is('deleted_at', null)
      .order('nombre', { ascending: true })

    if (error) {
      setCuentas([])
      setCuentaId('')
      setMensaje(`❌ ${getErrorText(error, 'No se pudieron cargar las cuentas.')}`)
      setCargandoCuentas(false)
      return
    }

    const cuentasData = ((data as Cuenta[] | null) ?? []).filter((cuenta) => cuenta.activo !== false)
    const cuentasOrdenadas = sortCuentasByPreferredOrder(cuentasData)
    const nextCuentaId = cuentasOrdenadas[0]?.id || ''

    setCuentas(cuentasOrdenadas)
    setCuentaId((prev) => (prev && cuentasOrdenadas.some((cuenta) => cuenta.id === prev) ? prev : nextCuentaId))

    if (!nextCuentaId) {
      setMovimientos([])
      setSaldoAperturaRegistro(0)
      setResumenMesCuenta(createEmptyResumenMes(periodoResumenYm, 'Cuenta'))
    }

    setCargandoCuentas(false)
  }, [periodoResumenYm])

  const cargarRegistroCuenta = useCallback(async () => {
    if (!cuentaId || !cuentaSeleccionada) {
      setMovimientos([])
      setSaldoAperturaRegistro(0)
      return
    }

    const rangoRegistro = getMonthDateRange(periodoRegistroYm)
    if (!rangoRegistro) {
      setMovimientos([])
      setSaldoAperturaRegistro(roundMoney(Number(cuentaSeleccionada.saldo_inicial || 0)))
      setMensaje('⚠️ Selecciona un mes válido para consultar el registro diario.')
      return
    }

    setCargandoRegistro(true)

    const [ingresosRes, egresosRes, categoriasIngresosRes, categoriasEgresosRes, ingresosPrevRes, egresosPrevRes] = await Promise.all([
      supabase
        .from('ingresos')
        .select('id, fecha_ingreso, descripcion, monto_usd, categoria_id')
        .eq('cuenta_destino_id', cuentaId)
        .is('deleted_at', null)
        .gte('fecha_ingreso', rangoRegistro.from)
        .lte('fecha_ingreso', rangoRegistro.to),
      supabase
        .from('egresos')
        .select('id, fecha_pago, observaciones, beneficiario, monto_usd, categoria_id')
        .eq('cuenta_id', cuentaId)
        .gte('fecha_pago', rangoRegistro.from)
        .lte('fecha_pago', rangoRegistro.to),
      supabase
        .from('categorias_ingreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('categorias_egreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('ingresos')
        .select('monto_usd')
        .eq('cuenta_destino_id', cuentaId)
        .is('deleted_at', null)
        .lt('fecha_ingreso', rangoRegistro.from),
      supabase
        .from('egresos')
        .select('monto_usd')
        .eq('cuenta_id', cuentaId)
        .lt('fecha_pago', rangoRegistro.from),
    ])

    if (ingresosRes.error) {
      setMensaje(`❌ ${getErrorText(ingresosRes.error, 'No se pudo cargar ingresos de la cuenta.')}`)
      setMovimientos([])
      setCargandoRegistro(false)
      return
    }

    if (egresosRes.error) {
      setMensaje(`❌ ${getErrorText(egresosRes.error, 'No se pudo cargar egresos de la cuenta.')}`)
      setMovimientos([])
      setCargandoRegistro(false)
      return
    }

    if (ingresosPrevRes.error) {
      setMensaje(`❌ ${getErrorText(ingresosPrevRes.error, 'No se pudo calcular el saldo inicial del mes.')}`)
      setMovimientos([])
      setCargandoRegistro(false)
      return
    }

    if (egresosPrevRes.error) {
      setMensaje(`❌ ${getErrorText(egresosPrevRes.error, 'No se pudo calcular el saldo inicial del mes.')}`)
      setMovimientos([])
      setCargandoRegistro(false)
      return
    }

    const categoriasIngresosById = new Map(
      (((categoriasIngresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const categoriasEgresosById = new Map(
      (((categoriasEgresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const warningRubros = categoriasIngresosRes.error || categoriasEgresosRes.error
      ? '⚠️ No se pudieron cargar todos los rubros; se muestran valores genéricos en algunos movimientos.'
      : ''

    const ingresosPreviosTotal = roundMoney(
      (((ingresosPrevRes.data as Array<{ monto_usd: number | null }> | null) ?? [])
        .reduce((acc, row) => acc + Math.abs(Number(row.monto_usd || 0)), 0))
    )

    const egresosPreviosTotal = roundMoney(
      (((egresosPrevRes.data as Array<{ monto_usd: number | null }> | null) ?? [])
        .reduce((acc, row) => acc + Math.abs(Number(row.monto_usd || 0)), 0))
    )

    const saldoInicialCuenta = roundMoney(Number(cuentaSeleccionada.saldo_inicial || 0))
    const saldoAperturaMes = roundMoney(saldoInicialCuenta + ingresosPreviosTotal - egresosPreviosTotal)

    const ingresosRows = ((ingresosRes.data as Array<{
      id: string
      fecha_ingreso: string | null
      descripcion: string | null
      monto_usd: number | null
      categoria_id: string | null
    }> | null) ?? []).map((item) => ({
      id: `ing-${item.id}`,
      fecha: toDateOnly(item.fecha_ingreso),
      concepto: (item.descripcion || '').trim() || 'Ingreso',
      monto: roundMoney(Math.abs(Number(item.monto_usd || 0))),
      rubro: categoriasIngresosById.get(item.categoria_id || '') || 'Ingreso',
    }))

    const egresosRows = ((egresosRes.data as Array<{
      id: string
      fecha_pago: string | null
      observaciones: string | null
      beneficiario: string | null
      monto_usd: number | null
      categoria_id: string | null
    }> | null) ?? []).map((item) => ({
      id: `egr-${item.id}`,
      fecha: toDateOnly(item.fecha_pago),
      concepto: (item.observaciones || item.beneficiario || '').trim() || 'Egreso',
      monto: roundMoney(-Math.abs(Number(item.monto_usd || 0))),
      rubro: categoriasEgresosById.get(item.categoria_id || '') || 'Egreso',
    }))

    const allMovimientos = [...ingresosRows, ...egresosRows]
      .filter((item) => item.fecha)
      .sort((a, b) => {
        const byDate = a.fecha.localeCompare(b.fecha)
        if (byDate !== 0) return byDate
        return a.id.localeCompare(b.id)
      })

    let saldo = saldoAperturaMes
    const registro = allMovimientos.map((item) => {
      saldo = roundMoney(saldo + item.monto)
      return {
        id: item.id,
        fecha: item.fecha,
        concepto: item.concepto,
        monto: item.monto,
        saldo,
        rubro: item.rubro,
      }
    })

    setSaldoAperturaRegistro(saldoAperturaMes)
    setMovimientos(registro)
    setMensaje(warningRubros)
    setCargandoRegistro(false)
  }, [cuentaId, cuentaSeleccionada, periodoRegistroYm])

  const cargarResumenMensualCuenta = useCallback(async () => {
    if (!cuentaId || !cuentaSeleccionada || !PERIODO_YM_REGEX.test(periodoResumenYm)) {
      return
    }

    const rango = getMonthDateRange(periodoResumenYm)
    if (!rango) {
      setResumenMesCuenta(createEmptyResumenMes(periodoResumenYm, cuentaSeleccionada.nombre || 'Cuenta'))
      return
    }

    setCargandoResumenMes(true)
    setMensajeResumenMes('')

    const [categoriasIngresosRes, categoriasEgresosRes, ingresosRes, egresosRes] = await Promise.all([
      supabase
        .from('categorias_ingreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('categorias_egreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('ingresos')
        .select('categoria_id, cuenta_destino_id, monto_usd')
        .is('deleted_at', null)
        .gte('fecha_ingreso', rango.from)
        .lte('fecha_ingreso', rango.to),
      supabase
        .from('egresos')
        .select('categoria_id, cuenta_id, monto_usd')
        .gte('fecha_pago', rango.from)
        .lte('fecha_pago', rango.to),
    ])

    if (categoriasIngresosRes.error) {
      setMensajeResumenMes(`❌ ${getErrorText(categoriasIngresosRes.error, 'No se pudo cargar categorías de ingresos para el resumen mensual.')}`)
      setResumenMesCuenta(createEmptyResumenMes(periodoResumenYm, cuentaSeleccionada.nombre || 'Cuenta'))
      setCargandoResumenMes(false)
      return
    }

    if (categoriasEgresosRes.error) {
      setMensajeResumenMes(`❌ ${getErrorText(categoriasEgresosRes.error, 'No se pudo cargar categorías de egresos para el resumen mensual.')}`)
      setResumenMesCuenta(createEmptyResumenMes(periodoResumenYm, cuentaSeleccionada.nombre || 'Cuenta'))
      setCargandoResumenMes(false)
      return
    }

    if (ingresosRes.error) {
      setMensajeResumenMes(`❌ ${getErrorText(ingresosRes.error, 'No se pudo cargar ingresos del mes para el resumen.')}`)
      setResumenMesCuenta(createEmptyResumenMes(periodoResumenYm, cuentaSeleccionada.nombre || 'Cuenta'))
      setCargandoResumenMes(false)
      return
    }

    if (egresosRes.error) {
      setMensajeResumenMes(`❌ ${getErrorText(egresosRes.error, 'No se pudo cargar egresos del mes para el resumen.')}`)
      setResumenMesCuenta(createEmptyResumenMes(periodoResumenYm, cuentaSeleccionada.nombre || 'Cuenta'))
      setCargandoResumenMes(false)
      return
    }

    const categoriasIngresosById = new Map(
      (((categoriasIngresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const categoriasEgresosById = new Map(
      (((categoriasEgresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const ingresosMes = (ingresosRes.data as IngresoMesRow[] | null) ?? []
    const egresosMes = (egresosRes.data as EgresoMesRow[] | null) ?? []
    const ingresosMesAnaliticos = excludeTransferenciaInternaRows(ingresosMes, categoriasIngresosById)
    const egresosMesAnaliticos = excludeTransferenciaInternaRows(egresosMes, categoriasEgresosById)

    const ingresosGlobal = roundMoney(
      ingresosMesAnaliticos.reduce((acc, row) => acc + Math.abs(Number(row.monto_usd || 0)), 0)
    )

    const egresosGlobal = roundMoney(
      -egresosMesAnaliticos.reduce((acc, row) => acc + Math.abs(Number(row.monto_usd || 0)), 0)
    )

    const ingresosCuentaRows = ingresosMesAnaliticos.filter((row) => row.cuenta_destino_id === cuentaId)
    const egresosCuentaRows = egresosMesAnaliticos.filter((row) => row.cuenta_id === cuentaId)

    const ingresosRubros = buildResumenRubros(ingresosCuentaRows, categoriasIngresosById, INGRESO_RUBROS, 1)
    const egresosRubros = buildResumenRubros(
      egresosCuentaRows,
      categoriasEgresosById,
      EGRESO_RUBROS,
      -1,
      'GASTOS ADMINISTRATIVOS'
    )

    const totalIngresos = roundMoney(ingresosRubros.reduce((acc, item) => acc + item.monto, 0))
    const totalEgresos = roundMoney(egresosRubros.reduce((acc, item) => acc + item.monto, 0))

    setResumenMesCuenta({
      periodoYm: periodoResumenYm,
      cuentaNombre: cuentaSeleccionada.nombre || 'Cuenta',
      ingresosGlobal,
      egresosGlobal,
      ingresos: ingresosRubros,
      egresos: egresosRubros,
      totalIngresos,
      totalEgresos,
    })

    setMensajeResumenMes('')
    setCargandoResumenMes(false)
  }, [cuentaId, cuentaSeleccionada, periodoResumenYm])

  const cargarDistribucionEscolar = useCallback(async () => {
    if (!PERIODO_YM_REGEX.test(periodoDistribucionYm)) {
      setMensajeDistribucion('⚠️ Selecciona un período válido para calcular la distribución escolar.')
      setResumenDistribucion(createEmptyDistribucionEscolar(periodoDistribucionYm))
      return
    }

    const anioEscolar = getAnioEscolarFromPeriodo(periodoDistribucionYm)
    const parsedSchoolYear = parseAnioEscolar(anioEscolar)
    const rangoHasta = getMonthDateRange(periodoDistribucionYm)

    if (!parsedSchoolYear || !rangoHasta) {
      setMensajeDistribucion('⚠️ No se pudo determinar el rango escolar para el cálculo.')
      setResumenDistribucion(createEmptyDistribucionEscolar(periodoDistribucionYm))
      return
    }

    const rangoDesde = `${parsedSchoolYear.startYear}-09-01`

    setCargandoDistribucion(true)
    setMensajeDistribucion('')

    const [categoriasIngresosRes, categoriasEgresosRes, ingresosRes, egresosRes] = await Promise.all([
      supabase
        .from('categorias_ingreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('categorias_egreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('ingresos')
        .select('categoria_id, monto_usd, fecha_ingreso')
        .is('deleted_at', null)
        .gte('fecha_ingreso', rangoDesde)
        .lte('fecha_ingreso', rangoHasta.to),
      supabase
        .from('egresos')
        .select('categoria_id, monto_usd, fecha_pago')
        .gte('fecha_pago', rangoDesde)
        .lte('fecha_pago', rangoHasta.to),
    ])

    if (categoriasIngresosRes.error) {
      setMensajeDistribucion(`❌ ${getErrorText(categoriasIngresosRes.error, 'No se pudieron cargar categorías de ingresos.')}`)
      setResumenDistribucion(createEmptyDistribucionEscolar(periodoDistribucionYm))
      setCargandoDistribucion(false)
      return
    }

    if (categoriasEgresosRes.error) {
      setMensajeDistribucion(`❌ ${getErrorText(categoriasEgresosRes.error, 'No se pudieron cargar categorías de egresos.')}`)
      setResumenDistribucion(createEmptyDistribucionEscolar(periodoDistribucionYm))
      setCargandoDistribucion(false)
      return
    }

    if (ingresosRes.error) {
      setMensajeDistribucion(`❌ ${getErrorText(ingresosRes.error, 'No se pudieron cargar ingresos para la distribución escolar.')}`)
      setResumenDistribucion(createEmptyDistribucionEscolar(periodoDistribucionYm))
      setCargandoDistribucion(false)
      return
    }

    if (egresosRes.error) {
      setMensajeDistribucion(`❌ ${getErrorText(egresosRes.error, 'No se pudieron cargar egresos para la distribución escolar.')}`)
      setResumenDistribucion(createEmptyDistribucionEscolar(periodoDistribucionYm))
      setCargandoDistribucion(false)
      return
    }

    const categoriasIngresosById = new Map(
      (((categoriasIngresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const categoriasEgresosById = new Map(
      (((categoriasEgresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const ingresosRows = (ingresosRes.data as IngresoPeriodoRow[] | null) ?? []
    const egresosRows = (egresosRes.data as EgresoPeriodoRow[] | null) ?? []
    const ingresosRowsAnaliticos = excludeTransferenciaInternaRows(ingresosRows, categoriasIngresosById)
    const egresosRowsAnaliticos = excludeTransferenciaInternaRows(egresosRows, categoriasEgresosById)

    const ingresosRubrosBase = buildResumenRubros(ingresosRowsAnaliticos, categoriasIngresosById, INGRESO_RUBROS_DISTRIBUCION, 1)
    const egresosRubrosBase = buildResumenRubros(
      egresosRowsAnaliticos,
      categoriasEgresosById,
      EGRESO_RUBROS_DISTRIBUCION,
      -1,
      'TOTAL GASTOS ADMINISTRATIVOS'
    )

    const totalIngresos = roundMoney(ingresosRubrosBase.reduce((acc, item) => acc + item.monto, 0))
    const totalEgresos = roundMoney(egresosRubrosBase.reduce((acc, item) => acc + item.monto, 0))
    const totalEgresosAbs = roundMoney(Math.abs(totalEgresos))
    const resultadoNeto = roundMoney(totalIngresos + totalEgresos)
    const ratioEgresoIngreso = totalIngresos > 0 ? roundMoney((totalEgresosAbs * 100) / totalIngresos) : 0
    const margenNeto = totalIngresos > 0 ? roundMoney((resultadoNeto * 100) / totalIngresos) : 0

    const ingresosRubros = buildRubrosConPorcentaje(ingresosRubrosBase, totalIngresos)
    const egresosRubros = buildRubrosConPorcentaje(egresosRubrosBase, totalEgresos, true)

    const periodosTendencia = getPeriodosEscolaresHasta(periodoDistribucionYm)
    const periodosSet = new Set(periodosTendencia)

    const ingresosPorPeriodo = new Map<string, number>()
    const egresosPorPeriodo = new Map<string, number>()

    for (const ingreso of ingresosRowsAnaliticos) {
      const fecha = toDateOnly(ingreso.fecha_ingreso)
      const periodo = fecha.slice(0, 7)
      if (!periodosSet.has(periodo)) continue

      const acumulado = ingresosPorPeriodo.get(periodo) || 0
      ingresosPorPeriodo.set(periodo, roundMoney(acumulado + Math.abs(Number(ingreso.monto_usd || 0))))
    }

    for (const egreso of egresosRowsAnaliticos) {
      const fecha = toDateOnly(egreso.fecha_pago)
      const periodo = fecha.slice(0, 7)
      if (!periodosSet.has(periodo)) continue

      const acumulado = egresosPorPeriodo.get(periodo) || 0
      egresosPorPeriodo.set(periodo, roundMoney(acumulado + Math.abs(Number(egreso.monto_usd || 0))))
    }

    const tendencia = periodosTendencia.map((periodoYm) => {
      const ingresos = roundMoney(ingresosPorPeriodo.get(periodoYm) || 0)
      const egresos = roundMoney(egresosPorPeriodo.get(periodoYm) || 0)
      const neto = roundMoney(ingresos - egresos)

      return {
        periodoYm,
        label: formatPeriodoCorto(periodoYm),
        ingresos,
        egresos,
        neto,
      }
    })

    const mesesConData = tendencia.length || 1
    const promedioIngresos = roundMoney(totalIngresos / mesesConData)
    const promedioEgresos = roundMoney(totalEgresosAbs / mesesConData)

    const mejorIngresoItem = tendencia.reduce((best, current) => current.ingresos > best.ingresos ? current : best, tendencia[0] || { periodoYm: '', label: '', ingresos: 0, egresos: 0, neto: 0 })
    const mejorEgresoItem = tendencia.reduce((best, current) => current.egresos > best.egresos ? current : best, tendencia[0] || { periodoYm: '', label: '', ingresos: 0, egresos: 0, neto: 0 })
    const mejorNetoItem = tendencia.reduce((best, current) => current.neto > best.neto ? current : best, tendencia[0] || { periodoYm: '', label: '', ingresos: 0, egresos: 0, neto: 0 })
    const peorNetoItem = tendencia.reduce((worst, current) => current.neto < worst.neto ? current : worst, tendencia[0] || { periodoYm: '', label: '', ingresos: 0, egresos: 0, neto: 0 })

    const topIngreso = ingresosRubros.reduce((best, current) => current.monto > best.monto ? current : best, ingresosRubros[0] || { label: 'N/A', monto: 0, porcentaje: 0 })
    const topEgreso = egresosRubros.reduce((best, current) => Math.abs(current.monto) > Math.abs(best.monto) ? current : best, egresosRubros[0] || { label: 'N/A', monto: 0, porcentaje: 0 })

    setResumenDistribucion({
      anioEscolar,
      rangoLabel: getRangoEscolarLabel(periodoDistribucionYm),
      periodoHastaYm: periodoDistribucionYm,
      ingresos: ingresosRubros,
      egresos: egresosRubros,
      totalIngresos,
      totalEgresos,
      totalEgresosAbs,
      resultadoNeto,
      ratioEgresoIngreso,
      margenNeto,
      promedioIngresos,
      promedioEgresos,
      tendencia,
      mejorMesIngreso: mejorIngresoItem.periodoYm ? formatPeriodoYm(mejorIngresoItem.periodoYm) : 'N/A',
      mejorMesEgreso: mejorEgresoItem.periodoYm ? formatPeriodoYm(mejorEgresoItem.periodoYm) : 'N/A',
      mejorMesNeto: mejorNetoItem.periodoYm ? formatPeriodoYm(mejorNetoItem.periodoYm) : 'N/A',
      peorMesNeto: peorNetoItem.periodoYm ? formatPeriodoYm(peorNetoItem.periodoYm) : 'N/A',
      rubroIngresoPrincipal: topIngreso.label,
      rubroEgresoPrincipal: topEgreso.label,
    })

    setMensajeDistribucion('')
    setCargandoDistribucion(false)
  }, [periodoDistribucionYm])

  const cargarBalanceEscolar = useCallback(async () => {
    if (!PERIODO_YM_REGEX.test(periodoBalanceYm)) {
      setMensajeBalance('⚠️ Selecciona un período válido para generar el balance.')
      setResumenBalance(createEmptyBalanceEscolar(periodoBalanceYm))
      return
    }

    const anioEscolar = getAnioEscolarFromPeriodo(periodoBalanceYm)
    const parsedSchoolYear = parseAnioEscolar(anioEscolar)
    const rangoHasta = getMonthDateRange(periodoBalanceYm)

    if (!parsedSchoolYear || !rangoHasta) {
      setMensajeBalance('⚠️ No se pudo determinar el rango escolar para el balance.')
      setResumenBalance(createEmptyBalanceEscolar(periodoBalanceYm))
      return
    }

    const rangoDesde = `${parsedSchoolYear.startYear}-09-01`

    setCargandoBalance(true)
    setMensajeBalance('')

    const [categoriasIngresosRes, categoriasEgresosRes, ingresosRes, egresosRes] = await Promise.all([
      supabase
        .from('categorias_ingreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('categorias_egreso')
        .select('id, nombre')
        .is('deleted_at', null),
      supabase
        .from('ingresos')
        .select('categoria_id, monto_usd')
        .is('deleted_at', null)
        .gte('fecha_ingreso', rangoDesde)
        .lte('fecha_ingreso', rangoHasta.to),
      supabase
        .from('egresos')
        .select('categoria_id, monto_usd')
        .gte('fecha_pago', rangoDesde)
        .lte('fecha_pago', rangoHasta.to),
    ])

    if (categoriasIngresosRes.error) {
      setMensajeBalance(`❌ ${getErrorText(categoriasIngresosRes.error, 'No se pudieron cargar categorías de ingresos para el balance.')}`)
      setResumenBalance(createEmptyBalanceEscolar(periodoBalanceYm))
      setCargandoBalance(false)
      return
    }

    if (categoriasEgresosRes.error) {
      setMensajeBalance(`❌ ${getErrorText(categoriasEgresosRes.error, 'No se pudieron cargar categorías de egresos para el balance.')}`)
      setResumenBalance(createEmptyBalanceEscolar(periodoBalanceYm))
      setCargandoBalance(false)
      return
    }

    if (ingresosRes.error) {
      setMensajeBalance(`❌ ${getErrorText(ingresosRes.error, 'No se pudieron cargar ingresos para el balance.')}`)
      setResumenBalance(createEmptyBalanceEscolar(periodoBalanceYm))
      setCargandoBalance(false)
      return
    }

    if (egresosRes.error) {
      setMensajeBalance(`❌ ${getErrorText(egresosRes.error, 'No se pudieron cargar egresos para el balance.')}`)
      setResumenBalance(createEmptyBalanceEscolar(periodoBalanceYm))
      setCargandoBalance(false)
      return
    }

    const categoriasIngresosById = new Map(
      (((categoriasIngresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const categoriasEgresosById = new Map(
      (((categoriasEgresosRes.data as CategoriaRow[] | null) ?? []).map((item) => [item.id, item.nombre || '']) as Array<[string, string]>)
    )

    const ingresosRows = (ingresosRes.data as Array<{ categoria_id: string | null; monto_usd: number | null }> | null) ?? []
    const egresosRows = (egresosRes.data as Array<{ categoria_id: string | null; monto_usd: number | null }> | null) ?? []
    const ingresosRowsAnaliticos = excludeTransferenciaInternaRows(ingresosRows, categoriasIngresosById)
    const egresosRowsAnaliticos = excludeTransferenciaInternaRows(egresosRows, categoriasEgresosById)

    const ingresosRubrosBase = buildResumenRubros(ingresosRowsAnaliticos, categoriasIngresosById, INGRESO_RUBROS_DISTRIBUCION, 1)
    const egresosRubrosBase = buildResumenRubros(
      egresosRowsAnaliticos,
      categoriasEgresosById,
      EGRESO_RUBROS_DISTRIBUCION,
      -1,
      'TOTAL GASTOS ADMINISTRATIVOS'
    )

    const ingresos = buildBalanceRubros(ingresosRubrosBase, 'ingreso')
    const egresos = buildBalanceRubros(egresosRubrosBase, 'egreso')

    const ajustesPendientes = BALANCE_AJUSTES_PENDIENTES.map((label) => ({
      label,
      entrada: 0,
      salida: 0,
      saldo: 0,
      pendiente: true,
    }))

    const totalEntradas = roundMoney(ingresos.reduce((acc, item) => acc + item.entrada, 0))
    const totalSalidas = roundMoney(egresos.reduce((acc, item) => acc + item.salida, 0))
    const totalAjustes = roundMoney(ajustesPendientes.reduce((acc, item) => acc + item.saldo, 0))
    const resultadoEjercicio = roundMoney(totalEntradas - totalSalidas)
    const resultadoAjustado = roundMoney(resultadoEjercicio + totalAjustes)

    setResumenBalance({
      anioEscolar,
      rangoLabel: getRangoEscolarLabel(periodoBalanceYm),
      periodoHastaYm: periodoBalanceYm,
      ingresos,
      egresos,
      ajustesPendientes,
      totalEntradas,
      totalSalidas,
      totalAjustes,
      resultadoEjercicio,
      resultadoAjustado,
    })

    setMensajeBalance('')
    setCargandoBalance(false)
  }, [periodoBalanceYm])

  useEffect(() => {
    let activo = true
    const timerId = window.setTimeout(() => {
      if (!activo) return
      void cargarCuentas()
    }, 0)

    return () => {
      activo = false
      window.clearTimeout(timerId)
    }
  }, [cargarCuentas])

  useEffect(() => {
    if (moduloActivo !== 'registro') return
    if (!cuentaId || !cuentaSeleccionada) return

    let activo = true
    const timerId = window.setTimeout(() => {
      if (!activo) return
      void cargarRegistroCuenta()
    }, 0)

    return () => {
      activo = false
      window.clearTimeout(timerId)
    }
  }, [cuentaId, cuentaSeleccionada, periodoRegistroYm, cargarRegistroCuenta, moduloActivo])

  useEffect(() => {
    if (moduloActivo !== 'resumen') return
    if (!cuentaId || !cuentaSeleccionada || !PERIODO_YM_REGEX.test(periodoResumenYm)) return

    let activo = true
    const timerId = window.setTimeout(() => {
      if (!activo) return
      void cargarResumenMensualCuenta()
    }, 0)

    return () => {
      activo = false
      window.clearTimeout(timerId)
    }
  }, [cuentaId, cuentaSeleccionada, periodoResumenYm, cargarResumenMensualCuenta, moduloActivo])

  useEffect(() => {
    if (moduloActivo !== 'distribucion') return
    if (!PERIODO_YM_REGEX.test(periodoDistribucionYm)) return

    let activo = true
    const timerId = window.setTimeout(() => {
      if (!activo) return
      void cargarDistribucionEscolar()
    }, 0)

    return () => {
      activo = false
      window.clearTimeout(timerId)
    }
  }, [periodoDistribucionYm, cargarDistribucionEscolar, moduloActivo])

  useEffect(() => {
    if (moduloActivo !== 'balance') return
    if (!PERIODO_YM_REGEX.test(periodoBalanceYm)) return

    let activo = true
    const timerId = window.setTimeout(() => {
      if (!activo) return
      void cargarBalanceEscolar()
    }, 0)

    return () => {
      activo = false
      window.clearTimeout(timerId)
    }
  }, [periodoBalanceYm, cargarBalanceEscolar, moduloActivo])

  const resumen = useMemo(() => {
    const saldoInicial = saldoAperturaRegistro
    const totalEntradas = roundMoney(
      movimientos.filter((row) => row.monto > 0).reduce((acc, row) => acc + row.monto, 0)
    )
    const totalSalidas = roundMoney(
      movimientos.filter((row) => row.monto < 0).reduce((acc, row) => acc + Math.abs(row.monto), 0)
    )
    const saldoActual = movimientos.length > 0
      ? movimientos[movimientos.length - 1].saldo
      : saldoInicial

    return {
      saldoInicial,
      totalEntradas,
      totalSalidas,
      saldoActual,
    }
  }, [movimientos, saldoAperturaRegistro])

  const itemsVista = useMemo<ItemVista[]>(() => {
    const items: ItemVista[] = []
    let mesActual = ''

    for (const row of movimientos) {
      const keyMes = row.fecha.slice(0, 7)
      if (keyMes !== mesActual) {
        mesActual = keyMes
        items.push({ type: 'mes', key: `mes-${keyMes}`, label: formatMes(row.fecha) })
      }

      items.push({ type: 'mov', key: row.id, row })
    }

    return items
  }, [movimientos])

  const maxParticipacionIngresos = useMemo(() => {
    return resumenDistribucion.ingresos.reduce((maximo, item) => {
      return item.porcentaje > maximo ? item.porcentaje : maximo
    }, 0)
  }, [resumenDistribucion.ingresos])

  const maxParticipacionEgresos = useMemo(() => {
    return resumenDistribucion.egresos.reduce((maximo, item) => {
      return item.porcentaje > maximo ? item.porcentaje : maximo
    }, 0)
  }, [resumenDistribucion.egresos])

  const maxValorTendencia = useMemo(() => {
    return resumenDistribucion.tendencia.reduce((maximo, item) => {
      const localMax = Math.max(item.ingresos, item.egresos, Math.abs(item.neto))
      return localMax > maximo ? localMax : maximo
    }, 0)
  }, [resumenDistribucion.tendencia])

  const filasRubrosDistribucion = useMemo(() => {
    return Math.max(resumenDistribucion.ingresos.length, resumenDistribucion.egresos.length)
  }, [resumenDistribucion.ingresos.length, resumenDistribucion.egresos.length])

  const pieIngresos = useMemo(() => {
    return buildPieSegments(resumenDistribucion.ingresos, PIE_COLORS_INGRESOS)
  }, [resumenDistribucion.ingresos])

  const pieEgresos = useMemo(() => {
    return buildPieSegments(resumenDistribucion.egresos, PIE_COLORS_EGRESOS, true)
  }, [resumenDistribucion.egresos])

  const maxLineaDistribucion = useMemo(() => {
    const maximo = resumenDistribucion.tendencia.reduce((maxActual, item) => {
      return Math.max(maxActual, item.ingresos, item.egresos)
    }, 0)

    return maximo > 0 ? maximo : 1
  }, [resumenDistribucion.tendencia])

  const puntosLineaIngresos = useMemo(() => {
    return buildLineCoordinates(
      resumenDistribucion.tendencia.map((item) => item.ingresos),
      maxLineaDistribucion
    )
  }, [resumenDistribucion.tendencia, maxLineaDistribucion])

  const puntosLineaEgresos = useMemo(() => {
    return buildLineCoordinates(
      resumenDistribucion.tendencia.map((item) => item.egresos),
      maxLineaDistribucion
    )
  }, [resumenDistribucion.tendencia, maxLineaDistribucion])

  const guiasLineaDistribucion = useMemo(() => {
    const { height, paddingTop, paddingBottom } = CHART_LAYOUT
    const plotHeight = height - paddingTop - paddingBottom

    return [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
      y: paddingTop + ((1 - ratio) * plotHeight),
      value: roundMoney(maxLineaDistribucion * ratio),
    }))
  }, [maxLineaDistribucion])

  const barrasNetoDistribucion = useMemo(() => {
    return buildNetoBarRects(resumenDistribucion.tendencia)
  }, [resumenDistribucion.tendencia])

  const maxAbsNetoDistribucion = useMemo(() => {
    const maximo = resumenDistribucion.tendencia.reduce((maxActual, item) => {
      return Math.max(maxActual, Math.abs(item.neto))
    }, 0)

    return maximo > 0 ? maximo : 1
  }, [resumenDistribucion.tendencia])

  const baselineNetoY = CHART_LAYOUT.paddingTop
    + ((CHART_LAYOUT.height - CHART_LAYOUT.paddingTop - CHART_LAYOUT.paddingBottom) / 2)

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <section className="relative mx-auto w-full max-w-[1650px] rounded-[2.8rem] border border-gray-200/80 bg-white/95 p-8 shadow-2xl backdrop-blur md:p-12">
        <button
          onClick={() => router.push('/gestion/socios')}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:text-black"
        >
          <ArrowLeft size={14} /> Volver a socios
        </button>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <Landmark size={36} strokeWidth={1.5} className="mb-6 text-black" />
          <h1 className="text-4xl font-bold tracking-tight text-black md:text-5xl">Registro Contable Fundacion Academia Nacional de Ajedrez</h1>
          <p className="mt-4 max-w-4xl text-base text-gray-600 md:text-lg">
            Libro por cuenta con movimientos y saldo acumulado, siguiendo el formato operativo de caja/banco.
          </p>

          <div className="mt-6 grid w-full max-w-5xl grid-cols-1 gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setModuloActivo('registro')}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${moduloActivo === 'registro' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-black'}`}
            >
              Módulo 1 · Registro diario
            </button>
            <button
              type="button"
              onClick={() => setModuloActivo('resumen')}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${moduloActivo === 'resumen' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-black'}`}
            >
              Módulo 2 · Cuentas Mensuales
            </button>
            <button
              type="button"
              onClick={() => setModuloActivo('distribucion')}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${moduloActivo === 'distribucion' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-black'}`}
            >
              Módulo 3 · Distribución anual
            </button>
            <button
              type="button"
              onClick={() => setModuloActivo('balance')}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${moduloActivo === 'balance' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-black'}`}
            >
              Módulo 4 · Balance anual
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              {(moduloActivo === 'registro' || moduloActivo === 'resumen') && (
                <label className="min-w-[280px] flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Cuenta</p>
                  <select
                    value={cuentaId}
                    onChange={(event) => setCuentaId(event.target.value)}
                    disabled={cargandoCuentas}
                    className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400 disabled:opacity-60"
                  >
                    {cargandoCuentas && <option value="">Cargando cuentas...</option>}
                    {!cargandoCuentas && cuentas.length === 0 && <option value="">Sin cuentas disponibles</option>}
                    {!cargandoCuentas && cuentas.map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.nombre || 'Cuenta sin nombre'}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {moduloActivo === 'registro' && (
                <>
                  <label className="min-w-[160px]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Mes</p>
                    <select
                      value={String(mesRegistroSeleccionado)}
                      onChange={(event) => {
                        const month = Number(event.target.value)
                        if (!Number.isFinite(month)) return
                        setPeriodoRegistroYm(buildPeriodoFromAnioEscolar(anioEscolarRegistro, month))
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                    >
                      {MESES_ANIO_ESCOLAR.map((mes) => (
                        <option key={mes.month} value={mes.month}>
                          {mes.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="min-w-[170px]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Año escolar</p>
                    <select
                      value={anioEscolarRegistro}
                      onChange={(event) => {
                        setPeriodoRegistroYm(buildPeriodoFromAnioEscolar(event.target.value, mesRegistroSeleccionado))
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                    >
                      {opcionesAnioEscolarRegistro.map((anio) => (
                        <option key={anio.value} value={anio.value}>
                          {anio.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {moduloActivo === 'registro' && (
                <button
                  type="button"
                  onClick={() => void cargarRegistroCuenta()}
                  disabled={!cuentaId || !PERIODO_YM_REGEX.test(periodoRegistroYm) || cargandoRegistro}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-black bg-black px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-white disabled:text-gray-400"
                >
                  {cargandoRegistro ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Actualizar
                </button>
              )}
            </div>

            {moduloActivo === 'registro' && (
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                Vista activa: {formatPeriodoYm(periodoRegistroYm)} · Año escolar {anioEscolarRegistro.replace('-', ' - ')}
              </p>
            )}
          </div>

          {moduloActivo === 'registro' && (
            <>
              {mensaje && (
                <p className={`mt-4 rounded-2xl px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                  {mensaje}
                </p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Saldo inicial</p>
                  <p className="mt-2 text-lg font-bold text-black">${formatUSD(resumen.saldoInicial)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Entradas</p>
                  <p className="mt-2 text-lg font-bold text-green-700">${formatUSD(resumen.totalEntradas)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Salidas</p>
                  <p className="mt-2 text-lg font-bold text-red-700">${formatUSD(resumen.totalSalidas)}</p>
                </div>
                <div className="rounded-2xl border border-black bg-black p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">Saldo actual</p>
                  <p className="mt-2 text-lg font-bold text-white">${formatUSD(resumen.saldoActual)}</p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100/95">
                      <tr>
                        <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Fecha</th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Concepto</th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Monto</th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Saldo</th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Rubro</th>
                      </tr>
                    </thead>

                    <tbody>
                      {itemsVista.length === 0 && !cargandoRegistro && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-500">
                            Sin registros para {formatPeriodoYm(periodoRegistroYm)} en esta cuenta.
                          </td>
                        </tr>
                      )}

                      {itemsVista.map((item) => {
                        if (item.type === 'mes') {
                          return (
                            <tr key={item.key} className="bg-green-600">
                              <td colSpan={5} className="px-3 py-2 text-center text-lg font-bold capitalize text-white">
                                {item.label}
                              </td>
                            </tr>
                          )
                        }

                        const row = item.row

                        return (
                          <tr key={item.key} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100/80">
                            <td className="border-b border-gray-200 px-3 py-2 text-sm text-gray-700">{formatFechaCorta(row.fecha)}</td>
                            <td className="border-b border-gray-200 px-3 py-2 text-sm text-gray-900">{row.concepto}</td>
                            <td className={`border-b border-gray-200 px-3 py-2 text-right text-sm font-bold ${row.monto < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                              {formatMontoConSigno(row.monto)}
                            </td>
                            <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-gray-900">
                              ${formatUSD(row.saldo)}
                            </td>
                            <td className="border-b border-gray-200 px-3 py-2 text-sm text-gray-700">{row.rubro}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {moduloActivo === 'resumen' && (
            <div className="mt-8 rounded-[2rem] border border-gray-200 bg-gray-50 p-6 md:p-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Módulo 2 · Cálculo mensual por cuenta</p>
                <p className="mt-1 text-sm text-gray-600">Resumen mensual por rubros para la cuenta seleccionada.</p>
              </div>

              <label className="min-w-[160px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Mes</p>
                <select
                  value={String(mesResumenSeleccionado)}
                  onChange={(event) => {
                    const month = Number(event.target.value)
                    if (!Number.isFinite(month)) return
                    setPeriodoResumenYm(buildPeriodoFromAnioEscolar(anioEscolarResumen, month))
                  }}
                  className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                >
                  {MESES_ANIO_ESCOLAR.map((mes) => (
                    <option key={mes.month} value={mes.month}>
                      {mes.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-[170px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Año escolar</p>
                <select
                  value={anioEscolarResumen}
                  onChange={(event) => {
                    setPeriodoResumenYm(buildPeriodoFromAnioEscolar(event.target.value, mesResumenSeleccionado))
                  }}
                  className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                >
                  {opcionesAnioEscolarResumen.map((anio) => (
                    <option key={anio.value} value={anio.value}>
                      {anio.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => void cargarResumenMensualCuenta()}
                disabled={!cuentaId || !PERIODO_YM_REGEX.test(periodoResumenYm) || cargandoResumenMes}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-black bg-black px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-white disabled:text-gray-400"
              >
                {cargandoResumenMes ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                Calcular
              </button>
            </div>

            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              Vista activa: {formatPeriodoYm(periodoResumenYm)} · Año escolar {anioEscolarResumen.replace('-', ' - ')}
            </p>

            {mensajeResumenMes && (
              <p className={`mt-4 rounded-2xl px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${mensajeResumenMes.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                {mensajeResumenMes}
              </p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Período</p>
                <p className="mt-2 text-lg font-bold capitalize text-black">{formatPeriodoYm(resumenMesCuenta.periodoYm)}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Cuenta</p>
                <p className="mt-2 text-lg font-bold uppercase text-black">{resumenMesCuenta.cuentaNombre}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Ingresos totales</p>
                <p className="mt-2 text-lg font-bold text-green-700">{formatMontoConSigno(resumenMesCuenta.ingresosGlobal)}</p>
              </div>
              <div className="rounded-2xl border border-black bg-black p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">Egresos totales</p>
                <p className="mt-2 text-lg font-bold text-white">{formatMontoConSigno(resumenMesCuenta.egresosGlobal)}</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h3 className="text-center text-2xl font-bold uppercase tracking-tight text-black">{resumenMesCuenta.cuentaNombre}</h3>
              </div>

              <div className="grid gap-6 p-4 md:p-5 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <p className="border-b border-gray-200 bg-gray-100/95 px-4 py-2 text-center text-xl font-bold uppercase tracking-tight text-black">Ingresos</p>
                  <div className="divide-y divide-gray-200">
                    {resumenMesCuenta.ingresos.map((item, index) => (
                      <div key={`ing-${item.label}`} className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100/80`}>
                        <p className="text-base font-bold uppercase text-black">{item.label}</p>
                        <p className="text-base font-bold text-black">{formatMontoConSigno(item.monto)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-gray-200 bg-gray-100/95 px-4 py-3">
                    <p className="text-lg font-bold uppercase text-black">Ingresos total</p>
                    <p className="text-lg font-bold text-black">{formatMontoConSigno(resumenMesCuenta.totalIngresos)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <p className="border-b border-gray-200 bg-gray-100/95 px-4 py-2 text-center text-xl font-bold uppercase tracking-tight text-black">Egresos</p>
                  <div className="divide-y divide-gray-200">
                    {resumenMesCuenta.egresos.map((item, index) => (
                      <div key={`egr-${item.label}`} className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100/80`}>
                        <p className="text-base font-bold uppercase text-black">{item.label}</p>
                        <p className="text-base font-bold text-black">{formatMontoConSigno(item.monto)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-gray-200 bg-gray-100/95 px-4 py-3">
                    <p className="text-lg font-bold uppercase text-black">Egresos total</p>
                    <p className="text-lg font-bold text-black">{formatMontoConSigno(resumenMesCuenta.totalEgresos)}</p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}

          {moduloActivo === 'distribucion' && (
            <div className="mt-8 rounded-[2rem] border border-gray-200 bg-gray-50 p-6 md:p-8">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Módulo 3 · Distribución de ingresos y egresos</p>
                  <p className="mt-1 text-sm text-gray-600">Acumulado del año escolar completo (septiembre a agosto), con métricas de control y tendencia mensual.</p>
                </div>

                <label className="min-w-[160px]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Mes</p>
                  <select
                    value={String(mesDistribucionSeleccionado)}
                    onChange={(event) => {
                      const month = Number(event.target.value)
                      if (!Number.isFinite(month)) return
                      setPeriodoDistribucionYm(buildPeriodoFromAnioEscolar(anioEscolarDistribucion, month))
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                  >
                    {MESES_ANIO_ESCOLAR.map((mes) => (
                      <option key={mes.month} value={mes.month}>
                        {mes.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-[170px]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Año escolar</p>
                  <select
                    value={anioEscolarDistribucion}
                    onChange={(event) => {
                      setPeriodoDistribucionYm(buildPeriodoFromAnioEscolar(event.target.value, mesDistribucionSeleccionado))
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                  >
                    {opcionesAnioEscolarDistribucion.map((anio) => (
                      <option key={anio.value} value={anio.value}>
                        {anio.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void cargarDistribucionEscolar()}
                  disabled={!PERIODO_YM_REGEX.test(periodoDistribucionYm) || cargandoDistribucion}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-black bg-black px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-white disabled:text-gray-400"
                >
                  {cargandoDistribucion ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Calcular
                </button>
              </div>

              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                Vista activa: {formatPeriodoYm(periodoDistribucionYm)} · Año escolar {anioEscolarDistribucion.replace('-', ' - ')}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Rango acumulado: {resumenDistribucion.rangoLabel}
              </p>

              {mensajeDistribucion && (
                <p className={`mt-4 rounded-2xl px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${mensajeDistribucion.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                  {mensajeDistribucion}
                </p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Total ingresos</p>
                  <p className="mt-2 text-lg font-bold text-green-700">${formatUSD(resumenDistribucion.totalIngresos)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Total egresos</p>
                  <p className="mt-2 text-lg font-bold text-red-700">{`-$${formatUSD(resumenDistribucion.totalEgresosAbs)}`}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Resultado neto</p>
                  <p className={`mt-2 text-lg font-bold ${resumenDistribucion.resultadoNeto < 0 ? 'text-red-700' : 'text-black'}`}>
                    {formatMontoConSigno(resumenDistribucion.resultadoNeto)}
                  </p>
                </div>
                <div className="rounded-2xl border border-black bg-black p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">Margen neto</p>
                  <p className="mt-2 text-lg font-bold text-white">{formatPorcentaje(resumenDistribucion.margenNeto)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Ratio gasto / ingreso</p>
                  <p className="mt-2 text-lg font-bold text-black">{formatPorcentaje(resumenDistribucion.ratioEgresoIngreso)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Promedio mensual ingresos</p>
                  <p className="mt-2 text-lg font-bold text-green-700">${formatUSD(resumenDistribucion.promedioIngresos)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Promedio mensual egresos</p>
                  <p className="mt-2 text-lg font-bold text-red-700">{`-$${formatUSD(resumenDistribucion.promedioEgresos)}`}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Cierre del corte</p>
                  <p className="mt-2 text-lg font-bold capitalize text-black">{formatPeriodoYm(resumenDistribucion.periodoHastaYm)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <p className="border-b border-gray-200 bg-gray-100/95 px-4 py-2 text-center text-xl font-bold uppercase tracking-tight text-black">Ingresos</p>
                  <div className="divide-y divide-gray-200">
                    {Array.from({ length: filasRubrosDistribucion }).map((_, index) => {
                      const item = resumenDistribucion.ingresos[index]

                      if (!item) {
                        return (
                          <div key={`dist-ing-empty-${index}`} className={`px-4 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                              <p className="text-sm font-bold uppercase text-transparent select-none">SIN DATA</p>
                              <p className="text-sm font-bold text-transparent select-none">$0.00</p>
                              <p className="text-xs font-bold uppercase text-transparent select-none">0,00%</p>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-gray-100" />
                          </div>
                        )
                      }

                      return (
                        <div key={`dist-ing-${item.label}`} className={`px-4 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100/80`}>
                          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                            <p className="text-sm font-bold uppercase text-black">{item.label}</p>
                            <p className="text-sm font-bold text-black">{formatMontoConSigno(item.monto)}</p>
                            <p className="text-xs font-bold uppercase text-gray-500">{formatPorcentaje(item.porcentaje)}</p>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-green-600"
                              style={{
                                width: `${maxParticipacionIngresos > 0 ? (item.porcentaje / maxParticipacionIngresos) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-gray-200 bg-gray-100/95 px-4 py-3">
                    <p className="text-lg font-bold uppercase text-black">Ingresos total</p>
                    <p className="text-lg font-bold text-black">${formatUSD(resumenDistribucion.totalIngresos)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <p className="border-b border-gray-200 bg-gray-100/95 px-4 py-2 text-center text-xl font-bold uppercase tracking-tight text-black">Egresos</p>
                  <div className="divide-y divide-gray-200">
                    {Array.from({ length: filasRubrosDistribucion }).map((_, index) => {
                      const item = resumenDistribucion.egresos[index]

                      if (!item) {
                        return (
                          <div key={`dist-egr-empty-${index}`} className={`px-4 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                              <p className="text-sm font-bold uppercase text-transparent select-none">SIN DATA</p>
                              <p className="text-sm font-bold text-transparent select-none">$0.00</p>
                              <p className="text-xs font-bold uppercase text-transparent select-none">0,00%</p>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-gray-100" />
                          </div>
                        )
                      }

                      return (
                        <div key={`dist-egr-${item.label}`} className={`px-4 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100/80`}>
                          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                            <p className="text-sm font-bold uppercase text-black">{item.label}</p>
                            <p className="text-sm font-bold text-black">{formatMontoConSigno(item.monto)}</p>
                            <p className="text-xs font-bold uppercase text-gray-500">{formatPorcentaje(item.porcentaje)}</p>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-red-600"
                              style={{
                                width: `${maxParticipacionEgresos > 0 ? (item.porcentaje / maxParticipacionEgresos) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-gray-200 bg-gray-100/95 px-4 py-3">
                    <p className="text-lg font-bold uppercase text-black">Egresos total</p>
                    <p className="text-lg font-bold text-black">{`-$${formatUSD(resumenDistribucion.totalEgresosAbs)}`}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <h3 className="text-center text-xl font-bold uppercase tracking-tight text-black">Tendencia mensual escolar</h3>
                </div>

                <div className="space-y-3 p-4 md:p-5">
                  {resumenDistribucion.tendencia.map((item) => (
                    <div key={`trend-${item.periodoYm}`} className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600">{item.label}</p>
                        <p className={`text-xs font-bold uppercase ${item.neto < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                          Neto: {formatMontoConSigno(item.neto)}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Ingresos</span>
                          <div className="h-2 flex-1 rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-green-600"
                              style={{ width: `${maxValorTendencia > 0 ? (item.ingresos / maxValorTendencia) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-24 text-right text-xs font-bold text-black">${formatUSD(item.ingresos)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-16 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Egresos</span>
                          <div className="h-2 flex-1 rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-red-600"
                              style={{ width: `${maxValorTendencia > 0 ? (item.egresos / maxValorTendencia) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-24 text-right text-xs font-bold text-black">{`-$${formatUSD(item.egresos)}`}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <h3 className="text-center text-xl font-bold uppercase tracking-tight text-black">Gráficas de distribución y evolución</h3>
                </div>

                <div className="grid gap-6 p-4 md:p-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-center text-sm font-bold uppercase tracking-[0.1em] text-gray-600">Torta de ingresos por rubro</p>

                    <div className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:items-start">
                      <svg viewBox="0 0 220 220" className="h-56 w-56 shrink-0">
                        {pieIngresos.length === 0 && (
                          <circle cx="110" cy="110" r="90" className="text-gray-200" fill="currentColor" />
                        )}

                        {pieIngresos.map((segment) => {
                          const angle = segment.endAngle - segment.startAngle
                          const midAngle = segment.startAngle + (angle / 2)
                          const labelPoint = polarToCartesian(110, 110, 72, midAngle)
                          const tooltipText = getPieTooltipText(segment.label, segment.monto, segment.porcentaje)
                          const showInternalLabel = segment.porcentaje >= PIE_LABEL_MIN_PERCENT

                          if (angle >= 359.999) {
                            return (
                              <g key={`pie-ing-full-${segment.label}`}>
                                <circle
                                  cx="110"
                                  cy="110"
                                  r="90"
                                  className={segment.colorClass}
                                  fill="currentColor"
                                >
                                  <title>{tooltipText}</title>
                                </circle>
                                {showInternalLabel && (
                                  <text
                                    x={labelPoint.x}
                                    y={labelPoint.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="fill-white text-[8px] font-bold"
                                    style={{ paintOrder: 'stroke', stroke: '#111827', strokeWidth: 0.7 }}
                                  >
                                    <tspan x={labelPoint.x} dy="-0.45em">{formatMontoConSignoCompact(segment.monto)}</tspan>
                                    <tspan x={labelPoint.x} dy="1.15em">{formatPorcentaje(segment.porcentaje)}</tspan>
                                  </text>
                                )}
                              </g>
                            )
                          }

                          return (
                            <g key={`pie-ing-${segment.label}`}>
                              <path
                                d={describePieSlicePath(110, 110, 90, segment.startAngle, segment.endAngle)}
                                className={segment.colorClass}
                                fill="currentColor"
                              >
                                <title>{tooltipText}</title>
                              </path>
                              {showInternalLabel && (
                                <text
                                  x={labelPoint.x}
                                  y={labelPoint.y}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-white text-[8px] font-bold"
                                  style={{ paintOrder: 'stroke', stroke: '#111827', strokeWidth: 0.7 }}
                                >
                                  <tspan x={labelPoint.x} dy="-0.45em">{formatMontoConSignoCompact(segment.monto)}</tspan>
                                  <tspan x={labelPoint.x} dy="1.15em">{formatPorcentaje(segment.porcentaje)}</tspan>
                                </text>
                              )}
                            </g>
                          )
                        })}

                        <circle cx="110" cy="110" r="52" className="text-white" fill="currentColor" />
                        <text x="110" y="105" textAnchor="middle" className="fill-gray-500 text-[10px] font-bold uppercase tracking-[0.08em]">Total</text>
                        <text x="110" y="126" textAnchor="middle" className="fill-black text-sm font-bold">{`$${formatUSD(resumenDistribucion.totalIngresos)}`}</text>
                      </svg>

                      <div className="w-full space-y-2">
                        {pieIngresos.length === 0 && (
                          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
                            Sin datos de ingresos para este corte.
                          </p>
                        )}

                        {pieIngresos.map((segment) => (
                          <div key={`legend-ing-${segment.label}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-current ${segment.colorClass}`} />
                              <p className="truncate text-[11px] font-bold uppercase text-black">{segment.label}</p>
                            </div>
                            <p className="text-[11px] font-bold text-gray-600">{formatPorcentaje(segment.porcentaje)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-center text-sm font-bold uppercase tracking-[0.1em] text-gray-600">Torta de egresos por rubro</p>

                    <div className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:items-start">
                      <svg viewBox="0 0 220 220" className="h-56 w-56 shrink-0">
                        {pieEgresos.length === 0 && (
                          <circle cx="110" cy="110" r="90" className="text-gray-200" fill="currentColor" />
                        )}

                        {pieEgresos.map((segment) => {
                          const angle = segment.endAngle - segment.startAngle
                          const midAngle = segment.startAngle + (angle / 2)
                          const labelPoint = polarToCartesian(110, 110, 72, midAngle)
                          const tooltipText = getPieTooltipText(segment.label, segment.monto, segment.porcentaje)
                          const showInternalLabel = segment.porcentaje >= PIE_LABEL_MIN_PERCENT

                          if (angle >= 359.999) {
                            return (
                              <g key={`pie-egr-full-${segment.label}`}>
                                <circle
                                  cx="110"
                                  cy="110"
                                  r="90"
                                  className={segment.colorClass}
                                  fill="currentColor"
                                >
                                  <title>{tooltipText}</title>
                                </circle>
                                {showInternalLabel && (
                                  <text
                                    x={labelPoint.x}
                                    y={labelPoint.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="fill-white text-[8px] font-bold"
                                    style={{ paintOrder: 'stroke', stroke: '#111827', strokeWidth: 0.7 }}
                                  >
                                    <tspan x={labelPoint.x} dy="-0.45em">{formatMontoConSignoCompact(segment.monto)}</tspan>
                                    <tspan x={labelPoint.x} dy="1.15em">{formatPorcentaje(segment.porcentaje)}</tspan>
                                  </text>
                                )}
                              </g>
                            )
                          }

                          return (
                            <g key={`pie-egr-${segment.label}`}>
                              <path
                                d={describePieSlicePath(110, 110, 90, segment.startAngle, segment.endAngle)}
                                className={segment.colorClass}
                                fill="currentColor"
                              >
                                <title>{tooltipText}</title>
                              </path>
                              {showInternalLabel && (
                                <text
                                  x={labelPoint.x}
                                  y={labelPoint.y}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  className="fill-white text-[8px] font-bold"
                                  style={{ paintOrder: 'stroke', stroke: '#111827', strokeWidth: 0.7 }}
                                >
                                  <tspan x={labelPoint.x} dy="-0.45em">{formatMontoConSignoCompact(segment.monto)}</tspan>
                                  <tspan x={labelPoint.x} dy="1.15em">{formatPorcentaje(segment.porcentaje)}</tspan>
                                </text>
                              )}
                            </g>
                          )
                        })}

                        <circle cx="110" cy="110" r="52" className="text-white" fill="currentColor" />
                        <text x="110" y="105" textAnchor="middle" className="fill-gray-500 text-[10px] font-bold uppercase tracking-[0.08em]">Total</text>
                        <text x="110" y="126" textAnchor="middle" className="fill-black text-sm font-bold">{`-$${formatUSD(resumenDistribucion.totalEgresosAbs)}`}</text>
                      </svg>

                      <div className="w-full space-y-2">
                        {pieEgresos.length === 0 && (
                          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
                            Sin datos de egresos para este corte.
                          </p>
                        )}

                        {pieEgresos.map((segment) => (
                          <div key={`legend-egr-${segment.label}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-current ${segment.colorClass}`} />
                              <p className="truncate text-[11px] font-bold uppercase text-black">{segment.label}</p>
                            </div>
                            <p className="text-[11px] font-bold text-gray-600">{formatPorcentaje(segment.porcentaje)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-5 md:px-5">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-center text-sm font-bold uppercase tracking-[0.1em] text-gray-600">Línea · evolución de ingresos vs egresos</p>

                    {resumenDistribucion.tendencia.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-4 text-center text-xs text-gray-500">
                        Sin datos de tendencia para construir la línea.
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <svg viewBox={`0 0 ${CHART_LAYOUT.width} ${CHART_LAYOUT.height}`} className="min-w-[720px]">
                          {guiasLineaDistribucion.map((guide) => (
                            <g key={`line-guide-${guide.y}`}>
                              <line
                                x1={CHART_LAYOUT.paddingX}
                                y1={guide.y}
                                x2={CHART_LAYOUT.width - CHART_LAYOUT.paddingX}
                                y2={guide.y}
                                className="text-gray-200"
                                stroke="currentColor"
                                strokeWidth="1"
                              />
                              <text x="2" y={guide.y + 4} className="fill-gray-400 text-[10px] font-bold">
                                {`$${formatUSD(guide.value)}`}
                              </text>
                            </g>
                          ))}

                          <polyline
                            points={toPolylinePoints(puntosLineaIngresos)}
                            fill="none"
                            className="text-green-600"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          <polyline
                            points={toPolylinePoints(puntosLineaEgresos)}
                            fill="none"
                            className="text-red-600"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {puntosLineaIngresos.map((point, index) => (
                            <circle key={`line-ing-dot-${index}`} cx={point.x} cy={point.y} r="3.5" className="text-green-600" fill="currentColor" />
                          ))}

                          {puntosLineaEgresos.map((point, index) => (
                            <circle key={`line-egr-dot-${index}`} cx={point.x} cy={point.y} r="3.5" className="text-red-600" fill="currentColor" />
                          ))}

                          {puntosLineaIngresos.map((point, index) => (
                            <text
                              key={`line-label-${index}`}
                              x={point.x}
                              y={CHART_LAYOUT.height - 9}
                              textAnchor="middle"
                              className="fill-gray-500 text-[10px] font-bold uppercase"
                            >
                              {resumenDistribucion.tendencia[index]?.label || ''}
                            </text>
                          ))}
                        </svg>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                        Ingresos
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                        Egresos
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-center text-sm font-bold uppercase tracking-[0.1em] text-gray-600">Barras · resultado neto mensual</p>

                    {resumenDistribucion.tendencia.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-4 text-center text-xs text-gray-500">
                        Sin datos para construir barras de neto.
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <svg viewBox={`0 0 ${CHART_LAYOUT.width} ${CHART_LAYOUT.height}`} className="min-w-[720px]">
                          <line
                            x1={CHART_LAYOUT.paddingX}
                            y1={CHART_LAYOUT.paddingTop}
                            x2={CHART_LAYOUT.width - CHART_LAYOUT.paddingX}
                            y2={CHART_LAYOUT.paddingTop}
                            className="text-gray-200"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <line
                            x1={CHART_LAYOUT.paddingX}
                            y1={baselineNetoY}
                            x2={CHART_LAYOUT.width - CHART_LAYOUT.paddingX}
                            y2={baselineNetoY}
                            className="text-gray-300"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <line
                            x1={CHART_LAYOUT.paddingX}
                            y1={CHART_LAYOUT.height - CHART_LAYOUT.paddingBottom}
                            x2={CHART_LAYOUT.width - CHART_LAYOUT.paddingX}
                            y2={CHART_LAYOUT.height - CHART_LAYOUT.paddingBottom}
                            className="text-gray-200"
                            stroke="currentColor"
                            strokeWidth="1"
                          />

                          <text x="2" y={CHART_LAYOUT.paddingTop + 4} className="fill-gray-400 text-[10px] font-bold">
                            {`+$${formatUSD(maxAbsNetoDistribucion)}`}
                          </text>
                          <text x="2" y={baselineNetoY + 4} className="fill-gray-500 text-[10px] font-bold">$0.00</text>
                          <text x="2" y={(CHART_LAYOUT.height - CHART_LAYOUT.paddingBottom) + 4} className="fill-gray-400 text-[10px] font-bold">
                            {`-$${formatUSD(maxAbsNetoDistribucion)}`}
                          </text>

                          {barrasNetoDistribucion.map((bar, index) => (
                            <g key={`net-bar-${index}`}>
                              <rect
                                x={bar.x}
                                y={bar.y}
                                width={bar.width}
                                height={bar.height}
                                rx="4"
                                className={bar.isPositive ? 'text-green-600' : 'text-red-600'}
                                fill="currentColor"
                              />
                              <text
                                x={bar.x + (bar.width / 2)}
                                y={bar.isPositive ? bar.y - 4 : bar.y + bar.height + 12}
                                textAnchor="middle"
                                className={`text-[10px] font-bold ${bar.isPositive ? 'fill-green-700' : 'fill-red-700'}`}
                              >
                                {formatMontoConSigno(bar.value)}
                              </text>
                              <text
                                x={bar.x + (bar.width / 2)}
                                y={CHART_LAYOUT.height - 9}
                                textAnchor="middle"
                                className="fill-gray-500 text-[10px] font-bold uppercase"
                              >
                                {bar.label}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                        Neto positivo
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                        Neto negativo
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Mejor mes de ingresos</p>
                  <p className="mt-2 text-base font-bold capitalize text-black">{resumenDistribucion.mejorMesIngreso}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Mejor mes de neto</p>
                  <p className="mt-2 text-base font-bold capitalize text-black">{resumenDistribucion.mejorMesNeto}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Rubro ingreso principal</p>
                  <p className="mt-2 text-base font-bold uppercase text-black">{resumenDistribucion.rubroIngresoPrincipal}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Rubro egreso principal</p>
                  <p className="mt-2 text-base font-bold uppercase text-black">{resumenDistribucion.rubroEgresoPrincipal}</p>
                </div>
              </div>
            </div>
          )}

          {moduloActivo === 'balance' && (
            <div className="mt-8 rounded-[2rem] border border-gray-200 bg-gray-50 p-6 md:p-8">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Módulo 4 · Balance de Ingresos y Egresos</p>
                  <p className="mt-1 text-sm text-gray-600">Documento contable acumulado del año escolar, con estructura de entrada, salida y saldo.</p>
                </div>

                <label className="min-w-[160px]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Mes</p>
                  <select
                    value={String(mesBalanceSeleccionado)}
                    onChange={(event) => {
                      const month = Number(event.target.value)
                      if (!Number.isFinite(month)) return
                      setPeriodoBalanceYm(buildPeriodoFromAnioEscolar(anioEscolarBalance, month))
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                  >
                    {MESES_ANIO_ESCOLAR.map((mes) => (
                      <option key={mes.month} value={mes.month}>
                        {mes.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="min-w-[170px]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Año escolar</p>
                  <select
                    value={anioEscolarBalance}
                    onChange={(event) => {
                      setPeriodoBalanceYm(buildPeriodoFromAnioEscolar(event.target.value, mesBalanceSeleccionado))
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-bold text-black shadow-sm transition-all hover:border-gray-400"
                  >
                    {opcionesAnioEscolarBalance.map((anio) => (
                      <option key={anio.value} value={anio.value}>
                        {anio.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void cargarBalanceEscolar()}
                  disabled={!PERIODO_YM_REGEX.test(periodoBalanceYm) || cargandoBalance}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-black bg-black px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-white disabled:text-gray-400"
                >
                  {cargandoBalance ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Generar
                </button>
              </div>

              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                Vista activa: {formatPeriodoYm(periodoBalanceYm)} · Año escolar {anioEscolarBalance.replace('-', ' - ')}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Rango acumulado: {resumenBalance.rangoLabel}
              </p>

              {mensajeBalance && (
                <p className={`mt-4 rounded-2xl px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${mensajeBalance.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                  {mensajeBalance}
                </p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Entradas totales</p>
                  <p className="mt-2 text-lg font-bold text-green-700">{formatMontoConSigno(resumenBalance.totalEntradas)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Salidas totales</p>
                  <p className="mt-2 text-lg font-bold text-red-700">{formatMontoConSigno(-resumenBalance.totalSalidas)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Resultado del ejercicio</p>
                  <p className={`mt-2 text-lg font-bold ${resumenBalance.resultadoEjercicio < 0 ? 'text-red-700' : 'text-black'}`}>
                    {formatMontoConSigno(resumenBalance.resultadoEjercicio)}
                  </p>
                </div>
                <div className="rounded-2xl border border-black bg-black p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-300">Resultado ajustado</p>
                  <p className="mt-2 text-lg font-bold text-white">{formatMontoConSigno(resumenBalance.resultadoAjustado)}</p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Fundación Academia Nacional de Ajedrez</p>
                  <h3 className="mt-1 text-2xl font-bold uppercase tracking-tight text-black">Balance de Ingresos y Egresos</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-gray-500">{resumenBalance.rangoLabel || getRangoEscolarLabel(periodoBalanceYm)}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100/95">
                      <tr>
                        <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Descripción</th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Entrada</th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Salida</th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-gray-600">Saldo</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="bg-green-600">
                        <td colSpan={4} className="px-3 py-2 text-center text-sm font-bold uppercase tracking-[0.12em] text-white">Ingresos operativos</td>
                      </tr>

                      {resumenBalance.ingresos.map((item, index) => (
                        <tr key={`bal-ing-${item.label}`} className={index % 2 === 0 ? 'bg-white hover:bg-gray-100/80' : 'bg-gray-50 hover:bg-gray-100/80'}>
                          <td className="border-b border-gray-200 px-3 py-2 text-sm font-bold uppercase text-black">{item.label}</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-black">{formatMontoColumna(item.entrada)}</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-gray-500">{formatMontoColumna(item.salida)}</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-green-700">{formatMontoConSigno(item.saldo)}</td>
                        </tr>
                      ))}

                      <tr className="bg-green-50">
                        <td className="border-b border-gray-200 px-3 py-2 text-sm font-bold uppercase text-green-800">Ingresos totales</td>
                        <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-green-800">{formatMontoColumna(resumenBalance.totalEntradas)}</td>
                        <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-green-800">—</td>
                        <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-green-800">{formatMontoConSigno(resumenBalance.totalEntradas)}</td>
                      </tr>

                      <tr className="bg-red-600">
                        <td colSpan={4} className="px-3 py-2 text-center text-sm font-bold uppercase tracking-[0.12em] text-white">Egresos operativos</td>
                      </tr>

                      {resumenBalance.egresos.map((item, index) => (
                        <tr key={`bal-egr-${item.label}`} className={index % 2 === 0 ? 'bg-white hover:bg-gray-100/80' : 'bg-gray-50 hover:bg-gray-100/80'}>
                          <td className="border-b border-gray-200 px-3 py-2 text-sm font-bold uppercase text-black">{item.label}</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-gray-500">{formatMontoColumna(item.entrada)}</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-black">{formatMontoColumna(item.salida)}</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-red-700">{formatMontoConSigno(item.saldo)}</td>
                        </tr>
                      ))}

                      <tr className="bg-red-50">
                        <td className="border-b border-gray-200 px-3 py-2 text-sm font-bold uppercase text-red-800">Egresos totales</td>
                        <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-red-800">—</td>
                        <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-red-800">{formatMontoColumna(resumenBalance.totalSalidas)}</td>
                        <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-red-800">{formatMontoConSigno(-resumenBalance.totalSalidas)}</td>
                      </tr>

                      <tr className="bg-gray-600">
                        <td colSpan={4} className="px-3 py-2 text-center text-sm font-bold uppercase tracking-[0.12em] text-white">Ajustes pendientes</td>
                      </tr>

                      {resumenBalance.ajustesPendientes.map((item, index) => (
                        <tr key={`bal-adj-${item.label}`} className={index % 2 === 0 ? 'bg-white hover:bg-gray-100/80' : 'bg-gray-50 hover:bg-gray-100/80'}>
                          <td className="border-b border-gray-200 px-3 py-2 text-sm font-bold uppercase text-gray-700">{item.label}</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-gray-500">—</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-gray-500">—</td>
                          <td className="border-b border-gray-200 px-3 py-2 text-right text-sm font-bold text-gray-600">{formatMontoConSigno(item.saldo)}</td>
                        </tr>
                      ))}

                      <tr className="bg-gray-100">
                        <td className="border-b border-gray-200 px-3 py-3 text-sm font-bold uppercase text-black">Resultado del ejercicio</td>
                        <td className="border-b border-gray-200 px-3 py-3 text-right text-sm font-bold text-black">{formatMontoColumna(resumenBalance.totalEntradas)}</td>
                        <td className="border-b border-gray-200 px-3 py-3 text-right text-sm font-bold text-black">{formatMontoColumna(resumenBalance.totalSalidas)}</td>
                        <td className={`border-b border-gray-200 px-3 py-3 text-right text-sm font-bold ${resumenBalance.resultadoEjercicio < 0 ? 'text-red-700' : 'text-black'}`}>
                          {formatMontoConSigno(resumenBalance.resultadoEjercicio)}
                        </td>
                      </tr>

                      <tr className="bg-black">
                        <td className="px-3 py-3 text-sm font-bold uppercase text-white">Resultado ajustado</td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-white">{formatMontoColumna(resumenBalance.totalEntradas)}</td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-white">{formatMontoColumna(resumenBalance.totalSalidas)}</td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-white">{formatMontoConSigno(resumenBalance.resultadoAjustado)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Nota: los renglones de inventario y resultado cambiario se mantienen en cero hasta integrar su fuente de datos en el sistema.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
