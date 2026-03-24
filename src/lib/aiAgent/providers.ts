import { agentRuntimeConfig } from './config'
import type { AgentDomain, AgentProviderMode } from './types'

type ProviderResultSource = 'model' | 'fallback'

type ProviderRequestContext = {
  userMessage: string
  toolSummary: string
  domain: AgentDomain
  toolStatus: 'ok' | 'error'
}

type ProviderReply = {
  providerUsed: AgentProviderMode
  text: string
  notes?: string[]
  source: ProviderResultSource
}

type GeminiApiError = {
  statusCode: number
  code?: number
  status?: string
  message: string
}

type GeminiAttemptResult =
  | {
    ok: true
    model: string
    text: string
  }
  | {
    ok: false
    model: string
    error: GeminiApiError
  }

const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
]

const normalizeGeminiModelName = (value: string) => value.replace(/^models\//, '').trim()

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>()
  const normalized: string[] = []

  values.forEach((item) => {
    const value = item.trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    normalized.push(value)
  })

  return normalized
}

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const parseGeminiText = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return ''

  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) return ''

  const first = candidates[0] as { content?: { parts?: Array<{ text?: string }> } }
  const parts = first.content?.parts
  if (!Array.isArray(parts)) return ''

  const text = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()

  return text
}

const parseGeminiApiError = (payload: unknown, statusCode: number): GeminiApiError => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const errorPayload = (payload as {
      error?: {
        code?: unknown
        status?: unknown
        message?: unknown
      }
    }).error

    return {
      statusCode,
      code: typeof errorPayload?.code === 'number' ? errorPayload.code : undefined,
      status: typeof errorPayload?.status === 'string' ? errorPayload.status : undefined,
      message: typeof errorPayload?.message === 'string' ? errorPayload.message : `HTTP ${statusCode}`,
    }
  }

  return {
    statusCode,
    message: `HTTP ${statusCode}`,
  }
}

const isGeminiModelNotFound = (error: GeminiApiError) => {
  const message = error.message.toLowerCase()
  return error.statusCode === 404
    || error.code === 404
    || error.status === 'NOT_FOUND'
    || (message.includes('not found') && message.includes('model'))
}

const buildGeminiModelCandidates = () => uniqueStrings([
  normalizeGeminiModelName(agentRuntimeConfig.geminiModel),
  ...GEMINI_FALLBACK_MODELS.map(normalizeGeminiModelName),
])

const requestGeminiWithModel = async (model: string, prompt: string): Promise<GeminiAttemptResult> => {
  const normalizedModel = normalizeGeminiModelName(model)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${encodeURIComponent(agentRuntimeConfig.geminiApiKey)}`

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
    }, agentRuntimeConfig.timeoutMs)

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        ok: false,
        model: normalizedModel,
        error: parseGeminiApiError(payload, response.status),
      }
    }

    const text = parseGeminiText(payload)
    if (!text) {
      return {
        ok: false,
        model: normalizedModel,
        error: {
          statusCode: 502,
          status: 'EMPTY_TEXT',
          message: 'Gemini no devolvió texto utilizable.',
        },
      }
    }

    return {
      ok: true,
      model: normalizedModel,
      text,
    }
  } catch (error) {
    return {
      ok: false,
      model: normalizedModel,
      error: {
        statusCode: 503,
        status: 'UNAVAILABLE',
        message: error instanceof Error && error.message ? error.message : 'error desconocido',
      },
    }
  }
}

const listGeminiGenerateContentModels = async () => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(agentRuntimeConfig.geminiApiKey)}`

  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, agentRuntimeConfig.timeoutMs)
    if (!response.ok) return []

    const payload: unknown = await response.json().catch(() => null)
    if (!payload || typeof payload !== 'object') return []

    const models = (payload as {
      models?: Array<{
        name?: unknown
        supportedGenerationMethods?: unknown
      }>
    }).models

    if (!Array.isArray(models)) return []

    const candidates = models
      .filter((model) => {
        if (!Array.isArray(model.supportedGenerationMethods)) return false
        return model.supportedGenerationMethods.includes('generateContent')
      })
      .map((model) => (typeof model.name === 'string' ? normalizeGeminiModelName(model.name) : ''))
      .filter((name) => name.startsWith('gemini'))

    return uniqueStrings(candidates)
  } catch {
    return []
  }
}

const buildFallbackText = (context: ProviderRequestContext) => {
  return context.toolSummary
}

const buildGeminiPrompt = (context: ProviderRequestContext) => {
  return [
    'Eres Cristina 🤖, asistente virtual interna de la Academia de Ajedrez.',
    'Tu identidad es femenina y te comunicas en primera persona con tono profesional y cercano.',
    'Responde SIEMPRE en español.',
    'Usa únicamente la evidencia suministrada por la herramienta; no inventes cifras.',
    'Si la herramienta reporta error, explica de forma clara y breve cómo proceder.',
    'No incluyas JSON ni detalles técnicos de infraestructura.',
    'Entrega la respuesta en formato ejecutivo, máximo 6 líneas.',
    '',
    `Dominio: ${context.domain}`,
    `Estado de herramienta: ${context.toolStatus}`,
    '',
    'Pregunta del usuario:',
    context.userMessage,
    '',
    'Evidencia de la herramienta:',
    context.toolSummary,
  ].join('\n')
}

const completeWithGemini = async (context: ProviderRequestContext): Promise<ProviderReply> => {
  if (!agentRuntimeConfig.geminiApiKey) {
    return {
      providerUsed: 'gemini',
      text: buildFallbackText(context),
      notes: ['⚠️ Gemini no está configurado; se devolvió respuesta directa de datos.'],
      source: 'fallback',
    }
  }

  const prompt = buildGeminiPrompt(context)

  const configuredModel = normalizeGeminiModelName(agentRuntimeConfig.geminiModel)
  const attemptedModels = new Set<string>()
  let lastError: GeminiApiError | undefined

  const runCandidates = async (candidates: string[]): Promise<ProviderReply | null> => {
    for (const candidate of candidates) {
      const model = normalizeGeminiModelName(candidate)
      if (!model || attemptedModels.has(model)) continue

      attemptedModels.add(model)
      const result = await requestGeminiWithModel(model, prompt)

      if (result.ok) {
        return {
          providerUsed: 'gemini',
          text: result.text,
          notes: model !== configuredModel ? [`⚠️ Se usó modelo alternativo de Gemini: ${model}.`] : undefined,
          source: 'model',
        }
      }

      lastError = result.error
      if (!isGeminiModelNotFound(lastError)) {
        break
      }
    }

    return null
  }

  const initialSuccess = await runCandidates(buildGeminiModelCandidates())
  if (initialSuccess) return initialSuccess

  if (lastError && isGeminiModelNotFound(lastError)) {
    const discoveredSuccess = await runCandidates(await listGeminiGenerateContentModels())
    if (discoveredSuccess) return discoveredSuccess

    return {
      providerUsed: 'gemini',
      text: buildFallbackText(context),
      notes: ['⚠️ El modelo Gemini configurado no está disponible; se devolvió respuesta directa de datos.'],
      source: 'fallback',
    }
  }

  return {
    providerUsed: 'gemini',
    text: buildFallbackText(context),
    notes: ['⚠️ Gemini no estuvo disponible temporalmente; se devolvió respuesta directa de datos.'],
    source: 'fallback',
  }
}

const completeWithLocal = async (context: ProviderRequestContext): Promise<ProviderReply> => {
  if (!agentRuntimeConfig.localProviderUrl) {
    return {
      providerUsed: 'local',
      text: buildFallbackText(context),
      notes: ['⚠️ Proveedor local no configurado; se devolvió respuesta directa de datos.'],
      source: 'fallback',
    }
  }

  try {
    const response = await fetchWithTimeout(agentRuntimeConfig.localProviderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: context.userMessage,
        context: {
          domain: context.domain,
          toolStatus: context.toolStatus,
          toolSummary: context.toolSummary,
        },
      }),
    }, agentRuntimeConfig.timeoutMs)

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        providerUsed: 'local',
        text: buildFallbackText(context),
        notes: ['⚠️ Proveedor local no respondió correctamente; se devolvió respuesta directa de datos.'],
        source: 'fallback',
      }
    }

    let text = ''
    if (payload && typeof payload === 'object') {
      const candidate = (payload as { text?: unknown; reply?: unknown; output?: unknown })
      if (typeof candidate.text === 'string') text = candidate.text.trim()
      else if (typeof candidate.reply === 'string') text = candidate.reply.trim()
      else if (typeof candidate.output === 'string') text = candidate.output.trim()
    }

    if (!text) {
      return {
        providerUsed: 'local',
        text: buildFallbackText(context),
        notes: ['⚠️ Proveedor local no devolvió texto utilizable; se devolvió respuesta directa de datos.'],
        source: 'fallback',
      }
    }

    return {
      providerUsed: 'local',
      text,
      source: 'model',
    }
  } catch (error) {
    return {
      providerUsed: 'local',
      text: buildFallbackText(context),
      notes: ['⚠️ Proveedor local no disponible temporalmente; se devolvió respuesta directa de datos.'],
      source: 'fallback',
    }
  }
}

export const runProviderResponse = async (
  context: ProviderRequestContext,
  providerHint?: AgentProviderMode,
): Promise<ProviderReply> => {
  const target = providerHint || agentRuntimeConfig.mode

  if (target === 'gemini') {
    return completeWithGemini(context)
  }

  if (target === 'local') {
    return completeWithLocal(context)
  }

  if (agentRuntimeConfig.geminiApiKey) {
    const geminiResult = await completeWithGemini(context)
    if (geminiResult.source === 'model') {
      return geminiResult
    }

    if (agentRuntimeConfig.localProviderUrl) {
      const localResult = await completeWithLocal(context)
      if (localResult.source === 'model') {
        return {
          ...localResult,
          providerUsed: 'hybrid',
          notes: [...(geminiResult.notes || []), ...(localResult.notes || [])],
        }
      }

      return {
        providerUsed: 'hybrid',
        text: buildFallbackText(context),
        notes: [...(geminiResult.notes || []), ...(localResult.notes || [])],
        source: 'fallback',
      }
    }

    return geminiResult
  }

  if (agentRuntimeConfig.localProviderUrl) {
    return completeWithLocal(context)
  }

  return {
    providerUsed: 'hybrid',
    text: buildFallbackText(context),
    notes: ['⚠️ No hay proveedor LLM activo; se devolvió respuesta directa de datos.'],
    source: 'fallback',
  }
}

export const runProviderBootstrapResponse = async (
  prompt: string,
  providerHint?: AgentProviderMode,
) => runProviderResponse({
  userMessage: prompt,
  toolSummary: prompt,
  domain: 'reportes',
  toolStatus: 'ok',
}, providerHint)
