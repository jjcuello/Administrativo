'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePeriodoEscolarActivo } from '@/lib/hooks/financeHooks'

type PeriodoOption = {
  id: string
  codigo?: string | null
  nombre?: string | null
  fecha_inicio?: string | null
}

const getPeriodoEtiqueta = (periodo?: Partial<PeriodoOption> | null) => (
  periodo?.codigo || periodo?.nombre || 'Sin período'
)

export default function ReportesHome() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { periodoActual, loading, error } = usePeriodoEscolarActivo()
  const [periodos, setPeriodos] = useState<PeriodoOption[]>([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(true)
  const [errorPeriodos, setErrorPeriodos] = useState('')
  const [estadoCopiaLink, setEstadoCopiaLink] = useState<'idle' | 'ok' | 'error'>('idle')
  const searchParamsString = searchParams.toString()
  const periodoUrlId = searchParams.get('periodo') || ''

  const periodoActualEtiqueta = getPeriodoEtiqueta(periodoActual)

  useEffect(() => {
    let activo = true

    const fetchPeriodos = async () => {
      setLoadingPeriodos(true)
      setErrorPeriodos('')

      const { data, error } = await supabase
        .from('periodos_escolares')
        .select('id, codigo, nombre, fecha_inicio')
        .is('deleted_at', null)
        .order('fecha_inicio', { ascending: false })

      if (!activo) return

      if (error) {
        setPeriodos([])
        setErrorPeriodos('No se pudo cargar la lista de períodos escolares.')
        setLoadingPeriodos(false)
        return
      }

      setPeriodos((data as PeriodoOption[] | null) ?? [])
      setLoadingPeriodos(false)
    }

    void fetchPeriodos()

    return () => {
      activo = false
    }
  }, [])

  const periodoSeleccionadoId = useMemo(() => {
    if (periodoUrlId && periodos.some((periodo) => periodo.id === periodoUrlId)) return periodoUrlId
    if (periodoActual?.id) return periodoActual.id
    if (periodos.length > 0) return periodos[0].id
    if (periodoUrlId) return periodoUrlId
    return ''
  }, [periodoUrlId, periodoActual?.id, periodos])

  useEffect(() => {
    if (!periodoSeleccionadoId) return
    if (periodoUrlId === periodoSeleccionadoId) return

    const nextParams = new URLSearchParams(searchParamsString)
    nextParams.set('periodo', periodoSeleccionadoId)

    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [pathname, periodoSeleccionadoId, periodoUrlId, router, searchParamsString])

  const periodoSeleccionado = useMemo(() => {
    const periodoLista = periodos.find((periodo) => periodo.id === periodoSeleccionadoId)
    if (periodoLista) return periodoLista

    if (periodoActual?.id === periodoSeleccionadoId) {
      return periodoActual
    }

    return null
  }, [periodos, periodoSeleccionadoId, periodoActual])

  const periodoSeleccionadoEtiqueta = getPeriodoEtiqueta(periodoSeleccionado)

  const manejarCambioPeriodo = (nextPeriodoId: string) => {
    const nextParams = new URLSearchParams(searchParamsString)

    if (nextPeriodoId) {
      nextParams.set('periodo', nextPeriodoId)
    } else {
      nextParams.delete('periodo')
    }

    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const copiarEnlacePeriodo = async () => {
    if (typeof window === 'undefined') return

    try {
      await navigator.clipboard.writeText(window.location.href)
      setEstadoCopiaLink('ok')
    } catch {
      setEstadoCopiaLink('error')
    }

    window.setTimeout(() => setEstadoCopiaLink('idle'), 2000)
  }

  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 text-center md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <section className="relative mx-auto flex w-full max-w-4xl items-center justify-center">
        <div className="w-full rounded-[2.8rem] border border-gray-200/80 bg-white/95 px-6 py-12 shadow-2xl backdrop-blur md:px-12 md:py-14">
          <p className="mx-auto inline-flex rounded-full border border-gray-300 bg-gray-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">
            Modo consulta
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-black md:text-5xl">Reportes</h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 md:text-lg">
            Acceso de solo lectura. Aquí se concentran los reportes y paneles para seguimiento.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 shadow-sm">
            <span className="text-gray-400">Período activo:</span>
            <span className="text-black">{loading ? 'Cargando...' : periodoActualEtiqueta}</span>
          </div>

          <div className="mx-auto mt-4 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Período de consulta</p>
            <select
              value={periodoSeleccionadoId}
              onChange={(event) => manejarCambioPeriodo(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-black"
            >
              {loadingPeriodos && <option value="">Cargando períodos...</option>}
              {!loadingPeriodos && periodos.length === 0 && <option value="">Sin períodos disponibles</option>}
              {!loadingPeriodos && periodos.map((periodo) => (
                <option key={periodo.id} value={periodo.id}>
                  {getPeriodoEtiqueta(periodo)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 shadow-sm">
            <span className="text-gray-400">Período en consulta:</span>
            <span className="text-black">{periodoSeleccionadoEtiqueta}</span>
          </div>

          <div className="mx-auto mt-3 w-full max-w-xl rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Enlace compartible del período actual</p>
              <button
                type="button"
                onClick={() => void copiarEnlacePeriodo()}
                className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-gray-700 transition-all hover:border-black hover:text-black"
              >
                Copiar enlace
              </button>
            </div>
            {estadoCopiaLink === 'ok' && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-green-700">✅ Enlace copiado.</p>
            )}
            {estadoCopiaLink === 'error' && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-red-700">❌ No se pudo copiar el enlace.</p>
            )}
          </div>

          {!loading && !periodoActual && (
            <p className="mx-auto mt-3 max-w-xl rounded-2xl bg-amber-50 px-4 py-3 text-[11px] font-black text-amber-700">
              ⚠️ No hay período escolar activo. Los reportes podrían mostrar información global.
            </p>
          )}

          {errorPeriodos && (
            <p className="mx-auto mt-3 max-w-xl rounded-2xl bg-red-50 px-4 py-3 text-[11px] font-black text-red-700">
              ❌ {errorPeriodos}
            </p>
          )}

          {!!error && (
            <p className="mx-auto mt-3 max-w-xl rounded-2xl bg-red-50 px-4 py-3 text-[11px] font-black text-red-700">
              ❌ No se pudo cargar el período escolar activo.
            </p>
          )}

          <div className="mt-10">
            <Link
              href="/gestion"
              className="inline-flex rounded-2xl border border-gray-300 bg-white px-8 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:text-black"
            >
              Solicitar acceso a gestión
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
