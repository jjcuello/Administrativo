'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Landmark, BookOpenText, ScrollText, Bot } from 'lucide-react'

export default function GestionSociosHome() {
  const router = useRouter()

  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <section className="relative mx-auto flex w-full max-w-4xl items-center justify-center">
        <div className="w-full rounded-[2.8rem] border border-gray-200/80 bg-white/95 px-6 py-12 shadow-2xl backdrop-blur md:px-12 md:py-14">
          <button
            onClick={() => router.push('/gestion')}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
          >
            <ArrowLeft size={14} /> Volver a gestión
          </button>

          <div className="mt-8 flex items-center gap-3">
            <div className="rounded-xl bg-black p-2 text-white">
              <Landmark size={20} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-black md:text-5xl">Socios</h1>
          </div>

          <p className="mt-4 max-w-2xl text-base text-gray-600 md:text-lg">
            Selecciona el módulo con el que quieres trabajar.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push('/gestion/socios/registro')}
              className="rounded-2xl border border-black bg-black p-6 text-left text-white shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-gray-900"
            >
              <BookOpenText size={22} />
              <p className="mt-3 text-2xl font-black italic tracking-tight">Registro</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-300">
                Reporte contable y consulta mensual
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push('/gestion/socios/logs')}
              className="rounded-2xl border border-gray-300 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
            >
              <ScrollText size={22} className="text-black" />
              <p className="mt-3 text-2xl font-black italic tracking-tight text-black">Log&apos;s</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                Actividad de trabajo por usuario
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push('/gestion/socios/agente')}
              className="rounded-2xl border border-gray-300 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
            >
              <Bot size={22} className="text-black" />
              <p className="mt-3 text-2xl font-black italic tracking-tight text-black">Agente IA</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                Consultas internas con datos del sistema
              </p>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}