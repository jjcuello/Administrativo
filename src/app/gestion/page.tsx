'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { UserCog, Users, Truck, Landmark, Wallet, BadgeDollarSign, ArrowLeft, ShieldAlert, Bot } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type RoleCode = 'admin' | 'operativo' | 'consulta' | 'gestion_personal' | 'operador'

export default function GestionDashboard() {
  const router = useRouter()
  const [roleCode, setRoleCode] = useState<RoleCode>('admin')
  const [cargandoRol, setCargandoRol] = useState(true)
  const [mostrarToastSinAcceso, setMostrarToastSinAcceso] = useState(false)
  const [toastActivo, setToastActivo] = useState(false)
  const toastSinAccesoTimeoutRef = useRef<number | null>(null)
  const toastDesmontarTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let activo = true

    const cargarRol = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (!activo) return

        if (userError || !userData.user) {
          setRoleCode('admin')
          return
        }

        const { data: rolData } = await supabase
          .from('user_roles')
          .select('role_code')
          .eq('user_id', userData.user.id)
          .is('deleted_at', null)
          .maybeSingle()

        if (!activo) return

        const nextRole = rolData?.role_code
        if (nextRole === 'admin' || nextRole === 'operativo' || nextRole === 'consulta' || nextRole === 'gestion_personal' || nextRole === 'operador') {
          setRoleCode(nextRole)
        } else {
          setRoleCode('admin')
        }
      } finally {
        if (activo) {
          setCargandoRol(false)
        }
      }
    }

    void cargarRol()

    return () => {
      activo = false
    }
  }, [])

  const esOperativo = roleCode === 'operativo'
  const esGestionPersonal = roleCode === 'gestion_personal'
  const esOperador = roleCode === 'operador'
  const puedeGestionPersonal = roleCode === 'admin' || roleCode === 'gestion_personal' || esOperador
  const puedeGestionClientes = roleCode === 'admin' || esOperador
  const puedeGestionProveedores = roleCode === 'admin' || roleCode === 'gestion_personal' || esOperador
  const puedeGestionNomina = roleCode === 'admin' || esOperador
  const puedeGestionSocios = roleCode === 'admin' || esOperador
  const puedeGestionOperaciones = roleCode === 'admin' || roleCode === 'operativo' || esOperador
  const puedeGestionAgente = roleCode === 'admin' || roleCode === 'operativo' || roleCode === 'gestion_personal' || esOperador
  const mostrarAgenteEnGestion = puedeGestionAgente && !puedeGestionSocios

  const volverAlInicio = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/')
  }

  useEffect(() => {
    return () => {
      if (toastSinAccesoTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(toastSinAccesoTimeoutRef.current)
      }
      if (toastDesmontarTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(toastDesmontarTimeoutRef.current)
      }
    }
  }, [])

  const mostrarToastSinPermiso = () => {
    if (typeof window === 'undefined') return

    if (toastSinAccesoTimeoutRef.current) {
      window.clearTimeout(toastSinAccesoTimeoutRef.current)
    }
    if (toastDesmontarTimeoutRef.current) {
      window.clearTimeout(toastDesmontarTimeoutRef.current)
    }

    setMostrarToastSinAcceso(true)
    window.requestAnimationFrame(() => {
      setToastActivo(true)
    })

    toastSinAccesoTimeoutRef.current = window.setTimeout(() => {
      setToastActivo(false)
      toastSinAccesoTimeoutRef.current = null

      toastDesmontarTimeoutRef.current = window.setTimeout(() => {
        setMostrarToastSinAcceso(false)
        toastDesmontarTimeoutRef.current = null
      }, 220)
    }, 2200)
  }

  const alertarSinAcceso = () => {
    if (typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AudioContextClass) {
          const ctx = new AudioContextClass()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.setValueAtTime(640, ctx.currentTime)
          gain.gain.setValueAtTime(0.0001, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 0.2)

          window.setTimeout(() => {
            void ctx.close()
          }, 250)
        }
      } catch {}

      mostrarToastSinPermiso()
    }
  }

  const abrirModulo = (puedeAcceder: boolean, ruta: string) => {
    if (cargandoRol) return
    if (!puedeAcceder) {
      alertarSinAcceso()
      return
    }

    router.push(ruta)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      {mostrarToastSinAcceso && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-red-800 shadow-xl transition-all duration-200 ${toastActivo
            ? 'translate-y-0 opacity-100'
            : 'translate-y-2 opacity-0'
          }`}
        >
          <ShieldAlert size={14} />
          No tienes permiso para entrar a este módulo.
        </div>
      )}

      <div className="relative mx-auto w-full max-w-6xl rounded-[2.8rem] border border-gray-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-12">
        <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              <Image
                src="/logo_ana.jpg"
                alt="Academia Nacional de Ajedrez"
                width={96}
                height={96}
                className="h-auto w-14 object-contain md:w-16"
                priority
              />
            </div>

            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Módulo de configuración</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-black md:text-5xl">Gestión</h1>
              <p className="mt-4 max-w-2xl text-base text-gray-600">Administra las entidades y actores principales de la Academia.</p>
              {esOperativo && !cargandoRol && (
                <p className="mt-2 max-w-2xl text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                  Modo operativo: solo Operaciones habilitado.
                </p>
              )}
              {esGestionPersonal && !cargandoRol && (
                <p className="mt-2 max-w-2xl text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                  Modo gestión personal: Manejo del Personal y Proveedores habilitados.
                </p>
              )}
              {esOperador && !cargandoRol && (
                <p className="mt-2 max-w-2xl text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                  Modo operador: acceso global en solo lectura.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => void volverAlInicio()}
            className="inline-flex items-center gap-2 self-start rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
          >
            <ArrowLeft size={16} /> Cerrar sesión
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <button
            onClick={() => abrirModulo(puedeGestionPersonal, '/gestion/personal')}
            disabled={cargandoRol}
            className={`group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm ${puedeGestionPersonal && !cargandoRol
              ? 'transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl'
              : 'cursor-not-allowed opacity-55'
            }`}
          >
            <UserCog size={32} strokeWidth={1.5} className={`mb-6 text-black ${puedeGestionPersonal && !cargandoRol ? 'transition-transform group-hover:scale-110' : ''}`} />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Manejo del Personal</h2>
            <p className="text-sm text-gray-500">Profesores y personal administrativo</p>
          </button>

          <button
            onClick={() => abrirModulo(puedeGestionClientes, '/gestion/clientes')}
            disabled={cargandoRol}
            className={`group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm ${puedeGestionClientes && !cargandoRol
              ? 'transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl'
              : 'cursor-not-allowed opacity-55'
            }`}
          >
            <Users size={32} strokeWidth={1.5} className={`mb-6 text-black ${puedeGestionClientes && !cargandoRol ? 'transition-transform group-hover:scale-110' : ''}`} />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Clientes</h2>
            <p className="text-sm text-gray-500">Colegios, clubes, alumnos y virtuales</p>
          </button>

          <button
            onClick={() => abrirModulo(puedeGestionProveedores, '/gestion/proveedores')}
            disabled={cargandoRol}
            className={`group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm ${puedeGestionProveedores && !cargandoRol
              ? 'transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl'
              : 'cursor-not-allowed opacity-55'
            }`}
          >
            <Truck size={32} strokeWidth={1.5} className={`mb-6 text-black ${puedeGestionProveedores && !cargandoRol ? 'transition-transform group-hover:scale-110' : ''}`} />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Proveedores</h2>
            <p className="text-sm text-gray-500">Cantina y suministros</p>
          </button>

          <button
            onClick={() => abrirModulo(puedeGestionSocios, '/gestion/socios')}
            disabled={cargandoRol}
            className={`group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm ${puedeGestionSocios && !cargandoRol
              ? 'transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl'
              : 'cursor-not-allowed opacity-55'
            }`}
          >
            <Landmark size={32} strokeWidth={1.5} className={`mb-6 text-black ${puedeGestionSocios && !cargandoRol ? 'transition-transform group-hover:scale-110' : ''}`} />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Socios</h2>
            <p className="text-sm text-gray-500">Capital y utilidades de gerencia</p>
          </button>

          <button
            onClick={() => abrirModulo(puedeGestionOperaciones, '/operaciones')}
            disabled={cargandoRol}
            className={`group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm ${puedeGestionOperaciones && !cargandoRol
              ? 'transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl'
              : 'cursor-not-allowed opacity-55'
            }`}
          >
            <Wallet size={32} strokeWidth={1.5} className={`mb-6 text-black ${puedeGestionOperaciones && !cargandoRol ? 'transition-transform group-hover:scale-110' : ''}`} />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Operaciones</h2>
            <p className="text-sm text-gray-500">Gestión de operaciones académicas</p>
          </button>

          <button
            onClick={() => abrirModulo(puedeGestionNomina, '/gestion/nomina')}
            disabled={cargandoRol}
            className={`group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm ${puedeGestionNomina && !cargandoRol
              ? 'transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl'
              : 'cursor-not-allowed opacity-55'
            }`}
          >
            <BadgeDollarSign size={32} strokeWidth={1.5} className={`mb-6 text-black ${puedeGestionNomina && !cargandoRol ? 'transition-transform group-hover:scale-110' : ''}`} />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Nómina</h2>
            <p className="text-sm text-gray-500">Nómina mensual de empleados</p>
          </button>

          {mostrarAgenteEnGestion && (
            <button
              onClick={() => abrirModulo(puedeGestionAgente, '/gestion/socios/agente')}
              disabled={cargandoRol}
              className={`group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm ${puedeGestionAgente && !cargandoRol
                ? 'transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl'
                : 'cursor-not-allowed opacity-55'
              }`}
            >
              <Bot size={32} strokeWidth={1.5} className={`mb-6 text-black ${puedeGestionAgente && !cargandoRol ? 'transition-transform group-hover:scale-110' : ''}`} />
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Agente IA</h2>
              <p className="text-sm text-gray-500">Consultas internas sobre personal, nómina e indicadores financieros</p>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
