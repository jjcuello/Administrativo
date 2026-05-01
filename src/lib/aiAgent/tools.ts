import { formatUSD } from '@/lib/currency'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import type { AgentDomain } from './types'

type ToolRunResult = {
  status: 'ok' | 'error'
  domain: AgentDomain
  toolName: string
  summary: string
  notes?: string[]
}

type PersonalRow = {
  id?: string
  nombres?: string | null
  apellidos?: string | null
  cedula_numero?: string | null
  tipo_personal?: string | null
  cargo?: string | null
  estado?: string | null
  monto_base_mensual?: number | null
  banco_nombre?: string | null
  banco_numero_cuenta?: string | null
  banco_cedula_titular?: string | null
  pm_telefono?: string | null
  pm_cedula?: string | null
  pm_banco?: string | null
  deleted_at?: string | null
}

type NominaHeaderRow = {
  id?: string
  periodo_ym?: string | null
  estado?: string | null
  total_base?: number | null
  total_descuentos?: number | null
  total_extras?: number | null
  total_neto?: number | null
  updated_at?: string | null
  deleted_at?: string | null
}

type IngresoRow = {
  monto_usd?: number | null
  estado?: string | null
  deleted_at?: string | null
}

type EgresoRow = {
  monto_usd?: number | null
  deleted_at?: string | null
}

const normalizeText = (value?: string | null) => (
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
)

const roundMoney = (value: number) => Math.round(value * 100) / 100

const safeNumber = (value?: number | null) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0
}

const isMissingColumnError = (error: unknown, columnName: string) => {
  const msg = typeof error === 'string'
    ? error.toLowerCase()
    : error instanceof Error
      ? error.message.toLowerCase()
      : String((error as { message?: string } | null | undefined)?.message || error || '').toLowerCase()
  const col = columnName.toLowerCase()
  return msg.includes(col) && (msg.includes('column') || msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('no existe'))
}

const isInTrash = (row: { estado?: string | null; deleted_at?: string | null }) => {
  const estado = normalizeText(row.estado)
  return estado === 'eliminado' || !!(row.deleted_at && String(row.deleted_at).trim())
}

const classifyPersonalGroup = (row: PersonalRow): 'docente' | 'administrativo' => {
  const tipo = normalizeText(row.tipo_personal)
  const cargo = normalizeText(row.cargo)

  if (tipo.includes('admin')) return 'administrativo'
  if (tipo.includes('docent') || tipo.includes('profe') || tipo.includes('maestr')) return 'docente'

  if (cargo.includes('docent') || cargo.includes('profe') || cargo.includes('maestr') || cargo.includes('instructor')) {
    return 'docente'
  }

  return 'administrativo'
}

const MONTH_TOKEN_MAP: Array<{ month: number; tokens: string[] }> = [
  { month: 1, tokens: ['enero'] },
  { month: 2, tokens: ['febrero'] },
  { month: 3, tokens: ['marzo'] },
  { month: 4, tokens: ['abril'] },
  { month: 5, tokens: ['mayo'] },
  { month: 6, tokens: ['junio'] },
  { month: 7, tokens: ['julio'] },
  { month: 8, tokens: ['agosto'] },
  { month: 9, tokens: ['septiembre', 'setiembre', 'septiemrbe'] },
  { month: 10, tokens: ['octubre'] },
  { month: 11, tokens: ['noviembre'] },
  { month: 12, tokens: ['diciembre'] },
]

const getMonthNumberFromText = (text: string) => {
  for (const item of MONTH_TOKEN_MAP) {
    if (item.tokens.some((token) => text.includes(token))) {
      return item.month
    }
  }

  return null
}

const getMonthLabel = (month: number) => {
  const item = MONTH_TOKEN_MAP.find((entry) => entry.month === month)
  if (!item) return `mes ${month}`

  const base = item.tokens[0] || `mes ${month}`
  return base.charAt(0).toUpperCase() + base.slice(1)
}

const getPeriodoYmFromMessage = (message: string) => {
  const normalized = normalizeText(message)
  const explicit = normalized.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/)
  if (explicit) return explicit[0]

  const requestedMonth = getMonthNumberFromText(normalized)
  if (requestedMonth) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const year = requestedMonth > currentMonth ? currentYear - 1 : currentYear
    return `${year}-${String(requestedMonth).padStart(2, '0')}`
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const isCategoriaNominaEgreso = (nombre?: string | null) => {
  const normalized = normalizeText(nombre)
  return normalized.includes('nomina base') || normalized.includes('nomina extra')
}

const getMonthDateRange = (periodoYm: string) => {
  const match = periodoYm.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const from = `${year}-${String(month).padStart(2, '0')}-01`

  const endDate = new Date(Date.UTC(year, month, 0))
  const to = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}`

  return { from, to }
}

const buildMissingServiceKeyResult = (domain: AgentDomain, toolName: string): ToolRunResult => ({
  status: 'error',
  domain,
  toolName,
  summary: 'No se pudo consultar base de datos del agente porque falta SUPABASE_SERVICE_ROLE_KEY en el backend.',
  notes: ['Configura SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor Next.js.'],
})

const hasAnyKeyword = (text: string, keywords: string[]) => {
  return keywords.some((keyword) => text.includes(keyword))
}

const normalizeForSearch = (value?: string | null) => {
  return normalizeText(value).replace(/[^a-z0-9\s]/g, ' ')
}

const formatPersonalName = (row: PersonalRow) => {
  const nombre = `${row.apellidos || ''} ${row.nombres || ''}`.replace(/\s+/g, ' ').trim()
  return nombre || 'Sin nombre'
}

const maskAccountNumber = (value?: string | null) => {
  const raw = String(value || '').replace(/\s+/g, '')
  if (!raw) return 'sin registro'
  if (raw.length <= 4) return `****${raw}`
  return `****${raw.slice(-4)}`
}

const isPerPersonSalaryQuery = (message: string) => {
  const text = normalizeForSearch(message)
  const asksIndividual = hasAnyKeyword(text, [
    'cada uno',
    'por persona',
    'individual',
    'detalle',
    'detallado',
    'lista',
    'listado',
    'personas',
  ])

  const asksSalary = hasAnyKeyword(text, [
    'gana',
    'ganan',
    'salario',
    'sueldo',
    'nomina',
  ])

  return asksIndividual && asksSalary
}

const NON_PERSON_BASE_TERMS = new Set([
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'setiembre', 'septiemrbe', 'octubre', 'noviembre', 'diciembre',
  'mes', 'periodo', 'nomina', 'base', 'total', 'deuda', 'adeudado',
])

const hasGlobalPayrollContext = (text: string) => {
  return hasAnyKeyword(text, [
    'adeud',
    'debemos',
    'deber',
    'deuda',
    'pendiente',
    'total',
    'periodo',
    'mes',
    'nomina base',
    'nomina mensual',
    'pago adeudado',
  ])
}

const isSinglePersonSalaryQuery = (message: string) => {
  const text = normalizeForSearch(message)
  const asksSalary = hasAnyKeyword(text, [
    'gana',
    'ganan',
    'cobra',
    'cobran',
    'salario',
    'sueldo',
    'nomina',
  ])

  const asksSingle =
    /(?:^|\s)s?cuanto\s+(?:gana|cobra)\b/.test(text)
    || hasAnyKeyword(text, [
      'sueldo base',
      'salario base',
      'sueldo de',
      'salario de',
      'base mensual de',
    ])

  const baseDeMatch = text.match(/\b(?:sueldo|salario|base)\s+(?:de|del)\s+([a-z0-9]{3,})/)
  const baseDeTarget = (baseDeMatch?.[1] || '').trim()
  const looksLikePersonAfterBaseDe = !!baseDeTarget && !NON_PERSON_BASE_TERMS.has(baseDeTarget)

  if (hasGlobalPayrollContext(text)) {
    return false
  }

  return asksSalary && (asksSingle || looksLikePersonAfterBaseDe) && !isPerPersonSalaryQuery(message)
}

const isPersonalPaymentLookupQuery = (message: string) => {
  const text = normalizeForSearch(message)
  if (text.includes('proveedor')) return false

  return hasAnyKeyword(text, [
    'pago movil',
    'pm de',
    'datos de pago movil',
    'datos bancarios',
    'datos de banco',
    'cuenta bancaria',
    'banco de',
    'telefono de pago movil',
  ])
}

const PERSON_SEARCH_STOP_WORDS = new Set([
  'a', 'academia', 'acceso', 'administrativo', 'administrativos', 'apellido', 'apellidos',
  'banca', 'bancarios', 'banco', 'base', 'celular', 'como', 'consulta', 'consultar',
  'cobra', 'cobran', 'cuenta', 'cual', 'cuanto', 'datos', 'de', 'del', 'deme',
  'el', 'esa', 'ese', 'esta', 'estan', 'ficha', 'ganan', 'gana', 'gracias', 'interno', 'la',
  'las', 'le', 'los', 'mensual', 'monto', 'movil', 'nombre', 'nombres', 'numero', 'paga',
  'pagale', 'pagar', 'pagarle', 'pago', 'para', 'pasame', 'pasar', 'personal', 'plan',
  'pm', 'por', 'profesor', 'profesores', 'puede', 'puedes', 'quiero', 'sabe', 'saber',
  'sabes', 'salario', 'scuanto', 'su', 'sueldo', 'sus', 'telefono', 'tengo', 'tiene',
  'tienen', 'tienes', 'ver',
])

const extractPersonTokens = (value: string, options?: { allowInitials?: boolean }) => {
  const allowInitials = options?.allowInitials ?? false
  const minLength = allowInitials ? 1 : 3

  return value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= minLength && !PERSON_SEARCH_STOP_WORDS.has(part) && !/^\d+$/.test(part))
}

const extractPersonTermsFromMessage = (message: string) => {
  const text = normalizeForSearch(message)
  const terms = new Set<string>()

  const termsFromPrepositions = new Set<string>()
  const prepositionMatches = text.matchAll(/\b(?:de|del|para|a)\s+([a-z0-9\s]{2,})/g)
  for (const match of prepositionMatches) {
    const raw = (match[1] || '').trim()
    if (!raw) continue
    for (const token of extractPersonTokens(raw, { allowInitials: true })) {
      termsFromPrepositions.add(token)
    }
  }

  if (termsFromPrepositions.size > 0) {
    return Array.from(termsFromPrepositions)
  }

  for (const token of extractPersonTokens(text)) {
    terms.add(token)
  }

  return Array.from(terms)
}

const tokenizePersonName = (row: PersonalRow) => {
  return normalizeForSearch(`${row.nombres || ''} ${row.apellidos || ''}`)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

const scorePersonalMatch = (row: PersonalRow, searchTerms: string[]) => {
  const nameTokens = tokenizePersonName(row)
  const cedula = normalizeForSearch(row.cedula_numero || '').replace(/\s+/g, '')
  const haystack = normalizeForSearch(`${row.nombres || ''} ${row.apellidos || ''} ${row.cedula_numero || ''}`)

  let score = 0

  for (const term of searchTerms) {
    if (!term) continue

    if (/^\d+$/.test(term)) {
      if (!cedula || !cedula.includes(term)) return null
      score += cedula === term ? 3 : 2
      continue
    }

    if (term.length === 1) {
      const hasInitial = nameTokens.some((token) => token.startsWith(term))
      if (!hasInitial) return null
      score += 1
      continue
    }

    const exactToken = nameTokens.includes(term)
    if (exactToken) {
      score += 3
      continue
    }

    const prefixToken = nameTokens.some((token) => token.startsWith(term))
    if (prefixToken) {
      score += 2
      continue
    }

    const contains = haystack.includes(term)
    if (contains) {
      score += 1
      continue
    }

    return null
  }

  return score
}

const findPersonalMatches = (rows: PersonalRow[], searchTerms: string[]) => {
  if (searchTerms.length === 0) return [] as PersonalRow[]

  const scored = rows
    .map((row) => ({ row, score: scorePersonalMatch(row, searchTerms) }))
    .filter((entry): entry is { row: PersonalRow; score: number } => entry.score !== null)

  scored.sort((a, b) => b.score - a.score)
  return scored.map((entry) => entry.row)
}

const fetchPersonalRows = async () => {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return { rows: [] as PersonalRow[], error: buildMissingServiceKeyResult('personal', 'personal_summary') }

  const response = await supabase
    .from('personal')
    .select('*')
    .order('apellidos')
    .order('nombres')

  if (response.error) {
    return {
      rows: [] as PersonalRow[],
      error: {
        status: 'error' as const,
        domain: 'personal' as const,
        toolName: 'personal_summary',
        summary: `No se pudo consultar personal: ${response.error.message}`,
      },
    }
  }

  return {
    rows: ((response.data as PersonalRow[] | null) ?? []),
    error: null,
  }
}

const getActivePersonal = (rows: PersonalRow[]) => {
  return rows.filter((row) => !isInTrash(row) && normalizeText(row.estado) !== 'cesado')
}

const runPersonalSummaryTool = async (): Promise<ToolRunResult> => {
  const fetched = await fetchPersonalRows()
  if (fetched.error) return fetched.error

  const activos = getActivePersonal(fetched.rows)
  const docentes = activos.filter((row) => classifyPersonalGroup(row) === 'docente')
  const administrativos = activos.filter((row) => classifyPersonalGroup(row) === 'administrativo')
  const totalNominaBase = roundMoney(activos.reduce((acc, row) => acc + safeNumber(row.monto_base_mensual), 0))

  const summary = [
    `Resumen de personal activo: ${activos.length} personas.`,
    `Docentes: ${docentes.length}.`,
    `Administrativos: ${administrativos.length}.`,
    `Nómina base estimada mensual: ${formatUSD(totalNominaBase, { withSymbol: true })}.`,
  ].join(' ')

  return {
    status: 'ok',
    domain: 'personal',
    toolName: 'personal_summary',
    summary,
  }
}

const runPersonalDetailTool = async (): Promise<ToolRunResult> => {
  const fetched = await fetchPersonalRows()
  if (fetched.error) return fetched.error

  const activos = getActivePersonal(fetched.rows)
  if (activos.length === 0) {
    return {
      status: 'ok',
      domain: 'personal',
      toolName: 'personal_detail',
      summary: 'No hay personal activo para detallar salarios individuales en este momento.',
    }
  }

  const maxRows = 30
  const visibleRows = activos.slice(0, maxRows)
  const totalNominaBase = roundMoney(activos.reduce((acc, row) => acc + safeNumber(row.monto_base_mensual), 0))

  const lines = visibleRows.map((row) => {
    const tipo = classifyPersonalGroup(row)
    const cargo = row.cargo || 'Sin cargo'
    const base = formatUSD(roundMoney(safeNumber(row.monto_base_mensual)), { withSymbol: true })
    return `- ${formatPersonalName(row)} | ${tipo} | Cargo: ${cargo} | Base mensual: ${base}`
  })

  if (activos.length > visibleRows.length) {
    lines.push(`- ... y ${activos.length - visibleRows.length} persona(s) adicional(es).`)
  }

  return {
    status: 'ok',
    domain: 'personal',
    toolName: 'personal_detail',
    summary: [
      `Detalle salarial de personal activo (${activos.length} personas):`,
      ...lines,
      `Nómina base total estimada: ${formatUSD(totalNominaBase, { withSymbol: true })}.`,
    ].join('\n'),
  }
}

const runPersonalSalaryLookupTool = async (message: string): Promise<ToolRunResult> => {
  const fetched = await fetchPersonalRows()
  if (fetched.error) return fetched.error

  const activos = getActivePersonal(fetched.rows)
  const searchTerms = extractPersonTermsFromMessage(message)

  if (searchTerms.length === 0) {
    return {
      status: 'ok',
      domain: 'personal',
      toolName: 'personal_salary_lookup',
      summary: 'Sí tengo acceso al sueldo base del personal. Indícame nombre o apellido para ubicar a la persona (ejemplo: "¿cuánto gana Nadia?").',
    }
  }

  const matches = findPersonalMatches(activos, searchTerms)

  if (matches.length === 0) {
    return {
      status: 'ok',
      domain: 'personal',
      toolName: 'personal_salary_lookup',
      summary: `No encontré personal activo para: ${searchTerms.join(', ')}. Verifica nombre/apellido exacto en la ficha de personal.`,
    }
  }

  const lines = matches.map((row) => {
    const sueldoBase = formatUSD(roundMoney(safeNumber(row.monto_base_mensual)), { withSymbol: true })
    return `- ${formatPersonalName(row)} | Cargo: ${row.cargo || 'Sin cargo'} | Sueldo base mensual: ${sueldoBase}`
  })

  return {
    status: 'ok',
    domain: 'personal',
    toolName: 'personal_salary_lookup',
    summary: [
      `Sueldo base en ficha de personal (${matches.length} coincidencia(s)):`,
      ...lines,
    ].join('\n'),
  }
}

const runPersonalPaymentLookupTool = async (message: string): Promise<ToolRunResult> => {
  const fetched = await fetchPersonalRows()
  if (fetched.error) return fetched.error

  const activos = getActivePersonal(fetched.rows)
  const searchTerms = extractPersonTermsFromMessage(message)

  if (searchTerms.length === 0) {
    return {
      status: 'ok',
      domain: 'personal',
      toolName: 'personal_payment_lookup',
      summary: 'Indícame al menos un apellido o nombre para buscar datos de pago móvil/banco del personal. Ejemplo: "pago móvil de Gordillo".',
    }
  }

  const matches = findPersonalMatches(activos, searchTerms)

  if (matches.length === 0) {
    return {
      status: 'ok',
      domain: 'personal',
      toolName: 'personal_payment_lookup',
      summary: `No encontré coincidencias de personal activo para: ${searchTerms.join(', ')}. Verifica apellido/nombre exacto.`,
    }
  }

  const lines = matches.map((row) => {
    const pmData = [
      row.pm_banco ? `Banco: ${row.pm_banco}` : '',
      row.pm_telefono ? `Teléfono: ${row.pm_telefono}` : '',
      row.pm_cedula ? `Cédula: ${row.pm_cedula}` : '',
    ].filter(Boolean).join(' | ') || 'sin registro'

    const bankData = [
      row.banco_nombre ? `Banco: ${row.banco_nombre}` : '',
      `Cuenta: ${maskAccountNumber(row.banco_numero_cuenta)}`,
      row.banco_cedula_titular ? `Cédula titular: ${row.banco_cedula_titular}` : '',
    ].filter(Boolean).join(' | ') || 'sin registro'

    return `- ${formatPersonalName(row)}\n  Pago móvil: ${pmData}\n  Banco: ${bankData}`
  })

  return {
    status: 'ok',
    domain: 'personal',
    toolName: 'personal_payment_lookup',
    summary: [
      `Datos de pago para ${matches.length} coincidencia(s):`,
      ...lines,
    ].join('\n'),
  }
}

const runPersonalTool = async (message: string): Promise<ToolRunResult> => {
  if (isPersonalPaymentLookupQuery(message)) {
    return runPersonalPaymentLookupTool(message)
  }

  if (isPerPersonSalaryQuery(message)) {
    return runPersonalDetailTool()
  }

  if (isSinglePersonSalaryQuery(message)) {
    return runPersonalSalaryLookupTool(message)
  }

  return runPersonalSummaryTool()
}

const runNominaSummaryTool = async (message: string): Promise<ToolRunResult> => {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return buildMissingServiceKeyResult('nomina', 'nomina_latest_summary')

  const normalizedMessage = normalizeText(message)
  const explicitPeriodo = normalizedMessage.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/)?.[0] || ''
  const requestedMonth = getMonthNumberFromText(normalizedMessage)
  const periodoInferido = getPeriodoYmFromMessage(message)
  const shouldComputeDebt = hasAnyKeyword(normalizedMessage, [
    'adeud',
    'debemos',
    'deber',
    'deuda',
    'pendiente',
    'pago adeudado',
  ])

  const selectWithExtras = 'id, periodo_ym, estado, total_base, total_descuentos, total_extras, total_neto, updated_at, deleted_at'
  const selectWithoutExtras = 'id, periodo_ym, estado, total_base, total_descuentos, total_neto, updated_at, deleted_at'

  const notes: string[] = []

  const executeNominaHeaderQuery = async (selectFields: string, target: { periodoYm?: string; month?: number; latest?: boolean }) => {
    let query = supabase
      .from('nominas_mensuales')
      .select(selectFields)
      .is('deleted_at', null)

    if (target.periodoYm) {
      query = query.eq('periodo_ym', target.periodoYm)
    } else if (typeof target.month === 'number') {
      const suffix = `-${String(target.month).padStart(2, '0')}`
      query = query.like('periodo_ym', `%${suffix}`)
    }

    return query
      .order('periodo_ym', { ascending: false })
      .limit(1)
  }

  const fetchNominaHeader = async (target: { periodoYm?: string; month?: number; latest?: boolean }) => {
    const withExtras = await executeNominaHeaderQuery(selectWithExtras, target)

    if (!withExtras.error) {
      return {
        row: ((withExtras.data as NominaHeaderRow[] | null) ?? [])[0] || null,
        error: null as string | null,
      }
    }

    if (!isMissingColumnError(withExtras.error, 'total_extras')) {
      return {
        row: null as NominaHeaderRow | null,
        error: `No se pudo consultar nómina: ${withExtras.error.message}`,
      }
    }

    notes.push('La tabla de nómina no tiene total_extras; se usa 0 como valor de extras.')

    const fallback = await executeNominaHeaderQuery(selectWithoutExtras, target)
    if (fallback.error) {
      return {
        row: null as NominaHeaderRow | null,
        error: `No se pudo consultar nómina: ${fallback.error.message}`,
      }
    }

    return {
      row: ((fallback.data as NominaHeaderRow[] | null) ?? [])[0] || null,
      error: null as string | null,
    }
  }

  let latest: NominaHeaderRow | null = null

  if (explicitPeriodo) {
    const result = await fetchNominaHeader({ periodoYm: explicitPeriodo })
    if (result.error) {
      return {
        status: 'error',
        domain: 'nomina',
        toolName: 'nomina_latest_summary',
        summary: result.error,
      }
    }
    latest = result.row
  } else if (requestedMonth) {
    const preferedResult = await fetchNominaHeader({ periodoYm: periodoInferido })
    if (preferedResult.error) {
      return {
        status: 'error',
        domain: 'nomina',
        toolName: 'nomina_latest_summary',
        summary: preferedResult.error,
      }
    }

    latest = preferedResult.row

    if (!latest) {
      const fallbackByMonth = await fetchNominaHeader({ month: requestedMonth })
      if (fallbackByMonth.error) {
        return {
          status: 'error',
          domain: 'nomina',
          toolName: 'nomina_latest_summary',
          summary: fallbackByMonth.error,
        }
      }

      latest = fallbackByMonth.row

      if (latest?.periodo_ym && latest.periodo_ym !== periodoInferido) {
        notes.push(`No había nómina guardada para ${periodoInferido}; se usó ${latest.periodo_ym}.`)
      }
    }
  } else {
    const result = await fetchNominaHeader({ latest: true })
    if (result.error) {
      return {
        status: 'error',
        domain: 'nomina',
        toolName: 'nomina_latest_summary',
        summary: result.error,
      }
    }
    latest = result.row
  }

  if (!latest?.id && (explicitPeriodo || requestedMonth)) {
    const latestResult = await fetchNominaHeader({ latest: true })
    if (latestResult.error) {
      return {
        status: 'error',
        domain: 'nomina',
        toolName: 'nomina_latest_summary',
        summary: latestResult.error,
      }
    }

    latest = latestResult.row

    if (latest?.periodo_ym) {
      const missingLabel = explicitPeriodo
        ? explicitPeriodo
        : periodoInferido
      notes.push(`No había nómina guardada para ${missingLabel}; se usó el último período disponible (${latest.periodo_ym}).`)
    }
  }

  if (!latest?.id) {
    const targetLabel = explicitPeriodo
      ? `para el período ${explicitPeriodo}`
      : requestedMonth
        ? `para ${getMonthLabel(requestedMonth)}`
        : 'aún'

    return {
      status: 'ok',
      domain: 'nomina',
      toolName: 'nomina_latest_summary',
      summary: `No hay nóminas mensuales guardadas ${targetLabel}.`,
    }
  }

  const detailCountRes = await supabase
    .from('nominas_mensuales_detalle')
    .select('id', { count: 'exact', head: true })
    .eq('nomina_id', latest.id)

  const detalleCount = Number(detailCountRes.count || 0)
  const totalExtras = roundMoney(safeNumber(latest.total_extras))

  let totalAdeudado = 0
  let totalSaldoFavor = 0
  let totalPagadoPeriodo = 0
  let pendientes = 0

  if (shouldComputeDebt && latest.periodo_ym) {
    type CurrentDetailRow = {
      personal_id?: string | null
      neto_base?: number | null
      neto_total?: number | null
    }

    let currentDetails: CurrentDetailRow[] = []
    const detailsWithNetoTotal = await supabase
      .from('nominas_mensuales_detalle')
      .select('personal_id, neto_base, neto_total')
      .eq('nomina_id', latest.id)

    if (!detailsWithNetoTotal.error) {
      currentDetails = (detailsWithNetoTotal.data as CurrentDetailRow[] | null) ?? []
    } else if (isMissingColumnError(detailsWithNetoTotal.error, 'neto_total')) {
      notes.push('Detalle de nómina sin neto_total; se usa neto_base para calcular adeudado.')
      const detailFallback = await supabase
        .from('nominas_mensuales_detalle')
        .select('personal_id, neto_base')
        .eq('nomina_id', latest.id)

      if (!detailFallback.error) {
        currentDetails = ((detailFallback.data as Array<{ personal_id?: string | null; neto_base?: number | null }> | null) ?? [])
          .map((row) => ({
            personal_id: row.personal_id,
            neto_base: row.neto_base,
            neto_total: null,
          }))
      } else {
        notes.push(`No se pudo consultar detalle de nómina para adeudado: ${detailFallback.error.message}.`)
      }
    } else {
      notes.push(`No se pudo consultar detalle de nómina para adeudado: ${detailsWithNetoTotal.error.message}.`)
    }

    if (currentDetails.length > 0) {
      const netoActualByPersonal: Record<string, number> = {}
      for (const row of currentDetails) {
        const personalId = (row.personal_id || '').trim()
        if (!personalId) continue
        const neto = roundMoney(safeNumber(row.neto_total ?? row.neto_base))
        netoActualByPersonal[personalId] = roundMoney((netoActualByPersonal[personalId] || 0) + neto)
      }

      const personalIds = Object.keys(netoActualByPersonal)

      if (personalIds.length > 0) {
        const categoriasRes = await supabase
          .from('categorias_egreso')
          .select('id, nombre')

        if (categoriasRes.error) {
          notes.push(`No se pudieron consultar categorías de egreso para adeudado: ${categoriasRes.error.message}.`)
        } else {
          const categoriasNominaIds = ((categoriasRes.data as Array<{ id?: string; nombre?: string | null }> | null) ?? [])
            .filter((categoria) => isCategoriaNominaEgreso(categoria.nombre))
            .map((categoria) => categoria.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)

          if (categoriasNominaIds.length === 0) {
            notes.push('No hay categorías de egreso de nómina para calcular pagos imputados.')
          } else {
            type PaymentRow = {
              profesor_id?: string | null
              monto_usd?: number | null
              periodo_nomina_ym?: string | null
              fecha_pago?: string | null
            }

            const todayYmd = new Date().toISOString().slice(0, 10)
            const pagosPrevios: Record<string, number> = {}
            const pagosPeriodo: Record<string, number> = {}
            const obligacionesPrevias: Record<string, number> = {}

            let useLegacyByDateOnly = false
            let pagosRows: PaymentRow[] = []

            const pagosConPeriodo = await supabase
              .from('egresos')
              .select('profesor_id, monto_usd, periodo_nomina_ym, fecha_pago')
              .in('profesor_id', personalIds)
              .in('categoria_id', categoriasNominaIds)
              .not('periodo_nomina_ym', 'is', null)
              .lte('periodo_nomina_ym', latest.periodo_ym)
              .lte('fecha_pago', todayYmd)

            if (!pagosConPeriodo.error) {
              pagosRows = (pagosConPeriodo.data as PaymentRow[] | null) ?? []
            } else if (isMissingColumnError(pagosConPeriodo.error, 'periodo_nomina_ym')) {
              useLegacyByDateOnly = true
              notes.push('La BD no tiene periodo_nomina_ym en egresos; el adeudado se estima con pagos por fecha del mes.')
              const range = getMonthDateRange(latest.periodo_ym)

              if (range) {
                const legacy = await supabase
                  .from('egresos')
                  .select('profesor_id, monto_usd, fecha_pago')
                  .in('profesor_id', personalIds)
                  .in('categoria_id', categoriasNominaIds)
                  .gte('fecha_pago', range.from)
                  .lte('fecha_pago', todayYmd)

                if (!legacy.error) {
                  pagosRows = ((legacy.data as Array<{ profesor_id?: string | null; monto_usd?: number | null; fecha_pago?: string | null }> | null) ?? [])
                    .map((row) => ({
                      profesor_id: row.profesor_id,
                      monto_usd: row.monto_usd,
                      fecha_pago: row.fecha_pago,
                      periodo_nomina_ym: latest?.periodo_ym || null,
                    }))
                } else {
                  notes.push(`No se pudieron consultar pagos de nómina para adeudado: ${legacy.error.message}.`)
                }
              }
            } else {
              notes.push(`No se pudieron consultar pagos de nómina para adeudado: ${pagosConPeriodo.error.message}.`)
            }

            if (!useLegacyByDateOnly) {
              const prevNominas = await supabase
                .from('nominas_mensuales')
                .select('id')
                .is('deleted_at', null)
                .lt('periodo_ym', latest.periodo_ym)

              if (!prevNominas.error) {
                const prevNominaIds = ((prevNominas.data as Array<{ id?: string }> | null) ?? [])
                  .map((row) => row.id)
                  .filter((id): id is string => typeof id === 'string' && id.length > 0)

                if (prevNominaIds.length > 0) {
                  const prevDetails = await supabase
                    .from('nominas_mensuales_detalle')
                    .select('personal_id, neto_base, neto_total')
                    .in('nomina_id', prevNominaIds)
                    .in('personal_id', personalIds)

                  if (!prevDetails.error) {
                    for (const row of ((prevDetails.data as CurrentDetailRow[] | null) ?? [])) {
                      const personalId = (row.personal_id || '').trim()
                      if (!personalId) continue
                      const neto = roundMoney(safeNumber(row.neto_total ?? row.neto_base))
                      obligacionesPrevias[personalId] = roundMoney((obligacionesPrevias[personalId] || 0) + neto)
                    }
                  } else if (isMissingColumnError(prevDetails.error, 'neto_total')) {
                    const prevLegacy = await supabase
                      .from('nominas_mensuales_detalle')
                      .select('personal_id, neto_base')
                      .in('nomina_id', prevNominaIds)
                      .in('personal_id', personalIds)

                    if (!prevLegacy.error) {
                      for (const row of ((prevLegacy.data as Array<{ personal_id?: string | null; neto_base?: number | null }> | null) ?? [])) {
                        const personalId = (row.personal_id || '').trim()
                        if (!personalId) continue
                        const neto = roundMoney(safeNumber(row.neto_base))
                        obligacionesPrevias[personalId] = roundMoney((obligacionesPrevias[personalId] || 0) + neto)
                      }
                    } else {
                      notes.push(`No se pudieron consultar obligaciones previas de nómina: ${prevLegacy.error.message}.`)
                    }
                  } else {
                    notes.push(`No se pudieron consultar obligaciones previas de nómina: ${prevDetails.error.message}.`)
                  }
                }
              } else {
                notes.push(`No se pudieron consultar períodos previos de nómina: ${prevNominas.error.message}.`)
              }
            }

            for (const pago of pagosRows) {
              const personalId = (pago.profesor_id || '').trim()
              if (!personalId || !netoActualByPersonal[personalId]) continue

              const monto = roundMoney(safeNumber(pago.monto_usd))
              if (!monto) continue

              const periodoPago = (pago.periodo_nomina_ym || '').trim()

              if (useLegacyByDateOnly || periodoPago === latest.periodo_ym) {
                pagosPeriodo[personalId] = roundMoney((pagosPeriodo[personalId] || 0) + monto)
              } else if (periodoPago && periodoPago < latest.periodo_ym) {
                pagosPrevios[personalId] = roundMoney((pagosPrevios[personalId] || 0) + monto)
              }
            }

            for (const personalId of personalIds) {
              const netoActual = roundMoney(safeNumber(netoActualByPersonal[personalId] || 0))
              const saldoPrevio = useLegacyByDateOnly
                ? 0
                : roundMoney((pagosPrevios[personalId] || 0) - (obligacionesPrevias[personalId] || 0))

              const adelantos = roundMoney(Math.max(saldoPrevio + (pagosPeriodo[personalId] || 0), 0))
              const adeudado = roundMoney(Math.max(netoActual - adelantos, 0))
              const saldoFavor = roundMoney(Math.max(adelantos - netoActual, 0))

              totalPagadoPeriodo = roundMoney(totalPagadoPeriodo + roundMoney(safeNumber(pagosPeriodo[personalId] || 0)))
              totalAdeudado = roundMoney(totalAdeudado + adeudado)
              totalSaldoFavor = roundMoney(totalSaldoFavor + saldoFavor)
              if (adeudado > 0) pendientes += 1
            }
          }
        }
      }
    }
  }

  const summary = [
    `Nómina consultada: período ${latest.periodo_ym || 'N/D'} (${normalizeText(latest.estado) || 'sin estado'}).`,
    `Personal incluido: ${detalleCount}.`,
    `Base: ${formatUSD(roundMoney(safeNumber(latest.total_base)), { withSymbol: true })}.`,
    `Descuentos: ${formatUSD(roundMoney(safeNumber(latest.total_descuentos)), { withSymbol: true })}.`,
    `Extras: ${formatUSD(totalExtras, { withSymbol: true })}.`,
    `Neto: ${formatUSD(roundMoney(safeNumber(latest.total_neto)), { withSymbol: true })}.`,
    ...(shouldComputeDebt
      ? [
        `Adeudado actual estimado: ${formatUSD(roundMoney(totalAdeudado), { withSymbol: true })}.`,
        `Pagos imputados al período: ${formatUSD(roundMoney(totalPagadoPeriodo), { withSymbol: true })}.`,
        `Saldo a favor acumulado: ${formatUSD(roundMoney(totalSaldoFavor), { withSymbol: true })}.`,
        `Personal con pago pendiente: ${pendientes}.`,
      ]
      : []),
    ...(notes.length > 0 ? [`Notas: ${notes.join(' ')}`] : []),
  ].join(' ')

  return {
    status: 'ok',
    domain: 'nomina',
    toolName: 'nomina_latest_summary',
    summary,
  }
}

const runIngresosMonthTool = async (message: string): Promise<ToolRunResult> => {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return buildMissingServiceKeyResult('ingresos', 'ingresos_month_summary')

  const periodoYm = getPeriodoYmFromMessage(message)
  const range = getMonthDateRange(periodoYm)

  if (!range) {
    return {
      status: 'error',
      domain: 'ingresos',
      toolName: 'ingresos_month_summary',
      summary: 'No se pudo interpretar el período solicitado. Usa formato YYYY-MM.',
    }
  }

  const selectBase = 'monto_usd, estado, deleted_at'
  const selectFallback = 'monto_usd, estado'

  let rows: IngresoRow[] = []
  const withDeleted = await supabase
    .from('ingresos')
    .select(selectBase)
    .gte('fecha_ingreso', range.from)
    .lte('fecha_ingreso', range.to)

  if (!withDeleted.error) {
    rows = (withDeleted.data as IngresoRow[] | null) ?? []
  } else {
    const msg = withDeleted.error.message || ''
    if (!isMissingColumnError(msg, 'deleted_at')) {
      return {
        status: 'error',
        domain: 'ingresos',
        toolName: 'ingresos_month_summary',
        summary: `No se pudo consultar ingresos: ${withDeleted.error.message}`,
      }
    }

    const fallback = await supabase
      .from('ingresos')
      .select(selectFallback)
      .gte('fecha_ingreso', range.from)
      .lte('fecha_ingreso', range.to)

    if (fallback.error) {
      return {
        status: 'error',
        domain: 'ingresos',
        toolName: 'ingresos_month_summary',
        summary: `No se pudo consultar ingresos: ${fallback.error.message}`,
      }
    }

    rows = (fallback.data as IngresoRow[] | null) ?? []
  }

  const vigentes = rows.filter((row) => !row.deleted_at)
  const confirmados = vigentes.filter((row) => normalizeText(row.estado) === 'confirmado')
  const pendientes = vigentes.filter((row) => normalizeText(row.estado) === 'pendiente')

  const total = roundMoney(vigentes.reduce((acc, row) => acc + safeNumber(row.monto_usd), 0))
  const totalConfirmados = roundMoney(confirmados.reduce((acc, row) => acc + safeNumber(row.monto_usd), 0))
  const totalPendientes = roundMoney(pendientes.reduce((acc, row) => acc + safeNumber(row.monto_usd), 0))

  return {
    status: 'ok',
    domain: 'ingresos',
    toolName: 'ingresos_month_summary',
    summary: [
      `Ingresos de ${periodoYm}: ${vigentes.length} registros.`,
      `Total: ${formatUSD(total, { withSymbol: true })}.`,
      `Confirmados: ${formatUSD(totalConfirmados, { withSymbol: true })}.`,
      `Pendientes: ${formatUSD(totalPendientes, { withSymbol: true })}.`,
    ].join(' '),
  }
}

const runEgresosMonthTool = async (message: string): Promise<ToolRunResult> => {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return buildMissingServiceKeyResult('egresos', 'egresos_month_summary')

  const periodoYm = getPeriodoYmFromMessage(message)
  const range = getMonthDateRange(periodoYm)

  if (!range) {
    return {
      status: 'error',
      domain: 'egresos',
      toolName: 'egresos_month_summary',
      summary: 'No se pudo interpretar el período solicitado. Usa formato YYYY-MM.',
    }
  }

  const selectBase = 'monto_usd, deleted_at'
  const selectFallback = 'monto_usd'

  let rows: EgresoRow[] = []
  const withDeleted = await supabase
    .from('egresos')
    .select(selectBase)
    .gte('fecha_pago', range.from)
    .lte('fecha_pago', range.to)

  if (!withDeleted.error) {
    rows = (withDeleted.data as EgresoRow[] | null) ?? []
  } else {
    const msg = withDeleted.error.message || ''
    if (!isMissingColumnError(msg, 'deleted_at')) {
      return {
        status: 'error',
        domain: 'egresos',
        toolName: 'egresos_month_summary',
        summary: `No se pudo consultar egresos: ${withDeleted.error.message}`,
      }
    }

    const fallback = await supabase
      .from('egresos')
      .select(selectFallback)
      .gte('fecha_pago', range.from)
      .lte('fecha_pago', range.to)

    if (fallback.error) {
      return {
        status: 'error',
        domain: 'egresos',
        toolName: 'egresos_month_summary',
        summary: `No se pudo consultar egresos: ${fallback.error.message}`,
      }
    }

    rows = (fallback.data as EgresoRow[] | null) ?? []
  }

  const vigentes = rows.filter((row) => !row.deleted_at)
  const total = roundMoney(vigentes.reduce((acc, row) => acc + safeNumber(row.monto_usd), 0))

  return {
    status: 'ok',
    domain: 'egresos',
    toolName: 'egresos_month_summary',
    summary: [
      `Egresos de ${periodoYm}: ${vigentes.length} registros.`,
      `Total: ${formatUSD(total, { withSymbol: true })}.`,
    ].join(' '),
  }
}

const runReportesMonthTool = async (message: string): Promise<ToolRunResult> => {
  const ingresos = await runIngresosMonthTool(message)
  const egresos = await runEgresosMonthTool(message)

  if (ingresos.status === 'error' && egresos.status === 'error') {
    return {
      status: 'error',
      domain: 'reportes',
      toolName: 'reportes_month_flow',
      summary: `No se pudo consolidar flujo mensual. Ingresos: ${ingresos.summary} Egresos: ${egresos.summary}`,
    }
  }

  const combined = [
    'Resumen financiero mensual:',
    ingresos.summary,
    egresos.summary,
  ].join(' ')

  return {
    status: 'ok',
    domain: 'reportes',
    toolName: 'reportes_month_flow',
    summary: combined,
  }
}

export const runAgentToolForDomain = async (domain: AgentDomain, message: string): Promise<ToolRunResult> => {
  if (domain === 'personal') return runPersonalTool(message)
  if (domain === 'nomina' && isPerPersonSalaryQuery(message)) return runPersonalDetailTool()
  if (domain === 'nomina' && isSinglePersonSalaryQuery(message)) return runPersonalSalaryLookupTool(message)
  if (domain === 'nomina') return runNominaSummaryTool(message)
  if (domain === 'ingresos') return runIngresosMonthTool(message)
  if (domain === 'egresos') return runEgresosMonthTool(message)

  return runReportesMonthTool(message)
}
