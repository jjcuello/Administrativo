import type { AgentDomain, AgentRoleCode } from './types'

const ALL_DOMAINS: AgentDomain[] = [
  'personal',
  'nomina',
  'ingresos',
  'egresos',
  'socios',
  'proveedores',
  'clientes',
  'reportes',
]

const ROLE_DOMAIN_POLICY: Record<AgentRoleCode, AgentDomain[]> = {
  admin: ALL_DOMAINS,
  operativo: ['ingresos', 'egresos', 'clientes', 'proveedores', 'reportes'],
  consulta: ['reportes'],
  gestion_personal: ['personal', 'nomina', 'reportes'],
  operador: ALL_DOMAINS,
}

export const getAllowedDomainsForRole = (roleCode: AgentRoleCode): AgentDomain[] => {
  return ROLE_DOMAIN_POLICY[roleCode]
}

export const canAccessDomain = (roleCode: AgentRoleCode, domain: AgentDomain) => {
  return ROLE_DOMAIN_POLICY[roleCode].includes(domain)
}
