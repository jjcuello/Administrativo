'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bot, ChevronDown, SendHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type RoleCode = 'admin' | 'operativo' | 'consulta' | 'gestion_personal' | 'operador'
type UiMessageRole = 'user' | 'assistant'

type UiMessage = {
  id: string
  role: UiMessageRole
  content: string
}

type AgentHealthStatus = {
  mode: 'gemini' | 'local' | 'hybrid'
  hasGemini: boolean
  geminiModel: string
  hasLocal: boolean
  hasServiceRole: boolean
  readyProvider: boolean
  readyForData: boolean
  ready: boolean
}

const normalizeRoleCode = (value?: string | null): RoleCode => {
  if (value === 'admin' || value === 'operativo' || value === 'consulta' || value === 'gestion_personal' || value === 'operador') {
    return value
  }

  return 'consulta'
}

const createClientId = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createMessage = (role: UiMessageRole, content: string): UiMessage => ({
  id: createClientId(),
  role,
  content,
})

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

const AGENT_NAME = 'Cristina 🤖'
const AGENT_WELCOME_MESSAGE = `Hola, mi nombre es ${AGENT_NAME}. Puedo ayudarte con todo lo relacionado con la administración de la Academia de Ajedrez.`

export default function GestionSociosAgentePage() {
  const router = useRouter()

  const [messages, setMessages] = useState<UiMessage[]>([
    createMessage('assistant', AGENT_WELCOME_MESSAGE),
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionToken, setSessionToken] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [mostrarDominios, setMostrarDominios] = useState(false)
  const [mostrarEstadoModulo, setMostrarEstadoModulo] = useState(false)
  const [roleCode, setRoleCode] = useState<RoleCode>('consulta')
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [errorSesion, setErrorSesion] = useState('')
  const [agentHealth, setAgentHealth] = useState<AgentHealthStatus | null>(null)
  const [cargandoHealth, setCargandoHealth] = useState(false)
  const [errorHealth, setErrorHealth] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let activo = true

    const cargarSesion = async () => {
      setCargandoSesion(true)
      setErrorSesion('')

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (!activo) return

      if (sessionError) {
        setErrorSesion(sessionError.message)
        setCargandoSesion(false)
        return
      }

      const session = sessionData.session
      if (!session) {
        router.replace('/')
        return
      }

      setSessionToken(session.access_token)

      const { data: rolData } = await supabase
        .from('user_roles')
        .select('role_code')
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!activo) return

      const normalized = normalizeRoleCode(rolData?.role_code)
      setRoleCode(normalized)
      setCargandoSesion(false)
    }

    void cargarSesion()

    return () => {
      activo = false
    }
  }, [router])

  useEffect(() => {
    let activo = true

    const cargarHealth = async () => {
      setCargandoHealth(true)
      setErrorHealth('')

      try {
        const response = await fetch('/api/agente/health')
        const data = await response.json().catch(() => null)
        if (!activo) return

        if (!response.ok || !data?.status) {
          setErrorHealth('No se pudo leer estado del módulo de agente.')
          setCargandoHealth(false)
          return
        }

        setAgentHealth(data.status as AgentHealthStatus)
      } catch {
        if (!activo) return
        setErrorHealth('No se pudo consultar /api/agente/health')
      } finally {
        if (activo) setCargandoHealth(false)
      }
    }

    void cargarHealth()

    return () => {
      activo = false
    }
  }, [])

  const faltaServiceRole = agentHealth ? !agentHealth.hasServiceRole : false

  const canSend = useMemo(() => {
    return !cargandoSesion && !!sessionToken && !sending && input.trim().length > 0 && !faltaServiceRole
  }, [cargandoSesion, sessionToken, sending, input, faltaServiceRole])

  const enviar = async () => {
    const message = input.trim()
    if (!message || !canSend) return

    setInput('')
    setSending(true)
    setMessages(prev => [...prev, createMessage('user', message)])

    try {
      const response = await fetch('/api/agente/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          message,
          conversationId,
        }),
      })

      const data = await response.json().catch(() => null)
      const reply = typeof data?.reply === 'string'
        ? data.reply
        : typeof data?.error === 'string'
          ? `❌ ${data.error}`
          : '❌ No fue posible procesar la solicitud del agente.'

      const responseStatus = typeof data?.status === 'string' ? data.status : 'ok'
      const notes = asStringArray(data?.notes)
      const notesVisibles = responseStatus === 'ok'
        ? notes.filter((note) => note.startsWith('⚠️'))
        : notes

      const respuestaConNotas = notesVisibles.length > 0
        ? `${reply}\n\n${notesVisibles.map(note => `• ${note}`).join('\n')}`
        : reply

      if (typeof data?.conversationId === 'string' && data.conversationId.trim()) {
        setConversationId(data.conversationId)
      }

      setAllowedDomains(asStringArray(data?.allowedDomains))
      setMessages(prev => [...prev, createMessage('assistant', respuestaConNotas)])
    } catch {
      setMessages(prev => [...prev, createMessage('assistant', '❌ Error de red al conectar con el agente.')])
    } finally {
      setSending(false)
    }
  }

  const manejarEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void enviar()
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 p-6 md:p-10">
      <div className="mx-auto w-full max-w-5xl rounded-[2.5rem] border border-gray-200/80 bg-white p-6 shadow-xl md:p-8">
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/gestion/socios')}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a socios
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
              <Bot size={14} /> {AGENT_NAME}
            </div>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
            Rol: {roleCode}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 text-[10px] text-gray-500">
          <button
            type="button"
            onClick={() => setMostrarDominios(prev => !prev)}
            className="inline-flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left font-black uppercase tracking-[0.12em] text-gray-600 transition-all hover:border-black hover:text-black"
            aria-expanded={mostrarDominios}
            aria-controls="dominios-habilitados"
          >
            <span>Dominios habilitados</span>
            <ChevronDown size={14} className={`transition-transform ${mostrarDominios ? 'rotate-180' : ''}`} />
          </button>
          {mostrarDominios && (
            <div id="dominios-habilitados" className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px]">
              {allowedDomains.length > 0 ? allowedDomains.join(' · ') : 'Aún sin respuesta del agente'}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMostrarEstadoModulo(prev => !prev)}
            className="mt-3 inline-flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-left font-black uppercase tracking-[0.12em] text-gray-600 transition-all hover:border-black hover:text-black"
            aria-expanded={mostrarEstadoModulo}
            aria-controls="estado-modulo"
          >
            <span>Estado módulo</span>
            <ChevronDown size={14} className={`transition-transform ${mostrarEstadoModulo ? 'rotate-180' : ''}`} />
          </button>

          {mostrarEstadoModulo && (
            <div id="estado-modulo" className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px]">
              <p>Asistente: {AGENT_NAME} (femenino)</p>
              {cargandoHealth && <p className="mt-1 text-gray-400">Verificando configuración...</p>}
              {!cargandoHealth && agentHealth && (
                <>
                  <p className="mt-1">Modo: {agentHealth.mode}</p>
                  <p className="mt-1">Data backend: {agentHealth.hasServiceRole ? '✅ lista' : '❌ falta SUPABASE_SERVICE_ROLE_KEY'}</p>
                  <p className="mt-1">Gemini: {agentHealth.hasGemini ? `✅ ${agentHealth.geminiModel}` : '⚠️ no configurado'}</p>
                  <p className="mt-1">Local: {agentHealth.hasLocal ? '✅ configurado' : '⚠️ no configurado'}</p>
                </>
              )}
              {faltaServiceRole && (
                <p className="mt-2 text-red-600">❌ Configura SUPABASE_SERVICE_ROLE_KEY en .env.local y reinicia npm run dev.</p>
              )}
              {conversationId && <p className="mt-2 text-[9px] text-gray-400">Conversación: {conversationId}</p>}
              {errorSesion && <p className="mt-2 text-red-600">❌ {errorSesion}</p>}
              {errorHealth && <p className="mt-2 text-red-600">❌ {errorHealth}</p>}
            </div>
          )}
        </div>

        <div className="mt-4 h-[50vh] space-y-3 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'ml-auto bg-black text-white' : 'bg-gray-100 text-black'}`}>
              {msg.content}
            </div>
          ))}

          {sending && (
            <div className="inline-flex items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
              <span className="font-semibold text-gray-500">{AGENT_NAME} está escribiendo</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={manejarEnter}
            placeholder="Ej: ¿Cuál fue el total de ingresos de 2026-03?"
            className="h-24 w-full resize-none rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm font-medium text-black outline-none focus:border-black"
            disabled={cargandoSesion || sending}
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={!canSend}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal size={14} /> Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
