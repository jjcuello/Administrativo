'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, User } from 'lucide-react'
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

const isDocente = (docente: PersonalDocente) => {
  const tipo = normalizeText(docente.tipo_personal || '')
  const cargo = normalizeText(docente.cargo || '')

  if (tipo.includes('docen') || tipo.includes('profe') || tipo.includes('maestr')) return true
  if (cargo.includes('docen') || cargo.includes('profe') || cargo.includes('maestr') || cargo.includes('instructor')) return true

  return false
}

const getDocenteNombre = (docente: PersonalDocente | null) => {
  if (!docente) return 'Docente'
  return `${docente.apellidos || ''} ${docente.nombres || ''}`.replace(/\s+/g, ' ').trim() || 'Docente'
}

export default function OperacionesHorarioDocentePage() {
  const router = useRouter()
  const params = useParams<{ docenteId: string }>()
  const docenteId = (params?.docenteId || '').trim()

  const [docente, setDocente] = useState<PersonalDocente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true

    const cargarDocente = async () => {
      if (!docenteId) {
        setError('No se recibió un docente válido.')
        setCargando(false)
        return
      }

      setCargando(true)
      setError('')

      const { data, error } = await supabase
        .from('personal')
        .select('id, nombres, apellidos, cargo, tipo_personal, jornada_laboral, horario_laboral, estado, deleted_at')
        .eq('id', docenteId)
        .maybeSingle()

      if (!activo) return

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('personal')
          .select('id, nombres, apellidos, cargo, tipo_personal, jornada_laboral, horario_laboral, estado')
          .eq('id', docenteId)
          .maybeSingle()

        if (!activo) return

        if (fallbackError) {
          setError('No se pudo cargar el horario del docente seleccionado.')
          setDocente(null)
          setCargando(false)
          return
        }

        const row = (fallbackData as PersonalDocente | null) ?? null
        if (!row) {
          setError('No se encontró el docente seleccionado.')
          setDocente(null)
          setCargando(false)
          return
        }

        if (!isDocente(row)) {
          setError('El registro seleccionado no corresponde a un docente.')
          setDocente(null)
          setCargando(false)
          return
        }

        setDocente(row)
        setCargando(false)
        return
      }

      const row = (data as PersonalDocente | null) ?? null
      if (!row || row.deleted_at) {
        setError('No se encontró el docente seleccionado.')
        setDocente(null)
        setCargando(false)
        return
      }

      if (!isDocente(row)) {
        setError('El registro seleccionado no corresponde a un docente.')
        setDocente(null)
        setCargando(false)
        return
      }

      setDocente(row)
      setCargando(false)
    }

    void cargarDocente()

    return () => {
      activo = false
    }
  }, [docenteId])

  const nombre = useMemo(() => getDocenteNombre(docente), [docente])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <div className="relative mx-auto w-full max-w-6xl rounded-[2.8rem] border border-gray-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-12">
        <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
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
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Horario laboral</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-black md:text-5xl">{nombre}</h1>
              <p className="mt-3 text-base text-gray-600">Detalle individual del horario del docente seleccionado.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push('/operaciones/horarios')}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a horarios
            </button>
            <Link
              href="/operaciones"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a operaciones
            </Link>
          </div>
        </header>

        {cargando ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-600">Cargando horario...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                <User size={14} /> Docente
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-black">{nombre}</h2>
              <p className="mt-2 text-sm text-gray-500">{docente?.cargo || 'Sin cargo definido'}</p>
            </div>

            <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                <Clock3 size={14} /> Horario
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-black">Horario laboral</h2>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Jornada</p>
                  <p className="mt-1 text-sm font-semibold text-black">{docente?.jornada_laboral || 'No definida'}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Horario</p>
                  <p className="mt-1 text-sm font-semibold text-black whitespace-pre-wrap">{docente?.horario_laboral || 'No cargado'}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
