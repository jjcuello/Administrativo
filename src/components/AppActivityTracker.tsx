'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ActivityEventType = 'page_view' | 'heartbeat'

type TrackerUser = {
  id: string
  email: string | null
  roleCode: string | null
}

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000
const HEARTBEAT_MIN_GAP_MS = 60 * 1000
const TRACKER_STATUS_STORAGE_KEY = 'app_activity_tracker_status'

type TrackerStatus = {
  enabled: boolean
  disabledReason: string | null
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  lastEventType: ActivityEventType | null
  lastRoute: string | null
}

const createInitialTrackerStatus = (): TrackerStatus => ({
  enabled: true,
  disabledReason: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  lastEventType: null,
  lastRoute: null,
})

const getErrorText = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

export default function AppActivityTracker() {
  const pathname = usePathname()
  const routeRef = useRef(pathname || '/')
  const userRef = useRef<TrackerUser | null>(null)
  const sessionIdRef = useRef('')
  const trackerEnabledRef = useRef(true)
  const initializedRef = useRef(false)
  const lastHeartbeatRef = useRef(0)
  const trackerStatusRef = useRef<TrackerStatus>(createInitialTrackerStatus())

  const publicarEstadoTracker = (nextStatus: TrackerStatus) => {
    trackerStatusRef.current = nextStatus

    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(TRACKER_STATUS_STORAGE_KEY, JSON.stringify(nextStatus))
    } catch {
      // Ignore storage errors and keep tracker running.
    }

    try {
      window.dispatchEvent(new CustomEvent('app-activity-tracker-status', { detail: nextStatus }))
    } catch {
      // Ignore dispatch errors.
    }
  }

  const actualizarEstadoTracker = (patch: Partial<TrackerStatus>) => {
    publicarEstadoTracker({
      ...trackerStatusRef.current,
      ...patch,
    })
  }

  const registrarEvento = async (eventType: ActivityEventType, route: string, forceHeartbeat = false) => {
    if (!trackerEnabledRef.current) return

    const user = userRef.current
    if (!user?.id) return

    if (eventType === 'heartbeat' && !forceHeartbeat) {
      const now = Date.now()
      if (now - lastHeartbeatRef.current < HEARTBEAT_MIN_GAP_MS) return
    }

    const payload = {
      user_id: user.id,
      user_email: user.email,
      role_code: user.roleCode,
      route,
      event_type: eventType,
      session_id: sessionIdRef.current,
      client_ts: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }

    actualizarEstadoTracker({
      enabled: trackerEnabledRef.current,
      lastAttemptAt: new Date().toISOString(),
      lastEventType: eventType,
      lastRoute: route,
    })

    const { error } = await supabase.from('app_user_activity_logs').insert(payload)
    if (error) {
      const errorText = getErrorText(error).toLowerCase()
      const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : ''

      const rawMessage = getErrorText(error) || 'Error desconocido al registrar actividad'
      console.warn('[activity-tracker] insert failed', { code, message: rawMessage, route, eventType })

      actualizarEstadoTracker({
        enabled: trackerEnabledRef.current,
        lastErrorCode: code || null,
        lastErrorMessage: rawMessage,
      })

      if (errorText.includes('app_user_activity_logs') || code === '42P01' || code === '42501') {
        trackerEnabledRef.current = false
        actualizarEstadoTracker({
          enabled: false,
          disabledReason: code === '42501' ? 'PERMISSION_DENIED' : 'TABLE_OR_POLICY_MISSING',
        })
      }
      return
    }

    actualizarEstadoTracker({
      enabled: true,
      disabledReason: null,
      lastSuccessAt: new Date().toISOString(),
      lastErrorCode: null,
      lastErrorMessage: null,
    })

    if (eventType === 'heartbeat') {
      lastHeartbeatRef.current = Date.now()
    }
  }

  useEffect(() => {
    routeRef.current = pathname || '/'
  }, [pathname])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    sessionIdRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    let activo = true

    const iniciar = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (!activo) return
      if (userError || !userData.user) return

      let roleCode: string | null = null
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role_code')
        .eq('user_id', userData.user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!activo) return
      if (roleData?.role_code && typeof roleData.role_code === 'string') {
        roleCode = roleData.role_code
      }

      userRef.current = {
        id: userData.user.id,
        email: userData.user.email ?? null,
        roleCode,
      }

      await registrarEvento('page_view', routeRef.current, true)
    }

    void iniciar()

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (!userRef.current) return
    void registrarEvento('page_view', pathname || '/', true)
  }, [pathname])

  useEffect(() => {
    publicarEstadoTracker(createInitialTrackerStatus())

    const enviarHeartbeat = () => {
      if (!trackerEnabledRef.current) return
      if (typeof document !== 'undefined' && document.hidden) return
      void registrarEvento('heartbeat', routeRef.current)
    }

    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void registrarEvento('heartbeat', routeRef.current, true)
    }

    const onFocus = () => {
      void registrarEvento('heartbeat', routeRef.current, true)
    }

    const intervalId = window.setInterval(enviarHeartbeat, HEARTBEAT_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}
