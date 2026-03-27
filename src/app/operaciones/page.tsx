'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Loader2, LogOut, Landmark, CalendarClock, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const getAnoEscolar = (fecha: Date) => {
  const year = fecha.getFullYear()
  const month = fecha.getMonth()
  const inicio = month >= 8 ? year : year - 1
  const fin = inicio + 1

  return `Año escolar ${inicio} - ${fin}`
}

const getErrorText = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return 'No se pudo cerrar la sesión'
}

export default function OperacionesHome() {
  const router = useRouter()
  const [anoEscolar] = useState(() => getAnoEscolar(new Date()))
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const [errorSesion, setErrorSesion] = useState('')

  const cerrarSesion = async () => {
    setErrorSesion('')
    setCerrandoSesion(true)

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        setErrorSesion(getErrorText(error))
        return
      }

      router.replace('/')
    } finally {
      setCerrandoSesion(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

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
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Módulo operativo</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-black md:text-5xl">Operaciones</h1>
              <p className="mt-4 max-w-2xl text-base text-gray-600">Gestiona ingresos, egresos y horarios de la academia desde un único panel.</p>
              <p className="mt-2 inline-flex rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                {anoEscolar}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/gestion"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a gestión
            </Link>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              disabled={cerrandoSesion}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cerrandoSesion ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Cerrar sesión
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href="/operaciones/ingresos"
            className="group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
          >
            <Wallet size={32} strokeWidth={1.5} className="mb-6 text-black transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Ingresos</h2>
            <p className="text-sm text-gray-500">Registro y control de entradas por categoría y cuenta.</p>
          </Link>

          <Link
            href="/operaciones/egresos"
            className="group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
          >
            <Landmark size={32} strokeWidth={1.5} className="mb-6 text-black transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Egresos</h2>
            <p className="text-sm text-gray-500">Pagos operativos, nómina y seguimiento de salidas.</p>
          </Link>

          <Link
            href="/operaciones/horarios"
            className="group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
          >
            <CalendarClock size={32} strokeWidth={1.5} className="mb-6 text-black transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Horarios</h2>
            <p className="text-sm text-gray-500">Acceso rápido a la planificación de grupos y personal.</p>
          </Link>
        </div>

        {errorSesion && (
          <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-700">
            {errorSesion}
          </p>
        )}
      </div>
    </div>
  )
}
