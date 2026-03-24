import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const READ_ONLY_ROLE_CODES = new Set(['operador'])
const ROLE_CACHE_TTL_MS = 60_000

let supabaseClientRef: SupabaseClient | null = null
let roleCache: { userId: string; roleCode: string | null; expiresAt: number } | null = null
let rolePromise: Promise<string | null> | null = null

const getRequestMethod = (input: RequestInfo | URL, init?: RequestInit) => {
  const initMethod = (init?.method || '').trim()
  if (initMethod) return initMethod.toUpperCase()

  if (input instanceof Request) {
    return input.method.toUpperCase()
  }

  return 'GET'
}

const getRequestUrl = (input: RequestInfo | URL) => {
  try {
    if (typeof input === 'string') return new URL(input)
    if (input instanceof URL) return input
    if (input instanceof Request) return new URL(input.url)
    return null
  } catch {
    return null
  }
}

const isWriteMethod = (method: string) => !['GET', 'HEAD', 'OPTIONS'].includes(method)

const isWriteEndpoint = (pathname: string) => {
  return pathname.includes('/rest/v1/') || pathname.includes('/storage/v1/object')
}

const buildReadOnlyResponse = () => {
  return new Response(
    JSON.stringify({
      message: 'Modo solo lectura: tu rol no permite operaciones de escritura.',
      hint: 'Solicita a un administrador permisos de edición si necesitas guardar cambios.',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

const getCurrentRoleCode = async () => {
  if (!supabaseClientRef) return null

  const { data: sessionData, error: sessionError } = await supabaseClientRef.auth.getSession()
  if (sessionError || !sessionData.session?.user?.id) return null

  const userId = sessionData.session.user.id
  const now = Date.now()

  if (roleCache && roleCache.userId === userId && roleCache.expiresAt > now) {
    return roleCache.roleCode
  }

  if (!rolePromise) {
    rolePromise = (async () => {
      const { data: roleData, error: roleError } = await supabaseClientRef!
        .from('user_roles')
        .select('role_code')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle()

      const roleCode = roleError ? null : (typeof roleData?.role_code === 'string' ? roleData.role_code : null)

      roleCache = {
        userId,
        roleCode,
        expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
      }

      return roleCode
    })().finally(() => {
      rolePromise = null
    })
  }

  return rolePromise
}

const guardedFetch: typeof fetch = async (input, init) => {
  const method = getRequestMethod(input, init)
  const url = getRequestUrl(input)

  if (!url || !isWriteMethod(method) || !isWriteEndpoint(url.pathname)) {
    return fetch(input, init)
  }

  const roleCode = await getCurrentRoleCode()
  if (roleCode && READ_ONLY_ROLE_CODES.has(roleCode)) {
    return buildReadOnlyResponse()
  }

  return fetch(input, init)
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Error: Faltan las variables de entorno en .env.local")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: guardedFetch,
  },
})

supabaseClientRef = supabase
