'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, CalendarClock, Clock3, Users } from 'lucide-react'

export default function OperacionesHorarios() {
  const router = useRouter()

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
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-black md:text-5xl">Horarios</h1>
              <p className="mt-4 max-w-2xl text-base text-gray-600">Acceso centralizado a la planificación de grupos y personal.</p>

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
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push('/operaciones')}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a operaciones
            </button>
            <Link
              href="/gestion"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a gestión
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/gestion/clientes/tardes"
            className="group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
          >
            <Users size={32} strokeWidth={1.5} className="mb-6 text-black transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Horarios de grupos</h2>
            <p className="text-sm text-gray-500">Gestiona horarios, cupos y profesores en los grupos de tardes.</p>
          </Link>

          <Link
            href="/gestion/personal"
            className="group rounded-[2rem] border border-gray-200 bg-white p-10 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
          >
            <Clock3 size={32} strokeWidth={1.5} className="mb-6 text-black transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Horario laboral</h2>
            <p className="text-sm text-gray-500">Revisa o actualiza jornada y horario laboral del personal administrativo y docente.</p>
          </Link>
        </section>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-600">
          <div className="inline-flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-gray-500">
            <CalendarClock size={16} /> Acceso rápido operativo
          </div>
          <p className="mt-2">Esta pantalla concentra los accesos clave para actualizar horarios sin salir del módulo de Operaciones.</p>
        </div>
      </div>
    </div>
  )
}
