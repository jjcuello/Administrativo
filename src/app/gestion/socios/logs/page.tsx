'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, ArrowLeft, Clock3, Gauge, RefreshCcw, Users, CalendarCheck2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ActivityRow = {
  user_id: string
  user_email: string | null
  role_code: string | null
  route: string
  event_type: 'page_view' | 'heartbeat'
  session_id: string | null
  created_at: string
  client_ts: string | null
}

type DailyActivity = {
  day: string
  hours: number
  events: number
  pageViews: number
}

type UserSummary = {
  userId: string
  email: string | null
  roleCode: string | null
  activeDays: number
  activeHours: number
  avgHoursPerDay: number
  totalEvents: number
  pageViews: number
  intensity: 'ALTO' | 'MEDIO' | 'BAJO'
  firstSeenAt: number
  lastSeenAt: number
  connectedDays: string[]
  daily: DailyActivity[]
  topRoutes: Array<{ route: string; count: number }>
}

type ActivityFetchResult = {
  rows: ActivityRow[]
  error: string
  notice: string
}

type TrackerDiagnostics = {
  enabled: boolean
  disabledReason: string | null
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  lastEventType: 'page_view' | 'heartbeat' | null
  lastRoute: string | null
}

const PERIOD_OPTIONS = [
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
]

const BUCKET_MINUTES = 5
const MAX_ROWS = 5000
const TRACKER_STATUS_STORAGE_KEY = 'app_activity_tracker_status'
const LIVE_ONLINE_MINUTES = 15
const LIVE_IDLE_MINUTES = 60

const round1 = (value: number) => Math.round(value * 10) / 10

const formatDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateShort = (ymd: string) => {
  const parsed = new Date(`${ymd}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ymd
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short' }).format(parsed)
}

const formatDateTime = (value: number) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const getUserLabel = (user: Pick<UserSummary, 'email' | 'userId'>) => {
  if (user.email && user.email.trim()) return user.email
  return `usuario-${user.userId.slice(0, 8)}`
}

const getErrorText = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return 'No se pudo cargar la actividad.'
}

const csvEscape = (value: string | number | null | undefined) => {
  const raw = value == null ? '' : String(value)
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

const downloadCsv = (filename: string, rows: string[][]) => {
  if (typeof window === 'undefined') return
  const csv = rows.map((line) => line.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const getLiveStatus = (lastSeenAt: number, nowTs: number) => {
  const diffMinutes = Math.max(0, Math.round((nowTs - lastSeenAt) / 60000))

  if (diffMinutes <= LIVE_ONLINE_MINUTES) {
    return { label: 'ACTIVO', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700', borderClass: 'border-emerald-200 bg-emerald-50' }
  }

  if (diffMinutes <= LIVE_IDLE_MINUTES) {
    return { label: 'INACTIVO RECIENTE', dotClass: 'bg-amber-500', textClass: 'text-amber-700', borderClass: 'border-amber-200 bg-amber-50' }
  }

  return { label: 'DESCONECTADO', dotClass: 'bg-gray-400', textClass: 'text-gray-600', borderClass: 'border-gray-200 bg-gray-50' }
}

export default function SociosLogsPage() {
  const router = useRouter()
  const [periodDays, setPeriodDays] = useState(30)
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset')
  const [customFromDate, setCustomFromDate] = useState(() => formatDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
  const [customToDate, setCustomToDate] = useState(() => formatDateInput(new Date()))
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [manualSelectedUserId, setManualSelectedUserId] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [userFilter, setUserFilter] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [trackerDiagnostics, setTrackerDiagnostics] = useState<TrackerDiagnostics | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => setNowTs(Date.now()), 60 * 1000)
    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    const parseTrackerDiagnostics = (value: string | null) => {
      if (!value) return null

      try {
        const parsed = JSON.parse(value) as Partial<TrackerDiagnostics>
        return {
          enabled: parsed.enabled !== false,
          disabledReason: typeof parsed.disabledReason === 'string' ? parsed.disabledReason : null,
          lastAttemptAt: typeof parsed.lastAttemptAt === 'string' ? parsed.lastAttemptAt : null,
          lastSuccessAt: typeof parsed.lastSuccessAt === 'string' ? parsed.lastSuccessAt : null,
          lastErrorCode: typeof parsed.lastErrorCode === 'string' ? parsed.lastErrorCode : null,
          lastErrorMessage: typeof parsed.lastErrorMessage === 'string' ? parsed.lastErrorMessage : null,
          lastEventType: parsed.lastEventType === 'page_view' || parsed.lastEventType === 'heartbeat' ? parsed.lastEventType : null,
          lastRoute: typeof parsed.lastRoute === 'string' ? parsed.lastRoute : null,
        }
      } catch {
        return null
      }
    }

    const syncTrackerDiagnostics = () => {
      if (typeof window === 'undefined') return
      setTrackerDiagnostics(parseTrackerDiagnostics(window.localStorage.getItem(TRACKER_STATUS_STORAGE_KEY)))
    }

    syncTrackerDiagnostics()

    const onStatus = () => syncTrackerDiagnostics()
    const onStorage = (event: StorageEvent) => {
      if (event.key === TRACKER_STATUS_STORAGE_KEY) syncTrackerDiagnostics()
    }

    window.addEventListener('app-activity-tracker-status', onStatus)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('app-activity-tracker-status', onStatus)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const consultarActividad = useCallback(async (): Promise<ActivityFetchResult> => {
    let fromDate: string
    let toDate: string

    if (rangeMode === 'custom') {
      if (!customFromDate || !customToDate) {
        return {
          rows: [],
          error: 'Define fecha inicial y final para el rango personalizado.',
          notice: '',
        }
      }

      if (customFromDate > customToDate) {
        return {
          rows: [],
          error: 'La fecha inicial no puede ser mayor que la fecha final.',
          notice: '',
        }
      }

      fromDate = `${customFromDate}T00:00:00.000Z`
      toDate = `${customToDate}T23:59:59.999Z`
    } else {
      fromDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
      toDate = new Date().toISOString()
    }

    const { data, error: queryError, count } = await supabase
      .from('app_user_activity_logs')
      .select('user_id, user_email, role_code, route, event_type, session_id, created_at, client_ts', { count: 'exact' })
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    if (queryError) {
      const text = getErrorText(queryError)
      if (text.toLowerCase().includes('app_user_activity_logs') || text.includes('42P01')) {
        return {
          rows: [],
          error: 'Falta la tabla de actividad. Ejecuta la migración v31 para habilitar Log\'s.',
          notice: '',
        }
      } else {
        return {
          rows: [],
          error: text,
          notice: '',
        }
      }
    }

    const parsedRows = (data as ActivityRow[] | null) ?? []
    let nextNotice = ''

    if ((count || 0) > MAX_ROWS) {
      nextNotice = `Mostrando ${MAX_ROWS.toLocaleString('es-VE')} de ${(count || 0).toLocaleString('es-VE')} eventos en el rango.`
    } else if (parsedRows.length === 0) {
      nextNotice = 'No hay actividad registrada para este período.'
    }

    return {
      rows: parsedRows,
      error: '',
      notice: nextNotice,
    }
  }, [customFromDate, customToDate, periodDays, rangeMode])

  const aplicarResultado = (result: ActivityFetchResult) => {
    setRows(result.rows)
    setError(result.error)
    setNotice(result.notice)
  }

  const cargarActividad = useCallback(async () => {
    setLoading(true)
    const result = await consultarActividad()
    aplicarResultado(result)
    setLoading(false)
  }, [consultarActividad])

  useEffect(() => {
    let activo = true

    const cargarInicial = async () => {
      setLoading(true)
      const result = await consultarActividad()
      if (!activo) return
      aplicarResultado(result)
      setLoading(false)
    }

    void cargarInicial()

    return () => {
      activo = false
    }
  }, [consultarActividad])

  const { summaries, globalActiveDays } = useMemo(() => {
    type MutableSummary = {
      userId: string
      email: string | null
      roleCode: string | null
      firstSeenAt: number
      lastSeenAt: number
      totalEvents: number
      pageViews: number
      days: Set<string>
      bucketByDay: Map<string, Set<number>>
      eventsByDay: Map<string, number>
      pageViewsByDay: Map<string, number>
      routeCounts: Map<string, number>
    }

    const globalDaysSet = new Set<string>()
    const grouped = new Map<string, MutableSummary>()

    const ordered = [...rows].sort((a, b) => {
      const aTs = Date.parse(a.client_ts || a.created_at)
      const bTs = Date.parse(b.client_ts || b.created_at)
      return aTs - bTs
    })

    for (const row of ordered) {
      const ts = Date.parse(row.client_ts || row.created_at)
      if (!Number.isFinite(ts)) continue

      const day = new Date(ts).toISOString().slice(0, 10)
      globalDaysSet.add(day)

      const key = row.user_id
      const current = grouped.get(key) || {
        userId: key,
        email: row.user_email || null,
        roleCode: row.role_code || null,
        firstSeenAt: ts,
        lastSeenAt: ts,
        totalEvents: 0,
        pageViews: 0,
        days: new Set<string>(),
        bucketByDay: new Map<string, Set<number>>(),
        eventsByDay: new Map<string, number>(),
        pageViewsByDay: new Map<string, number>(),
        routeCounts: new Map<string, number>(),
      }

      current.days.add(day)
      current.totalEvents += 1
      current.firstSeenAt = Math.min(current.firstSeenAt, ts)
      current.lastSeenAt = Math.max(current.lastSeenAt, ts)

      const route = row.route || '/'
      current.routeCounts.set(route, (current.routeCounts.get(route) || 0) + 1)

      const bucket = Math.floor(ts / (BUCKET_MINUTES * 60 * 1000))
      const dayBuckets = current.bucketByDay.get(day) || new Set<number>()
      dayBuckets.add(bucket)
      current.bucketByDay.set(day, dayBuckets)

      current.eventsByDay.set(day, (current.eventsByDay.get(day) || 0) + 1)

      if (row.event_type === 'page_view') {
        current.pageViews += 1
        current.pageViewsByDay.set(day, (current.pageViewsByDay.get(day) || 0) + 1)
      }

      if (!grouped.has(key)) grouped.set(key, current)
    }

    const result: UserSummary[] = Array.from(grouped.values()).map((item) => {
      let activeMinutes = 0
      for (const dayBuckets of item.bucketByDay.values()) {
        activeMinutes += dayBuckets.size * BUCKET_MINUTES
      }

      const activeHours = round1(activeMinutes / 60)
      const activeDays = item.days.size
      const avgHoursPerDay = activeDays > 0 ? round1(activeHours / activeDays) : 0

      let intensity: UserSummary['intensity'] = 'BAJO'
      if (activeHours >= 20 || avgHoursPerDay >= 4) intensity = 'ALTO'
      else if (activeHours >= 8 || avgHoursPerDay >= 2) intensity = 'MEDIO'

      const connectedDays = Array.from(item.days).sort((a, b) => b.localeCompare(a))
      const daily = connectedDays.map((day) => {
        const dayMinutes = (item.bucketByDay.get(day)?.size || 0) * BUCKET_MINUTES
        return {
          day,
          hours: round1(dayMinutes / 60),
          events: item.eventsByDay.get(day) || 0,
          pageViews: item.pageViewsByDay.get(day) || 0,
        }
      })

      const topRoutes = Array.from(item.routeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([route, count]) => ({ route, count }))

      return {
        userId: item.userId,
        email: item.email,
        roleCode: item.roleCode,
        activeDays,
        activeHours,
        avgHoursPerDay,
        totalEvents: item.totalEvents,
        pageViews: item.pageViews,
        intensity,
        firstSeenAt: item.firstSeenAt,
        lastSeenAt: item.lastSeenAt,
        connectedDays,
        daily,
        topRoutes,
      }
    })

    result.sort((a, b) => b.activeHours - a.activeHours)

    return {
      summaries: result,
      globalActiveDays: globalDaysSet.size,
    }
  }, [rows])

  const roleOptions = useMemo(() => {
    const values = Array.from(new Set(summaries.map((item) => (item.roleCode || 'sin rol').toLowerCase())))
    values.sort((a, b) => a.localeCompare(b, 'es'))
    return values
  }, [summaries])

  const filteredSummaries = useMemo(() => {
    return summaries.filter((item) => {
      const roleValue = (item.roleCode || 'sin rol').toLowerCase()
      const roleOk = roleFilter === 'todos' || roleValue === roleFilter
      const userOk = userFilter === 'todos' || item.userId === userFilter
      return roleOk && userOk
    })
  }, [roleFilter, summaries, userFilter])

  const selectedUserId = useMemo(() => {
    if (!filteredSummaries.length) return ''
    const existeSeleccion = filteredSummaries.some((user) => user.userId === manualSelectedUserId)
    return existeSeleccion ? manualSelectedUserId : filteredSummaries[0].userId
  }, [filteredSummaries, manualSelectedUserId])

  const selectedUser = useMemo(() => {
    return filteredSummaries.find((item) => item.userId === selectedUserId) || filteredSummaries[0] || null
  }, [filteredSummaries, selectedUserId])

  const maxHours = useMemo(() => {
    if (!filteredSummaries.length) return 1
    return Math.max(...filteredSummaries.map((user) => user.activeHours), 1)
  }, [filteredSummaries])

  const dashboard = useMemo(() => {
    const totalUsers = filteredSummaries.length
    const totalHours = round1(filteredSummaries.reduce((acc, user) => acc + user.activeHours, 0))
    const totalPageViews = filteredSummaries.reduce((acc, user) => acc + user.pageViews, 0)
    const totalEvents = filteredSummaries.reduce((acc, user) => acc + user.totalEvents, 0)
    const avgHoursPerUser = totalUsers > 0 ? round1(totalHours / totalUsers) : 0

    return {
      totalUsers,
      totalHours,
      totalPageViews,
      totalEvents,
      totalActiveDays: totalUsers > 0 ? globalActiveDays : 0,
      avgHoursPerUser,
    }
  }, [filteredSummaries, globalActiveDays])

  const exportResumenCsv = () => {
    const rowsCsv: string[][] = [
      ['usuario_email', 'user_id', 'rol', 'estado_conexion', 'primera_actividad', 'ultima_actividad', 'dias_conectados', 'horas_activas', 'promedio_horas_dia', 'conexiones', 'eventos'],
      ...filteredSummaries.map((item) => {
        const live = getLiveStatus(item.lastSeenAt, nowTs)
        return [
          getUserLabel(item),
          item.userId,
          item.roleCode || 'sin rol',
          live.label,
          formatDateTime(item.firstSeenAt),
          formatDateTime(item.lastSeenAt),
          String(item.activeDays),
          String(item.activeHours),
          String(item.avgHoursPerDay),
          String(item.pageViews),
          String(item.totalEvents),
        ]
      }),
    ]

    downloadCsv('logs-resumen-usuarios.csv', rowsCsv)
  }

  const exportDetalleCsv = () => {
    const rowsCsv: string[][] = [
      ['usuario_email', 'user_id', 'rol', 'dia', 'horas_activas', 'conexiones', 'eventos'],
    ]

    for (const item of filteredSummaries) {
      for (const daily of item.daily) {
        rowsCsv.push([
          getUserLabel(item),
          item.userId,
          item.roleCode || 'sin rol',
          daily.day,
          String(daily.hours),
          String(daily.pageViews),
          String(daily.events),
        ])
      }
    }

    downloadCsv('logs-detalle-diario.csv', rowsCsv)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <section className="relative mx-auto w-full max-w-[1550px] rounded-[2.8rem] border border-gray-200/80 bg-white/95 p-8 shadow-2xl backdrop-blur md:p-12">
        <button
          onClick={() => router.push('/gestion/socios')}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:text-black"
        >
          <ArrowLeft size={14} /> Volver a socios
        </button>

        <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                <Activity size={12} /> Módulo Log&apos;s
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-black md:text-5xl">Actividad de usuarios</h1>
              <p className="mt-3 max-w-3xl text-base text-gray-600 md:text-lg">
                Monitorea días de conexión, horas activas estimadas y nivel de carga operativa por persona.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={rangeMode}
                onChange={(event) => setRangeMode(event.target.value as 'preset' | 'custom')}
                className="h-11 rounded-2xl border border-gray-300 bg-white px-4 text-sm font-black text-black shadow-sm"
              >
                <option value="preset">Rango rápido</option>
                <option value="custom">Rango personalizado</option>
              </select>

              {rangeMode === 'preset' && (
              <select
                value={periodDays}
                onChange={(event) => setPeriodDays(Number(event.target.value))}
                className="h-11 rounded-2xl border border-gray-300 bg-white px-4 text-sm font-black text-black shadow-sm"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              )}

              {rangeMode === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(event) => setCustomFromDate(event.target.value)}
                    className="h-11 rounded-2xl border border-gray-300 bg-white px-3 text-sm font-black text-black shadow-sm"
                  />
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(event) => setCustomToDate(event.target.value)}
                    className="h-11 rounded-2xl border border-gray-300 bg-white px-3 text-sm font-black text-black shadow-sm"
                  />
                </>
              )}

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-11 rounded-2xl border border-gray-300 bg-white px-4 text-sm font-black text-black shadow-sm"
              >
                <option value="todos">Todos los roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{role.toUpperCase()}</option>
                ))}
              </select>

              <select
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                className="h-11 rounded-2xl border border-gray-300 bg-white px-4 text-sm font-black text-black shadow-sm"
              >
                <option value="todos">Todos los usuarios</option>
                {summaries.map((item) => (
                  <option key={item.userId} value={item.userId}>{getUserLabel(item)}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={exportResumenCsv}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 text-[11px] font-black uppercase tracking-[0.12em] text-gray-700 shadow-sm transition-all hover:border-black hover:text-black"
              >
                CSV Resumen
              </button>

              <button
                type="button"
                onClick={exportDetalleCsv}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 text-[11px] font-black uppercase tracking-[0.12em] text-gray-700 shadow-sm transition-all hover:border-black hover:text-black"
              >
                CSV Diario
              </button>

              <button
                type="button"
                onClick={() => void cargarActividad()}
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-black bg-black px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-sm transition-all hover:bg-gray-900 disabled:opacity-60"
              >
                <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-red-700">
              ❌ {error}
            </p>
          )}

          {notice && !error && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-amber-700">
              ⚠️ {notice}
            </p>
          )}

          {!error && rows.length === 0 && trackerDiagnostics && trackerDiagnostics.lastErrorMessage && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-black tracking-[0.08em] text-red-700">
              <p className="uppercase">Tracker sin escritura en base de datos</p>
              <p className="mt-1 normal-case font-bold">{trackerDiagnostics.lastErrorMessage}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.1em]">
                Código: {trackerDiagnostics.lastErrorCode || 'N/A'}
                {' · '}
                Último intento: {trackerDiagnostics.lastAttemptAt ? formatDateTime(Date.parse(trackerDiagnostics.lastAttemptAt)) : 'N/A'}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Usuarios activos</p>
              <p className="mt-2 text-2xl font-black text-black">{dashboard.totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Días con conexión</p>
              <p className="mt-2 text-2xl font-black text-black">{dashboard.totalActiveDays}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Horas activas</p>
              <p className="mt-2 text-2xl font-black text-black">{dashboard.totalHours}h</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Promedio por usuario</p>
              <p className="mt-2 text-2xl font-black text-black">{dashboard.avgHoursPerUser}h</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Conexiones</p>
              <p className="mt-2 text-2xl font-black text-black">{dashboard.totalPageViews}</p>
            </div>
            <div className="rounded-2xl border border-black bg-black p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-300">Eventos</p>
              <p className="mt-2 text-2xl font-black text-white">{dashboard.totalEvents}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[420px_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-[0.12em] text-gray-600">Usuarios</h2>

              <div className="space-y-2">
                {filteredSummaries.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500">
                    Sin actividad para mostrar.
                  </div>
                )}

                {filteredSummaries.map((user) => {
                  const selected = selectedUser?.userId === user.userId
                  const widthPercent = Math.max(8, Math.round((user.activeHours / maxHours) * 100))
                  const live = getLiveStatus(user.lastSeenAt, nowTs)
                  return (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => setManualSelectedUserId(user.userId)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${selected ? 'border-black bg-black text-white shadow-lg' : 'border-gray-200 bg-white hover:border-black'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-black ${selected ? 'text-white' : 'text-black'}`}>{getUserLabel(user)}</p>
                          <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${selected ? 'text-gray-300' : 'text-gray-500'}`}>
                            {user.roleCode || 'sin rol'}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${selected ? 'bg-white text-black' : 'bg-gray-100 text-gray-600'}`}>
                          {user.intensity}
                        </span>
                      </div>

                      <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${live.borderClass} ${live.textClass}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${live.dotClass}`} />
                        {live.label}
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-[0.08em]">
                        <p className={selected ? 'text-gray-200' : 'text-gray-500'}>{user.activeDays} días</p>
                        <p className={selected ? 'text-gray-200' : 'text-gray-500'}>{user.activeHours}h</p>
                        <p className={selected ? 'text-gray-200' : 'text-gray-500'}>{user.pageViews} conex.</p>
                      </div>

                      <div className={`mt-3 h-2 rounded-full ${selected ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                          className={`h-full rounded-full ${selected ? 'bg-white' : 'bg-black'}`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              {!selectedUser && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Selecciona un usuario para ver detalle.
                </div>
              )}

              {selectedUser && (
                <>
                  {(() => {
                    const live = getLiveStatus(selectedUser.lastSeenAt, nowTs)
                    return (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black text-black">{getUserLabel(selectedUser)}</p>
                      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-500">{selectedUser.roleCode || 'sin rol asignado'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${live.borderClass} ${live.textClass}`}>
                        <span className={`inline-block h-2 w-2 rounded-full ${live.dotClass}`} /> {live.label}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-gray-600">
                        <Gauge size={12} /> Intensidad {selectedUser.intensity}
                      </div>
                    </div>
                  </div>
                    )
                  })()}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Días conectados</p>
                      <p className="mt-1 text-xl font-black text-black">{selectedUser.activeDays}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Horas activas</p>
                      <p className="mt-1 text-xl font-black text-black">{selectedUser.activeHours}h</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Promedio / día</p>
                      <p className="mt-1 text-xl font-black text-black">{selectedUser.avgHoursPerDay}h</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">Conexiones</p>
                      <p className="mt-1 text-xl font-black text-black">{selectedUser.pageViews}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                        <CalendarCheck2 size={13} /> Días de conexión
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.connectedDays.slice(0, 14).map((day) => (
                          <span key={day} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-gray-600">
                            {formatDateShort(day)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-gray-600">
                        <Users size={13} /> Rutas más usadas
                      </h3>
                      <div className="space-y-2">
                        {selectedUser.topRoutes.length === 0 && (
                          <p className="text-xs text-gray-500">Sin rutas registradas.</p>
                        )}
                        {selectedUser.topRoutes.map((item) => (
                          <div key={item.route} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-black">
                            <p className="truncate text-gray-700">{item.route}</p>
                            <p className="text-gray-500">{item.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Día</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Horas</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Eventos</th>
                          <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">Conexiones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.daily.slice(0, 20).map((day) => (
                          <tr key={day.day} className="border-t border-gray-200 bg-white">
                            <td className="px-3 py-2 text-xs font-black uppercase text-black">{formatDateShort(day.day)}</td>
                            <td className="px-3 py-2 text-right text-xs font-black text-black">{day.hours}h</td>
                            <td className="px-3 py-2 text-right text-xs font-black text-black">{day.events}</td>
                            <td className="px-3 py-2 text-right text-xs font-black text-black">{day.pageViews}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">
                        <Clock3 size={12} /> Primera actividad
                      </p>
                      <p className="mt-1 text-sm font-black text-black">{formatDateTime(selectedUser.firstSeenAt)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">
                        <Clock3 size={12} /> Última actividad
                      </p>
                      <p className="mt-1 text-sm font-black text-black">{formatDateTime(selectedUser.lastSeenAt)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
