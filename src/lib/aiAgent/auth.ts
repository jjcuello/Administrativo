import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import type { AgentRoleCode } from './types'

type ResolvedAgentUser = {
  userId: string
  email: string | null
  roleCode: AgentRoleCode
}

type ResolveAgentUserResult =
  | { ok: true; data: ResolvedAgentUser }
  | { ok: false; status: number; message: string }

const normalizeRoleCode = (value?: string | null): AgentRoleCode => {
  if (value === 'admin' || value === 'operativo' || value === 'consulta' || value === 'gestion_personal' || value === 'operador') {
    return value
  }

  return 'consulta'
}

const getBearerToken = (request: Request) => {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return ''

  return authHeader.slice(7).trim()
}

export const resolveAgentUserFromRequest = async (request: Request): Promise<ResolveAgentUserResult> => {
  const token = getBearerToken(request)
  if (!token) {
    return {
      ok: false,
      status: 401,
      message: 'Falta token de sesión (Authorization: Bearer ...).',
    }
  }

  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    return {
      ok: false,
      status: 503,
      message: 'No hay cliente server de Supabase disponible. Configura SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) {
    return {
      ok: false,
      status: 401,
      message: userError?.message || 'Token inválido o sesión expirada.',
    }
  }

  const userId = userData.user.id

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role_code')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (roleError) {
    return {
      ok: false,
      status: 500,
      message: `No se pudo resolver rol del usuario: ${roleError.message}`,
    }
  }

  return {
    ok: true,
    data: {
      userId,
      email: userData.user.email || null,
      roleCode: normalizeRoleCode(roleData?.role_code),
    },
  }
}
