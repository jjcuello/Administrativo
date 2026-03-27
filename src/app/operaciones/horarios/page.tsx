'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarClock } from 'lucide-react'

export default function OperacionesHorarios() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 p-4 md:p-6 uppercase tracking-tight font-black text-black">
      <div className="mx-auto w-full max-w-5xl rounded-[2.5rem] border border-gray-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-10">
        <header className="mb-8 text-black">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push('/operaciones')}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-[10px] text-gray-500 shadow-sm transition-all hover:border-black hover:text-black uppercase font-black"
            >
              <ArrowLeft size={14} /> VOLVER A OPERACIONES
            </button>
            <Link
              href="/gestion"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-[10px] text-gray-500 shadow-sm transition-all hover:border-black hover:text-black uppercase font-black"
            >
              <ArrowLeft size={14} /> VOLVER A GESTIÓN
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-black p-2 text-white shadow-lg shadow-black/20">
              <CalendarClock size={20} />
            </div>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">Horarios</h1>
          </div>

          <p className="text-sm text-gray-600 normal-case font-semibold">
            Acceso rápido a la gestión de horarios operativos.
          </p>

          <div className="mt-5 inline-flex items-center rounded-2xl border border-gray-200 bg-gray-50 p-1 text-[10px] uppercase tracking-widest shadow-sm">
            <Link href="/operaciones/ingresos" className="px-4 py-2 rounded-xl text-gray-500 hover:text-black font-black transition-all">
              Ingresos
            </Link>
            <Link href="/operaciones/egresos" className="px-4 py-2 rounded-xl text-gray-500 hover:text-black font-black transition-all">
              Egresos
            </Link>
            <Link href="/operaciones/horarios" className="px-4 py-2 rounded-xl bg-black text-white font-black">
              Horarios
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/gestion/clientes/tardes"
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Ruta sugerida</p>
            <h2 className="mt-2 text-2xl uppercase tracking-tight text-black">Horarios de grupos</h2>
            <p className="mt-2 text-sm normal-case font-semibold text-gray-600">
              Gestiona horarios, cupos y profesores en los grupos de tardes.
            </p>
          </Link>

          <Link
            href="/gestion/personal"
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Ruta sugerida</p>
            <h2 className="mt-2 text-2xl uppercase tracking-tight text-black">Horario laboral</h2>
            <p className="mt-2 text-sm normal-case font-semibold text-gray-600">
              Revisa o actualiza la jornada y horario laboral del personal.
            </p>
          </Link>
        </section>
      </div>
    </div>
  )
}
