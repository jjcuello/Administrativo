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

    const { error } = await supabase.from('app_user_activity_logs').insert(payload)
    if (error) {
      const errorText = getErrorText(error).toLowerCase()
      const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : ''

      if (errorText.includes('app_user_activity_logs') || code === '42P01' || code === '42501') {
        trackerEnabledRef.current = false
      }
      return
    }

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
