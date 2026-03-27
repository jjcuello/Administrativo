'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarClock, Clock3, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type PersonalDocente = {
  id: string
  nombres?: string | null
  apellidos?: string | null
  cargo?: string | null
  tipo_personal?: string | null
  jornada_laboral?: string | null
  horario_laboral?: string | null
  estado?: string | null
  deleted_at?: string | null
}

const normalizeText = (value: string) => (
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
)

const getDocenteNombre = (docente: PersonalDocente) => (
  `${docente.apellidos || ''} ${docente.nombres || ''}`.replace(/\s+/g, ' ').trim() || 'Docente'
)

const isDocente = (docente: PersonalDocente) => {
  const tipo = normalizeText(docente.tipo_personal || '')
  const cargo = normalizeText(docente.cargo || '')

  if (tipo.includes('docen') || tipo.includes('profe') || tipo.includes('maestr')) return true
  if (cargo.includes('docen') || cargo.includes('profe') || cargo.includes('maestr') || cargo.includes('instructor')) return true

  return false
}

export default function OperacionesHorarios() {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [docentes, setDocentes] = useState<PersonalDocente[]>([])
  const [cargandoDocentes, setCargandoDocentes] = useState(true)
  const [errorDocentes, setErrorDocentes] = useState('')

  useEffect(() => {
    let activo = true

    const cargarDocentes = async () => {
      setCargandoDocentes(true)
      setErrorDocentes('')

      const baseQuery = supabase
        .from('personal')
        .select('id, nombres, apellidos, cargo, tipo_personal, jornada_laboral, horario_laboral, estado, deleted_at')
        .eq('estado', 'activo')
        .order('apellidos', { ascending: true })
        .order('nombres', { ascending: true })

      const { data, error } = await baseQuery
      if (!activo) return

      if (error) {
        // Some environments still lack personal.deleted_at; fallback without that column.
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('personal')
          .select('id, nombres, apellidos, cargo, tipo_personal, jornada_laboral, horario_laboral, estado')
          .eq('estado', 'activo')
          .order('apellidos', { ascending: true })
          .order('nombres', { ascending: true })

        if (!activo) return

        if (fallbackError) {
          setDocentes([])
          setErrorDocentes('No se pudo cargar el personal docente para horario laboral.')
          setCargandoDocentes(false)
          return
        }

        const filtradosFallback = ((fallbackData as PersonalDocente[] | null) ?? []).filter(isDocente)
        setDocentes(filtradosFallback)
        setCargandoDocentes(false)
        return
      }

      const filtrados = ((data as PersonalDocente[] | null) ?? [])
        .filter((item) => !item.deleted_at)
        .filter(isDocente)

      setDocentes(filtrados)
      setCargandoDocentes(false)
    }

    void cargarDocentes()

    return () => {
      activo = false
    }
  }, [])

  const docentesFiltrados = useMemo(() => {
    const term = normalizeText(busqueda)
    if (!term) return docentes

    return docentes.filter((docente) => {
      const nombre = normalizeText(getDocenteNombre(docente))
      const cargo = normalizeText(docente.cargo || '')
      return nombre.includes(term) || cargo.includes(term)
    })
  }, [busqueda, docentes])

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
                <Link href="/gestion/proveedores" className="px-4 py-2 rounded-xl text-gray-500 hover:text-black font-black transition-all">
                  Proveedores
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

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Link
            href="/gestion/clientes/tardes"
            className="group rounded-[2rem] border border-gray-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-xl"
          >
            <Users size={30} strokeWidth={1.5} className="mb-4 text-black transition-transform group-hover:scale-110" />
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-black">Horarios de grupos</h2>
            <p className="text-sm text-gray-500">Gestiona horarios, cupos y profesores en los grupos de tardes.</p>
          </Link>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm lg:col-span-2">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  <Clock3 size={14} /> Horario laboral
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-black">Docentes activos</h2>
                <p className="mt-1 text-sm text-gray-500">Selecciona un docente para abrir su pantalla de horario.</p>
              </div>

              <div className="relative w-full max-w-sm">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar docente..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm font-semibold text-black outline-none transition-all focus:border-black"
                />
              </div>
            </div>

            {errorDocentes && (
              <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{errorDocentes}</p>
            )}

            {cargandoDocentes ? (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">Cargando docentes...</p>
            ) : docentesFiltrados.length === 0 ? (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">No se encontraron docentes para mostrar.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {docentesFiltrados.map((docente) => {
                  const nombre = getDocenteNombre(docente)
                  const sinHorario = !(docente.horario_laboral || '').trim()

                  return (
                    <Link
                      key={docente.id}
                      href={`/operaciones/horarios/${docente.id}`}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-black hover:shadow-md"
                    >
                      <p className="text-sm font-bold text-black">{nombre}</p>
                      <p className="mt-1 text-xs text-gray-500">{docente.cargo || 'Sin cargo definido'}</p>
                      <p className={`mt-2 text-[10px] font-bold uppercase tracking-[0.12em] ${sinHorario ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {sinHorario ? 'Sin horario cargado' : 'Horario disponible'}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
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
