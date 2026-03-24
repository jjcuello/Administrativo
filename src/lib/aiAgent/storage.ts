import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import type { AgentProviderMode, ChatTurnRole } from './types'

type ToolCallStatus = 'ok' | 'error' | 'blocked'

type EnsureConversationInput = {
  requestedConversationId?: string
  userId: string
  providerMode: AgentProviderMode
}

const isTableMissingError = (message: string, tableName: string) => {
  const msg = (message || '').toLowerCase()
  const table = tableName.toLowerCase()
  return msg.includes(table) && (msg.includes('relation') || msg.includes('does not exist') || msg.includes('no existe'))
}

export const ensureAgentConversation = async (input: EnsureConversationInput) => {
  const fallbackConversationId = (input.requestedConversationId || '').trim() || crypto.randomUUID()
  const supabase = getSupabaseServiceClient()

  if (!supabase) {
    return {
      conversationId: fallbackConversationId,
      persisted: false,
      notes: ['No se pudo persistir conversación: SUPABASE_SERVICE_ROLE_KEY no configurada.'],
    }
  }

  if (input.requestedConversationId?.trim()) {
    const existing = await supabase
      .from('app_ai_conversations')
      .select('id, user_id, deleted_at')
      .eq('id', input.requestedConversationId.trim())
      .maybeSingle()

    if (!existing.error && existing.data && existing.data.user_id === input.userId && !existing.data.deleted_at) {
      return {
        conversationId: input.requestedConversationId.trim(),
        persisted: true,
        notes: [] as string[],
      }
    }
  }

  const conversationId = crypto.randomUUID()
  const insert = await supabase
    .from('app_ai_conversations')
    .insert({
      id: conversationId,
      user_id: input.userId,
      provider_mode: input.providerMode,
    })

  if (insert.error) {
    const msg = insert.error.message || ''
    const relationMissing = isTableMissingError(msg, 'app_ai_conversations')

    return {
      conversationId: relationMissing ? fallbackConversationId : conversationId,
      persisted: false,
      notes: [
        relationMissing
          ? 'No se pudo persistir conversación: falta tabla app_ai_conversations (ejecuta v33).'
          : `No se pudo persistir conversación: ${msg}`,
      ],
    }
  }

  return {
    conversationId,
    persisted: true,
    notes: [] as string[],
  }
}

export const appendAgentMessage = async (params: {
  conversationId: string
  role: ChatTurnRole
  content: string
  meta?: Record<string, unknown>
}) => {
  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    return {
      messageId: null as string | null,
      persisted: false,
      note: 'No se pudo persistir mensaje: SUPABASE_SERVICE_ROLE_KEY no configurada.',
    }
  }

  const insert = await supabase
    .from('app_ai_messages')
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      meta: params.meta || {},
    })
    .select('id')
    .maybeSingle()

  if (insert.error) {
    return {
      messageId: null as string | null,
      persisted: false,
      note: `No se pudo persistir mensaje: ${insert.error.message}`,
    }
  }

  return {
    messageId: insert.data?.id || null,
    persisted: true,
    note: '',
  }
}

export const appendAgentToolCall = async (params: {
  messageId?: string | null
  toolName: string
  args: Record<string, unknown>
  resultSummary: string
  status: ToolCallStatus
}) => {
  if (!params.messageId) {
    return {
      persisted: false,
      note: 'No se guardó tool call: mensaje asistente sin id persistido.',
    }
  }

  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    return {
      persisted: false,
      note: 'No se pudo persistir tool call: SUPABASE_SERVICE_ROLE_KEY no configurada.',
    }
  }

  const insert = await supabase
    .from('app_ai_tool_calls')
    .insert({
      message_id: params.messageId,
      tool_name: params.toolName,
      args: params.args,
      result_summary: params.resultSummary,
      status: params.status,
    })

  if (insert.error) {
    return {
      persisted: false,
      note: `No se pudo persistir tool call: ${insert.error.message}`,
    }
  }

  return {
    persisted: true,
    note: '',
  }
}
