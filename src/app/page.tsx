'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [enviandoReset, setEnviandoReset] = useState(false)

  const redirigirPorRol = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        return
      }

      const { data: rol } = await supabase
        .from('user_roles')
        .select('role_code')
        .eq('user_id', data.user.id)
        .is('deleted_at', null)
        .maybeSingle()

      const roleCode = rol?.role_code || 'admin'
      if (roleCode === 'operativo') {
        router.replace('/gestion')
        return
      }
      if (roleCode === 'operador') {
        router.replace('/gestion')
        return
      }
      if (roleCode === 'consulta') {
        router.replace('/reportes')
        return
      }
      router.replace('/gestion')
    } catch (error) {
      setMensaje(`❌ ${getErrorMessage(error, 'No se pudo validar la sesión. Revisa tu conexión.')}`)
    }
  }, [router])

  useEffect(() => {
    const validarSesion = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          setMensaje(`❌ ${error.message}`)
          return
        }

        if (data.session) {
          await redirigirPorRol()
        }
      } catch (error) {
        setMensaje(`❌ ${getErrorMessage(error, 'No se pudo conectar con el servidor de autenticación.')}`)
      }
    }
    void validarSesion()
  }, [redirigirPorRol])

  const iniciarSesion = async (e: FormEvent) => {
    e.preventDefault()
    setMensaje('')

    if (!email.trim() || !password.trim()) {
      setMensaje('❌ Debes ingresar correo y contraseña')
      return
    }

    setCargando(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setMensaje(`❌ ${error.message}`)
        return
      }

      setMensaje('✅ Sesión iniciada')
      await redirigirPorRol()
    } catch (error) {
      setMensaje(`❌ ${getErrorMessage(error, 'No se pudo iniciar sesión. Revisa tu conexión.')}`)
    } finally {
      setCargando(false)
    }
  }

  const recuperarClave = async () => {
    setMensaje('')
    if (!email.trim()) {
      setMensaje('❌ Ingresa tu correo para recuperar la contraseña')
      return
    }

    setEnviandoReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      })

      if (error) {
        setMensaje(`❌ ${error.message}`)
      } else {
        setMensaje('✅ Te enviamos un correo para restablecer la contraseña')
      }
    } catch (error) {
      setMensaje(`❌ ${getErrorMessage(error, 'No se pudo enviar el correo de recuperación. Revisa tu conexión.')}`)
    } finally {
      setEnviandoReset(false)
    }
  }

  return (
    <div className="relative min-h-[90vh] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#f4f2ed_0%,_#ffffff_52%,_#f1f4f7_100%)]" />
      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,_#f1d7a8_0%,_#ffffff_70%)] opacity-70" />
      <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,_#cfd9e6_0%,_#ffffff_70%)] opacity-70" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center px-6 py-12 md:px-12">
        <section className="text-center lg:text-left">
          <div className="mb-6 flex justify-center lg:justify-start">
            <Link
              href="/propuesta"
              className="inline-flex items-center rounded-full border border-black/15 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-600 transition hover:border-black hover:text-black"
            >
              Ver propuesta web institucional
            </Link>
          </div>

          <div className="mb-6 flex justify-center lg:justify-start">
            <Image
              src="/logo_ana.jpg"
              alt="Academia Nacional de Ajedrez"
              width={240}
              height={240}
              className="w-48 md:w-60 h-auto object-contain drop-shadow-sm"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[10px] uppercase tracking-[0.3em] font-black text-gray-500">
            Plataforma administrativa
            <span className="h-1.5 w-1.5 rounded-full bg-black" />
            Fundacion ANA
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tighter text-black leading-tight">
            Entrar al sistema
          </h1>

          <p className="mt-4 text-gray-600 text-base md:text-lg max-w-xl font-medium">
            Control operativo, academico y contable en un solo panel.
            Listo para migrar toda la operacion sin perder trazabilidad.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Operacion</p>
              <p className="text-sm font-black text-black">Ingresos y egresos centralizados</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Academico</p>
              <p className="text-sm font-black text-black">Alumnos, grupos y sedes sincronizados</p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Reportes</p>
              <p className="text-sm font-black text-black">Indicadores listos para auditoria</p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl mx-auto lg:mx-0 lg:justify-self-end">
          <form onSubmit={iniciarSesion} className="bg-white/95 backdrop-blur border border-black/5 rounded-[2.5rem] p-8 md:p-10 shadow-[0_25px_80px_-40px_rgba(15,23,42,0.55)] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tight">Acceso</h2>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Seguro</span>
            </div>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Correo</span>
              <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <Mail size={16} className="text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@fundacion.org"
                  className="w-full bg-transparent outline-none text-sm font-bold text-black"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Contrasena</span>
              <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <Lock size={16} className="text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-transparent outline-none text-sm font-bold text-black"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-60"
            >
              {cargando ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
              Entrar al sistema
            </button>

            <button
              type="button"
              disabled={enviandoReset}
              onClick={recuperarClave}
              className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl font-black uppercase tracking-wide flex items-center justify-center gap-2 hover:border-black hover:text-black transition-all disabled:opacity-60"
            >
              {enviandoReset ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
              Recuperar contrasena
            </button>

            {mensaje && (
              <p className={`text-center text-[10px] p-3 rounded-xl font-black ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {mensaje}
              </p>
            )}

          </form>
        </section>
      </div>
    </div>
  )
}
