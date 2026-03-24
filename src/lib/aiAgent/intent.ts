import type { AgentDomain } from './types'

const normalizeText = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
)

const hasAny = (text: string, candidates: string[]) => {
  return candidates.some((candidate) => text.includes(candidate))
}

const NON_PERSON_BASE_TERMS = new Set([
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'setiembre', 'septiembre', 'septiemrbe', 'octubre', 'noviembre', 'diciembre',
  'mes', 'periodo', 'nomina', 'base', 'total', 'deuda', 'adeudado',
])

const hasGlobalPayrollContext = (text: string) => {
  return hasAny(text, [
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

const isPersonalPaymentQuery = (text: string) => {
  if (text.includes('proveedor')) return false

  return hasAny(text, [
    'pago movil',
    'pm de',
    'datos de pago movil',
    'datos bancarios',
    'datos de banco',
    'cuenta bancaria',
    'pago movil',
  ])
}

const isPerPersonSalaryQuery = (text: string) => {
  const asksIndividual = hasAny(text, [
    'cada uno',
    'por persona',
    'individual',
    'detalle',
    'detallado',
    'lista',
    'listado',
    'personas',
  ])

  const asksSalary = hasAny(text, [
    'gana',
    'ganan',
    'salario',
    'sueldo',
    'nomina',
  ])

  return asksIndividual && asksSalary
}

const isSinglePersonSalaryQuery = (text: string) => {
  const asksSalary = hasAny(text, [
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
    || hasAny(text, [
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

  return asksSalary && (asksSingle || looksLikePersonAfterBaseDe) && !isPerPersonSalaryQuery(text)
}

export const detectDomainFromMessage = (message: string): AgentDomain => {
  const text = normalizeText(message)

  if (isPersonalPaymentQuery(text) || isPerPersonSalaryQuery(text) || isSinglePersonSalaryQuery(text)) {
    return 'personal'
  }

  if (text.includes('nomina') || text.includes('salario') || text.includes('sueldo')) {
    return 'nomina'
  }

  if (text.includes('ingreso') || text.includes('cobro') || text.includes('venta') || text.includes('recaud')) {
    return 'ingresos'
  }

  if (text.includes('egreso') || text.includes('gasto') || text.includes('proveedor') || text.includes('pago')) {
    return 'egresos'
  }

  if (
    text.includes('personal')
    || text.includes('docente')
    || text.includes('administrativo')
    || text.includes('empleado')
    || text.includes('profesor')
  ) {
    return 'personal'
  }

  return 'reportes'
}
