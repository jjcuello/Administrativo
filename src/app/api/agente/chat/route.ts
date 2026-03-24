import { getAgentConfigStatus } from '@/lib/aiAgent/config'
import { resolveAgentUserFromRequest } from '@/lib/aiAgent/auth'
import { detectDomainFromMessage } from '@/lib/aiAgent/intent'
import { canAccessDomain, getAllowedDomainsForRole } from '@/lib/aiAgent/policy'
import { runProviderResponse } from '@/lib/aiAgent/providers'
import { appendAgentMessage, appendAgentToolCall, ensureAgentConversation } from '@/lib/aiAgent/storage'
import { runAgentToolForDomain } from '@/lib/aiAgent/tools'
import type { AgentProviderMode } from '@/lib/aiAgent/types'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

const normalizeProviderHint = (value: unknown): AgentProviderMode | undefined => {
  if (value === 'gemini' || value === 'local' || value === 'hybrid') return value
  return undefined
}

const AGENT_NAME = 'Cristina 🤖'

const normalizeText = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

const hasAny = (text: string, candidates: string[]) => {
  return candidates.some((candidate) => text.includes(candidate))
}

const CONTEXT_STOP_WORDS = new Set([
  'datos', 'pago', 'movil', 'pm', 'banco', 'cuenta', 'por', 'favor', 'del', 'de', 'la', 'el',
  'los', 'las', 'persona', 'personal', 'profesor', 'profesores', 'administrativo', 'administrativos',
  'academia', 'interno', 'plan', 'como', 'esta', 'estan', 'pasar', 'puedes', 'puede',
  'sabe', 'sabes', 'saber', 'cuanto', 'scuanto', 'gana', 'ganan', 'cobra', 'cobran',
  'sueldo', 'salario', 'base', 'mensual', 'monto', 'tienes', 'acceso', 'ese', 'esa',
  'su', 'sus', 'ficha', 'tengo', 'tiene', 'tienen', 'es', 'son', 'me', 'mi',
  'ella', 'ellas', 'ello', 'ellos',
])

const extractPersonTerms = (message: string) => {
  const text = normalizeText(message)
  const terms = new Set<string>()

  const matchByPreposition = text.match(/\b(?:de|del|para|a)\s+([a-z0-9\s]{2,})/)
  const raw = (matchByPreposition?.[1] || '').trim()

  if (raw) {
    raw
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 3 && !CONTEXT_STOP_WORDS.has(part))
      .forEach((part) => terms.add(part))
  }

  text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !CONTEXT_STOP_WORDS.has(part) && !/^\d+$/.test(part))
    .forEach((part) => terms.add(part))

  return Array.from(terms)
}

const messageLooksPersonalReference = (message: string) => {
  const text = normalizeText(message)
  const hasPossessivePronounRef = /\b(su|sus)\b/.test(text)
  const hasDirectPronounRef = /\b(ella|ellas|ello|ellos)\b/.test(text) || /\by\s+el\b/.test(text)
  const hasPronounRef = hasPossessivePronounRef || hasDirectPronounRef
  const asksPersonalData = hasAny(text, [
    'sueldo',
    'salario',
    'nomina',
    'gana',
    'cobra',
    'pago movil',
    'datos bancarios',
    'cuenta bancaria',
    'banco',
  ])

  return hasPronounRef && asksPersonalData
}

const fetchRecentConversationUserMessages = async (conversationId: string, userId: string) => {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return [] as string[]

  const conv = await supabase
    .from('app_ai_conversations')
    .select('id, user_id, deleted_at')
    .eq('id', conversationId)
    .maybeSingle()

  if (conv.error || !conv.data || conv.data.deleted_at || conv.data.user_id !== userId) {
    return [] as string[]
  }

  const messages = await supabase
    .from('app_ai_messages')
    .select('content, role, created_at')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(12)

  if (messages.error) return [] as string[]

  return ((messages.data as Array<{ content?: string | null }> | null) ?? [])
    .map((row) => String(row.content || '').trim())
    .filter((content) => content.length > 0)
}

const contextualizePersonalReference = async (message: string, conversationId: string, userId: string) => {
  if (!messageLooksPersonalReference(message)) {
    return {
      resolvedMessage: message,
      resolvedTerms: [] as string[],
    }
  }

  const explicitTerms = extractPersonTerms(message)
  if (explicitTerms.length > 0) {
    return {
      resolvedMessage: message,
      resolvedTerms: explicitTerms,
    }
  }

  const previousMessages = await fetchRecentConversationUserMessages(conversationId, userId)
  for (const previous of previousMessages) {
    const looksPersonal = hasAny(normalizeText(previous), [
      'pago movil',
      'datos bancarios',
      'cuenta bancaria',
      'banco',
      'sueldo',
      'salario',
      'nomina',
      'gana',
      'cobra',
      'personal',
    ])

    if (!looksPersonal) continue

    const previousTerms = extractPersonTerms(previous)
    if (previousTerms.length === 0) continue

    return {
      resolvedMessage: `${message} de ${previousTerms.join(' ')}`,
      resolvedTerms: previousTerms,
    }
  }

  return {
    resolvedMessage: message,
    resolvedTerms: [] as string[],
  }
}

const isGreetingOnlyMessage = (message: string) => {
  const text = normalizeText(message)
  if (!text) return false

  const greetings = new Set([
    'hola',
    'buenas',
    'buenos dias',
    'buenas tardes',
    'buenas noches',
    'hello',
    'hi',
  ])

  return greetings.has(text)
}

const buildGreetingReply = (allowedDomains: string[]) => {
  if (allowedDomains.length === 0) {
    return `Hola, soy ${AGENT_NAME}. Puedo ayudarte con todo lo relacionado con la administración de la Academia de Ajedrez. ¿Sobre qué quieres consultar hoy?`
  }

  return `Hola, soy ${AGENT_NAME}. Puedo ayudarte con ${allowedDomains.join(', ')} dentro de tus permisos. ¿Qué necesitas revisar?`
}

export async function POST(request: Request) {
  let payload: { message?: unknown; providerHint?: unknown; conversationId?: unknown } = {}

  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido (JSON requerido)' }, { status: 400 })
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (!message) {
    return Response.json({ error: 'El campo message es obligatorio' }, { status: 400 })
  }

  const providerHint = normalizeProviderHint(payload.providerHint)
  const requestedConversationId = typeof payload.conversationId === 'string' && payload.conversationId.trim()
    ? payload.conversationId.trim()
    : undefined

  const resolvedUser = await resolveAgentUserFromRequest(request)
  if (!resolvedUser.ok) {
    return Response.json({
      status: 'error',
      error: resolvedUser.message,
      config: getAgentConfigStatus(),
    }, { status: resolvedUser.status })
  }

  const { userId, roleCode } = resolvedUser.data
  const allowedDomains = getAllowedDomainsForRole(roleCode)

  const conversation = await ensureAgentConversation({
    requestedConversationId,
    userId,
    providerMode: providerHint || getAgentConfigStatus().mode,
  })

  const conversationId = conversation.conversationId
  const persistenceNotes: string[] = [...conversation.notes]

  const contextualized = await contextualizePersonalReference(message, conversationId, userId)
  const messageForProcessing = contextualized.resolvedMessage

  const isGreetingMessage = isGreetingOnlyMessage(message)
  const detectedDomain = isGreetingMessage ? 'reportes' : detectDomainFromMessage(messageForProcessing)

  const userMessagePersist = await appendAgentMessage({
    conversationId,
    role: 'user',
    content: message,
    meta: {
      roleCode,
      detectedDomain,
      messageForProcessing: messageForProcessing !== message ? messageForProcessing : undefined,
      contextualPersonTerms: contextualized.resolvedTerms,
    },
  })

  if (!userMessagePersist.persisted && userMessagePersist.note) {
    persistenceNotes.push(userMessagePersist.note)
  }

  if (isGreetingMessage) {
    const greetingReply = buildGreetingReply(allowedDomains)

    const greetingPersist = await appendAgentMessage({
      conversationId,
      role: 'assistant',
      content: greetingReply,
      meta: {
        status: 'ok',
        detectedDomain,
        toolName: 'greeting',
        providerUsed: providerHint || getAgentConfigStatus().mode,
        providerSource: 'fallback',
      },
    })

    if (!greetingPersist.persisted && greetingPersist.note) {
      persistenceNotes.push(greetingPersist.note)
    }

    return Response.json({
      status: 'ok',
      reply: greetingReply,
      providerUsed: providerHint || getAgentConfigStatus().mode,
      conversationId,
      roleCodeResolved: roleCode,
      allowedDomains,
      notes: persistenceNotes,
      config: getAgentConfigStatus(),
    }, { status: 200 })
  }

  if (!canAccessDomain(roleCode, detectedDomain)) {
    const blockedReply = `Tu rol (${roleCode}) no tiene acceso al dominio ${detectedDomain}.`

    const blockedPersist = await appendAgentMessage({
      conversationId,
      role: 'assistant',
      content: blockedReply,
      meta: {
        status: 'blocked',
        detectedDomain,
      },
    })

    if (!blockedPersist.persisted && blockedPersist.note) {
      persistenceNotes.push(blockedPersist.note)
    }

    return Response.json({
      status: 'blocked',
      reply: blockedReply,
      providerUsed: providerHint || getAgentConfigStatus().mode,
      conversationId,
      roleCodeResolved: roleCode,
      allowedDomains,
      detectedDomain,
      notes: [
        ...persistenceNotes,
        'Solicita acceso a este dominio o realiza una consulta dentro de tus dominios permitidos.',
      ],
      config: getAgentConfigStatus(),
    }, { status: 403 })
  }

  try {
    const toolResult = await runAgentToolForDomain(detectedDomain, messageForProcessing)
    const providerResult = await runProviderResponse({
      userMessage: message,
      toolSummary: toolResult.summary,
      domain: detectedDomain,
      toolStatus: toolResult.status,
    }, providerHint)

    const assistantReply = toolResult.status === 'ok' ? providerResult.text : toolResult.summary

    const statusCode = toolResult.status === 'error' ? 500 : 200

    const assistantMessage = await appendAgentMessage({
      conversationId,
      role: 'assistant',
      content: assistantReply,
      meta: {
        status: toolResult.status,
        detectedDomain,
        toolName: toolResult.toolName,
        providerUsed: providerResult.providerUsed,
        providerSource: providerResult.source,
      },
    })

    if (!assistantMessage.persisted && assistantMessage.note) {
      persistenceNotes.push(assistantMessage.note)
    }

    const toolPersist = await appendAgentToolCall({
      messageId: assistantMessage.messageId,
      toolName: toolResult.toolName,
      args: {
        domain: detectedDomain,
      },
      resultSummary: toolResult.summary,
      status: toolResult.status === 'ok' ? 'ok' : 'error',
    })

    if (!toolPersist.persisted && toolPersist.note) {
      persistenceNotes.push(toolPersist.note)
    }

    const responseNotes = [
      ...persistenceNotes,
      ...(toolResult.status === 'error' ? (toolResult.notes || []) : []),
      ...(providerResult.source === 'fallback' ? (providerResult.notes || []) : []),
    ]

    return Response.json({
      status: toolResult.status,
      reply: assistantReply,
      providerUsed: providerResult.providerUsed,
      conversationId,
      roleCodeResolved: roleCode,
      allowedDomains,
      detectedDomain,
      toolName: toolResult.toolName,
      notes: responseNotes,
      config: getAgentConfigStatus(),
    }, { status: statusCode })
  } catch (error) {
    const errorMessage = error instanceof Error && error.message ? error.message : 'No se pudo resolver proveedor del agente'

    const errorPersist = await appendAgentMessage({
      conversationId,
      role: 'assistant',
      content: `❌ ${errorMessage}`,
      meta: {
        status: 'error',
        detectedDomain,
      },
    })

    if (!errorPersist.persisted && errorPersist.note) {
      persistenceNotes.push(errorPersist.note)
    }

    return Response.json({
      status: 'error',
      reply: `❌ ${errorMessage}`,
      error: errorMessage,
      providerUsed: providerHint || getAgentConfigStatus().mode,
      conversationId,
      roleCodeResolved: roleCode,
      allowedDomains,
      detectedDomain,
      notes: persistenceNotes,
      config: getAgentConfigStatus(),
    }, { status: 503 })
  }
}
