export type AgentRoleCode = 'admin' | 'operativo' | 'consulta' | 'gestion_personal' | 'operador'

export type AgentProviderMode = 'gemini' | 'local' | 'hybrid'

export type AgentDomain =
  | 'personal'
  | 'nomina'
  | 'ingresos'
  | 'egresos'
  | 'socios'
  | 'proveedores'
  | 'clientes'
  | 'reportes'

export type ChatTurnRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  role: ChatTurnRole
  content: string
  createdAt?: string
}

export interface ChatRequestPayload {
  message: string
  conversationId?: string
  providerHint?: AgentProviderMode
}

export interface ChatResponsePayload {
  status: 'ok' | 'blocked' | 'error'
  reply: string
  providerUsed: AgentProviderMode
  conversationId: string
  allowedDomains: AgentDomain[]
  roleCodeResolved?: AgentRoleCode
  detectedDomain?: AgentDomain
  toolName?: string
  notes?: string[]
}
