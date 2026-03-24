import http from 'node:http'

const port = Number(process.env.AI_LOCAL_PROVIDER_PORT || 5055)
const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b'
const timeoutMs = Number(process.env.AI_LOCAL_PROVIDER_TIMEOUT_MS || 20000)
const useOllama = (process.env.AI_LOCAL_PROVIDER_USE_OLLAMA || 'true').toLowerCase() !== 'false'

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const readJsonBody = async (req) => {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}

  return JSON.parse(raw)
}

const withTimeout = async (promiseFactory, ms) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)

  try {
    return await promiseFactory(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

const buildPrompt = (payload) => {
  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  const context = payload?.context && typeof payload.context === 'object' ? payload.context : {}
  const domain = typeof context.domain === 'string' ? context.domain : 'reportes'
  const toolStatus = typeof context.toolStatus === 'string' ? context.toolStatus : 'ok'
  const toolSummary = typeof context.toolSummary === 'string' ? context.toolSummary : ''

  return [
    'Eres un analista interno de la organización.',
    'Responde SIEMPRE en español y de forma ejecutiva (máximo 6 líneas).',
    'Usa SOLO la evidencia suministrada en toolSummary; no inventes cifras.',
    'Si toolStatus es error, explica claramente qué falta para responder mejor.',
    '',
    `Dominio: ${domain}`,
    `Estado tool: ${toolStatus}`,
    '',
    'Pregunta usuario:',
    message || '(sin pregunta)',
    '',
    'Evidencia tool:',
    toolSummary || '(sin evidencia)',
  ].join('\n')
}

const askOllama = async (prompt) => {
  const endpoint = `${ollamaUrl.replace(/\/$/, '')}/api/generate`

  const response = await withTimeout(async (signal) => {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
        },
      }),
      signal,
    })
  }, timeoutMs)

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}`)
  }

  const text = payload && typeof payload === 'object' && typeof payload.response === 'string'
    ? payload.response.trim()
    : ''

  if (!text) {
    throw new Error('Ollama no devolvió texto')
  }

  return text
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, {
        ok: true,
        provider: 'local-adapter',
        useOllama,
        ollamaUrl,
        ollamaModel,
        timeoutMs,
        timestamp: new Date().toISOString(),
      })
    }

    if (req.method !== 'POST' || req.url !== '/generate') {
      return sendJson(res, 404, { error: 'Not found' })
    }

    const payload = await readJsonBody(req)
    const prompt = buildPrompt(payload)

    if (!useOllama) {
      const fallback = payload?.context?.toolSummary
      return sendJson(res, 200, {
        reply: typeof fallback === 'string' && fallback.trim()
          ? fallback
          : 'Proveedor local en modo stub. Activa AI_LOCAL_PROVIDER_USE_OLLAMA=true para inferencia real.',
      })
    }

    const reply = await askOllama(prompt)
    return sendJson(res, 200, { reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return sendJson(res, 500, { error: message })
  }
})

server.listen(port, () => {
  console.log(`[ai-local-provider] listening on http://localhost:${port}`)
  console.log(`[ai-local-provider] mode=${useOllama ? 'ollama' : 'stub'} model=${ollamaModel}`)
})
