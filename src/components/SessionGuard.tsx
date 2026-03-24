'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AppActivityTracker from '@/components/AppActivityTracker'

type RoleCode = 'admin' | 'operativo' | 'consulta' | 'gestion_personal' | 'operador'

type AccessRule = {
  type: 'exact' | 'prefix'
  path: string
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

const ROLE_HOME_ROUTE: Record<RoleCode, string> = {
  admin: '/gestion',
  operativo: '/gestion',
  consulta: '/reportes',
  gestion_personal: '/gestion',
  operador: '/gestion',
}

const ROLE_ACCESS_RULES: Record<RoleCode, AccessRule[]> = {
  admin: [
    { type: 'prefix', path: '/gestion' },
    { type: 'prefix', path: '/operaciones' },
    { type: 'prefix', path: '/reportes' },
  ],
  operativo: [
    { type: 'exact', path: '/gestion' },
    { type: 'prefix', path: '/gestion/socios/agente' },
    { type: 'prefix', path: '/operaciones' },
  ],
  consulta: [
    { type: 'prefix', path: '/reportes' },
  ],
  gestion_personal: [
    { type: 'exact', path: '/gestion' },
    { type: 'prefix', path: '/gestion/socios/agente' },
    { type: 'prefix', path: '/gestion/personal' },
  ],
  operador: [
    { type: 'prefix', path: '/gestion' },
    { type: 'prefix', path: '/operaciones' },
    { type: 'prefix', path: '/reportes' },
  ],
}

const normalizeRoleCode = (value?: string | null): RoleCode => {
  if (value === 'operativo' || value === 'consulta' || value === 'admin' || value === 'gestion_personal' || value === 'operador') {
    return value
  }

  return 'admin'
}

const matchAccessRule = (pathname: string, rule: AccessRule) => {
  if (rule.type === 'exact') {
    return pathname === rule.path || pathname === `${rule.path}/`
  }

  return pathname === rule.path || pathname.startsWith(`${rule.path}/`)
}

const rutaPorRol = (roleCode: RoleCode) => ROLE_HOME_ROUTE[roleCode]

const tieneAccesoRuta = (roleCode: RoleCode, pathname: string) => {
  return ROLE_ACCESS_RULES[roleCode].some((rule) => matchAccessRule(pathname, rule))
}

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [validando, setValidando] = useState(true)
  const [errorSesion, setErrorSesion] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true

    const validar = async () => {
      setErrorSesion('')
      setValidando(true)

      try {
        const { data, error } = await supabase.auth.getSession()
        if (!activo) return

        if (error) {
          setErrorSesion(error.message)
          setValidando(false)
          return
        }

        if (!data.session) {
          router.replace('/')
          return
        }

        const userId = data.session.user.id
        const { data: rol, error: rolError } = await supabase
          .from('user_roles')
          .select('role_code')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .maybeSingle()

        if (!activo) return

        if (rolError) {
          setErrorSesion(rolError.message)
          setValidando(false)
          return
        }

        const roleCode = normalizeRoleCode(rol?.role_code)
        const rutaEsperada = rutaPorRol(roleCode)

        if (!tieneAccesoRuta(roleCode, pathname)) {
          router.replace(rutaEsperada)
          return
        }

        setValidando(false)
      } catch (error) {
        if (!activo) return
        setErrorSesion(getErrorMessage(error, 'No se pudo validar la sesión. Revisa tu conexión.'))
        setValidando(false)
      }
    }

    void validar()

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/')
      }
    })

    return () => {
      activo = false
      listener.subscription.unsubscribe()
    }
  }, [router, pathname, intento])

  if (errorSesion) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-red-700">Error de sesión</p>
          <p className="mt-2 text-sm font-bold text-red-700">{errorSesion}</p>
          <button
            type="button"
            onClick={() => setIntento(prev => prev + 1)}
            className="mt-4 bg-white border border-red-200 text-red-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (validando) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-gray-500">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
          <Loader2 className="animate-spin" size={16} />
          Validando sesión...
        </div>
      </div>
    )
  }

  return (
    <>
      <AppActivityTracker />
      {children}
    </>
  )
}
