import type { AgentProviderMode } from './types'

export type AgentRuntimeConfig = {
  mode: AgentProviderMode
  geminiApiKey: string
  geminiModel: string
  localProviderUrl: string
  timeoutMs: number
}

const normalizeMode = (value?: string): AgentProviderMode => {
  if (value === 'gemini' || value === 'local' || value === 'hybrid') return value
  return 'hybrid'
}

const parseTimeout = (value?: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 15000
  return parsed
}

export const agentRuntimeConfig: AgentRuntimeConfig = {
  mode: normalizeMode(process.env.AI_AGENT_PROVIDER_MODE),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.AI_AGENT_GEMINI_MODEL || 'gemini-2.5-flash',
  localProviderUrl: process.env.AI_AGENT_LOCAL_URL || '',
  timeoutMs: parseTimeout(process.env.AI_AGENT_TIMEOUT_MS),
}

export const getAgentConfigStatus = () => {
  const hasGemini = !!agentRuntimeConfig.geminiApiKey
  const hasLocal = !!agentRuntimeConfig.localProviderUrl
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  const readyProvider =
    (agentRuntimeConfig.mode === 'gemini' && hasGemini)
    || (agentRuntimeConfig.mode === 'local' && hasLocal)
    || (agentRuntimeConfig.mode === 'hybrid' && (hasGemini || hasLocal))

  return {
    mode: agentRuntimeConfig.mode,
    hasGemini,
    geminiModel: agentRuntimeConfig.geminiModel,
    hasLocal,
    hasServiceRole,
    readyProvider,
    readyForData: readyProvider && hasServiceRole,
    ready: readyProvider && hasServiceRole,
  }
}
