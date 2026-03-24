'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Loader2, LogOut } from 'lucide-react'
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
    <div className="relative min-h-[80vh] overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 text-center md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <section className="relative mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="w-full rounded-[2.8rem] border border-gray-200/80 bg-white/95 px-6 py-10 shadow-2xl backdrop-blur md:px-14 md:py-14">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              href="/gestion"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a gestión
            </Link>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              disabled={cerrandoSesion}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cerrandoSesion ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Cerrar sesión
            </button>
          </div>

          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-3xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-300/40 md:p-5">
              <Image
                src="/logo_ana.jpg"
                alt="Academia Nacional de Ajedrez"
                width={320}
                height={320}
                className="h-auto w-44 object-contain md:w-56"
                priority
              />
            </div>
          </div>

          <p className="mx-auto inline-flex rounded-full border border-gray-300 bg-gray-50 px-4 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-gray-500 md:text-sm">
            {anoEscolar}
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-black md:text-6xl">Operaciones</h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 md:text-lg">
            Módulo de ingresos y egresos. Selecciona la sección para comenzar.
          </p>

          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/operaciones/ingresos"
              className="rounded-2xl bg-black px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-900"
            >
              Ingresos
            </Link>
            <Link
              href="/operaciones/egresos"
              className="rounded-2xl border border-gray-300 bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-gray-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black hover:text-black"
            >
              Egresos
            </Link>
          </div>

          {errorSesion && (
            <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-700">
              {errorSesion}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
