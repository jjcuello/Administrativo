'use client'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Clock3, Save, Trash2, User } from 'lucide-react'
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

type ColegioItem = {
  id: string
  nombre: string
}

type ScheduleBlock = {
  id: string
  dayIndex: number
  startSlot: number
  durationSlots: number
  title: string
  colegioId: string
}

type ArrivalMarker = {
  id: string
  dayIndex: number
  startSlot: number
}

type InteractionMode = 'move' | 'resize-start' | 'resize-end'

type InteractionState = {
  targetType: 'block' | 'arrival'
  itemId: string
  mode: InteractionMode
  startX: number
  startY: number
  originalDayIndex: number
  originalStartSlot: number
  originalDurationSlots: number
}

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']
const START_MINUTES = 6 * 60 + 45
const END_MINUTES = 15 * 60 + 30
const SLOT_MINUTES = 15
const SLOT_COUNT = Math.round((END_MINUTES - START_MINUTES) / SLOT_MINUTES)
const DEPARTURE_SLOT = SLOT_COUNT - 1
const SLOT_HEIGHT = 26

const COLOR_PALETTE = [
  '#93c5fd',
  '#fcd34d',
  '#86efac',
  '#fca5a5',
  '#c4b5fd',
  '#67e8f9',
  '#fbbf24',
]

const normalizeText = (value: string) => (
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const makeId = () => `blk_${Date.now()}_${Math.floor(Math.random() * 99999)}`
const makeArrivalId = (dayIndex: number) => `arr_${dayIndex}`
const buildSnapshot = (blocks: ScheduleBlock[], arrivalMarkers: ArrivalMarker[], notes: string) => (
  JSON.stringify({ blocks, arrivalMarkers, notes })
)

const buildDefaultArrivalMarkers = (): ArrivalMarker[] => (
  DAYS.map((_, dayIndex) => ({
    id: makeArrivalId(dayIndex),
    dayIndex,
    startSlot: 0,
  }))
)

const colorFromId = (value: string) => {
  const text = String(value || 'sin-colegio')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length
  return COLOR_PALETTE[index]
}

const minutesToLabel = (totalMinutes: number) => {
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const suffix = hours24 >= 12 ? 'pm' : 'am'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

const slotToMinutes = (slot: number) => START_MINUTES + (slot * SLOT_MINUTES)

const slotLabel = (slot: number) => {
  const start = slotToMinutes(slot)
  const end = slotToMinutes(slot + 1)
  return `${minutesToLabel(start)} - ${minutesToLabel(end)}`
}

const blockTimeLabel = (block: ScheduleBlock) => {
  const start = slotToMinutes(block.startSlot)
  const end = slotToMinutes(block.startSlot + block.durationSlots)
  return `${minutesToLabel(start)} - ${minutesToLabel(end)}`
}

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

const parseHorarioLaboral = (raw?: string | null) => {
  if (!raw || !raw.trim()) {
    return { blocks: [] as ScheduleBlock[], notes: '', arrivalMarkers: buildDefaultArrivalMarkers() }
  }

  try {
    const parsed = JSON.parse(raw)
    const blocksRaw = Array.isArray(parsed?.blocks) ? parsed.blocks : []

    const blocks = blocksRaw
      .map((item: unknown) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Partial<ScheduleBlock>

        const dayIndex = Number(row.dayIndex)
        const startSlot = Number(row.startSlot)
        const durationSlots = Number(row.durationSlots)

        if (!Number.isFinite(dayIndex) || !Number.isFinite(startSlot) || !Number.isFinite(durationSlots)) return null

        return {
          id: String(row.id || makeId()),
          dayIndex: clamp(Math.round(dayIndex), 0, DAYS.length - 1),
          startSlot: clamp(Math.round(startSlot), 0, SLOT_COUNT - 1),
          durationSlots: clamp(Math.round(durationSlots), 1, SLOT_COUNT),
          title: String(row.title || 'Clase'),
          colegioId: String(row.colegioId || 'sin-colegio'),
        } as ScheduleBlock
      })
      .filter((item: ScheduleBlock | null): item is ScheduleBlock => !!item)
      .map((block: ScheduleBlock) => ({
        ...block,
        durationSlots: clamp(block.durationSlots, 1, SLOT_COUNT - block.startSlot),
      }))

    return {
      blocks,
      notes: typeof parsed?.notes === 'string' ? parsed.notes : '',
      arrivalMarkers: Array.isArray(parsed?.arrivalMarkers)
        ? (parsed.arrivalMarkers as Array<Partial<ArrivalMarker>>)
          .map((item) => {
            const dayIndex = clamp(Math.round(Number(item.dayIndex || 0)), 0, DAYS.length - 1)
            const startSlot = clamp(Math.round(Number(item.startSlot || 0)), 0, SLOT_COUNT - 1)
            return {
              id: String(item.id || makeArrivalId(dayIndex)),
              dayIndex,
              startSlot,
            } as ArrivalMarker
          })
        : buildDefaultArrivalMarkers(),
    }
  } catch {
    return {
      blocks: [],
      notes: raw,
      arrivalMarkers: buildDefaultArrivalMarkers(),
    }
  }
}

export default function OperacionesHorarioDocentePage() {
  const router = useRouter()
  const params = useParams<{ docenteId: string }>()
  const docenteId = (params?.docenteId || '').trim()

  const gridRef = useRef<HTMLDivElement | null>(null)

  const [docente, setDocente] = useState<PersonalDocente | null>(null)
  const [colegios, setColegios] = useState<ColegioItem[]>([])
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [arrivalMarkers, setArrivalMarkers] = useState<ArrivalMarker[]>(buildDefaultArrivalMarkers)
  const [notes, setNotes] = useState('')
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedArrivalId, setSelectedArrivalId] = useState<string | null>(null)
  const [selectedTemplateColegioId, setSelectedTemplateColegioId] = useState<string | null>(null)
  const [interaction, setInteraction] = useState<InteractionState | null>(null)
  const [baselineSnapshot, setBaselineSnapshot] = useState('')

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeGuardado, setMensajeGuardado] = useState('')

  const colegioColorById = useMemo(() => {
    const map = new Map<string, string>()
    colegios.forEach((colegio) => {
      map.set(colegio.id, colorFromId(colegio.id))
    })
    map.set('sin-colegio', '#cbd5e1')
    return map
  }, [colegios])

  const getArrivalSlotForDay = (markers: ArrivalMarker[], dayIndex: number) => (
    markers.find((marker) => marker.dayIndex === dayIndex)?.startSlot ?? 0
  )

  const currentSnapshot = useMemo(
    () => buildSnapshot(blocks, arrivalMarkers, notes),
    [arrivalMarkers, blocks, notes]
  )

  const hasUnsavedChanges = baselineSnapshot !== '' && currentSnapshot !== baselineSnapshot

  const selectedBlock = useMemo(
    () => blocks.find((item) => item.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  )

  const resumenColegios = useMemo(() => {
    const totals = new Map<string, number>()
    for (const block of blocks) {
      const key = block.colegioId || 'sin-colegio'
      totals.set(key, (totals.get(key) || 0) + (block.durationSlots * SLOT_MINUTES))
    }

    return Array.from(totals.entries()).map(([colegioId, minutes]) => {
      const color = colegioColorById.get(colegioId) || '#e5e7eb'
      const nombre = colegios.find((item) => item.id === colegioId)?.nombre || 'Sin colegio'
      const horas = Math.floor(minutes / 60)
      const mins = minutes % 60
      const horasLabel = `${horas}h ${String(mins).padStart(2, '0')}m`

      return { colegioId, nombre, color, horasLabel }
    })
  }, [blocks, colegioColorById, colegios])

  useEffect(() => {
    let active = true

    const loadData = async () => {
      if (!docenteId) {
        setError('No se recibio un docente valido.')
        setCargando(false)
        return
      }

      setCargando(true)
      setError('')

      const docenteQuery = supabase
        .from('personal')
        .select('id, nombres, apellidos, cargo, tipo_personal, jornada_laboral, horario_laboral, estado, deleted_at')
        .eq('id', docenteId)
        .maybeSingle()

      const colegiosQuery = supabase
        .from('colegios')
        .select('id, nombre')
        .is('deleted_at', null)
        .order('nombre', { ascending: true })

      const [docenteRes, colegiosRes] = await Promise.all([docenteQuery, colegiosQuery])
      if (!active) return

      let colegiosRows: ColegioItem[] = []
      if (!colegiosRes.error) {
        colegiosRows = ((colegiosRes.data as Array<{ id?: string; nombre?: string | null }> | null) ?? [])
          .filter((row) => row.id)
          .map((row) => ({ id: String(row.id), nombre: String(row.nombre || 'Colegio') }))
      }

      if (colegiosRes.error) {
        const fallbackColegios = await supabase
          .from('colegios')
          .select('id, nombre')
          .order('nombre', { ascending: true })

        if (!fallbackColegios.error) {
          colegiosRows = ((fallbackColegios.data as Array<{ id?: string; nombre?: string | null }> | null) ?? [])
            .filter((row) => row.id)
            .map((row) => ({ id: String(row.id), nombre: String(row.nombre || 'Colegio') }))
        }
      }

      setColegios(colegiosRows)

      if (docenteRes.error) {
        const docenteFallback = await supabase
          .from('personal')
          .select('id, nombres, apellidos, cargo, tipo_personal, jornada_laboral, horario_laboral, estado')
          .eq('id', docenteId)
          .maybeSingle()

        if (!active) return

        if (docenteFallback.error) {
          setError('No se pudo cargar el horario del docente seleccionado.')
          setDocente(null)
          setCargando(false)
          return
        }

        const row = (docenteFallback.data as PersonalDocente | null) ?? null
        if (!row) {
          setError('No se encontro el docente seleccionado.')
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

        const parsed = parseHorarioLaboral(row.horario_laboral)
        setDocente(row)
        setBlocks(parsed.blocks)
        setArrivalMarkers(parsed.arrivalMarkers)
        setNotes(parsed.notes)
        setBaselineSnapshot(buildSnapshot(parsed.blocks, parsed.arrivalMarkers, parsed.notes))
        setSelectedBlockId(parsed.blocks[0]?.id || null)
        setSelectedArrivalId(null)
        setCargando(false)
        return
      }

      const row = (docenteRes.data as PersonalDocente | null) ?? null
      if (!row || row.deleted_at) {
        setError('No se encontro el docente seleccionado.')
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

      const parsed = parseHorarioLaboral(row.horario_laboral)
      setDocente(row)
      setBlocks(parsed.blocks)
      setArrivalMarkers(parsed.arrivalMarkers)
      setNotes(parsed.notes)
      setBaselineSnapshot(buildSnapshot(parsed.blocks, parsed.arrivalMarkers, parsed.notes))
      setSelectedBlockId(parsed.blocks[0]?.id || null)
      setSelectedArrivalId(null)
      setCargando(false)
    }

    void loadData()

    return () => {
      active = false
    }
  }, [docenteId])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!interaction) return

    const onMouseMove = (event: MouseEvent) => {
      if (!gridRef.current) return
      const rect = gridRef.current.getBoundingClientRect()
      const dayWidth = rect.width / DAYS.length
      const pointerDay = clamp(Math.floor((event.clientX - rect.left) / dayWidth), 0, DAYS.length - 1)
      const deltaSlots = Math.round((event.clientY - interaction.startY) / SLOT_HEIGHT)

      if (interaction.targetType === 'arrival') {
        const nextStart = clamp(interaction.originalStartSlot + deltaSlots, 0, SLOT_COUNT - 2)
        const fixedDayIndex = interaction.originalDayIndex
        setArrivalMarkers((prev) => prev.map((marker) => {
          if (marker.id !== interaction.itemId) return marker
          return {
            ...marker,
            dayIndex: fixedDayIndex,
            startSlot: nextStart,
          }
        }))

        setBlocks((prev) => prev.map((block) => {
          if (block.dayIndex !== fixedDayIndex) return block

          const maxDuration = Math.max(1, DEPARTURE_SLOT - nextStart)
          const nextDuration = clamp(block.durationSlots, 1, maxDuration)
          const nextStartSlot = clamp(block.startSlot, nextStart, DEPARTURE_SLOT - nextDuration)
          return {
            ...block,
            startSlot: nextStartSlot,
            durationSlots: nextDuration,
          }
        }))
        return
      }

      setBlocks((prev) => prev.map((block) => {
        if (block.id !== interaction.itemId) return block

        const dayIndexForBounds = interaction.mode === 'move' ? pointerDay : block.dayIndex
        const arrivalSlot = getArrivalSlotForDay(arrivalMarkers, dayIndexForBounds)
        const availableSlots = Math.max(1, DEPARTURE_SLOT - arrivalSlot)

        if (interaction.mode === 'move') {
          const nextDuration = clamp(interaction.originalDurationSlots, 1, availableSlots)
          const nextStart = clamp(interaction.originalStartSlot + deltaSlots, arrivalSlot, DEPARTURE_SLOT - nextDuration)
          return {
            ...block,
            dayIndex: pointerDay,
            startSlot: nextStart,
            durationSlots: nextDuration,
          }
        }

        if (interaction.mode === 'resize-start') {
          const originalEnd = Math.min(interaction.originalStartSlot + interaction.originalDurationSlots, DEPARTURE_SLOT)
          const maxStart = interaction.originalStartSlot + interaction.originalDurationSlots - 1
          const nextStart = clamp(interaction.originalStartSlot + deltaSlots, arrivalSlot, maxStart)
          const nextDuration = clamp(originalEnd - nextStart, 1, DEPARTURE_SLOT - nextStart)
          return {
            ...block,
            startSlot: nextStart,
            durationSlots: nextDuration,
          }
        }

        const maxDuration = Math.max(1, DEPARTURE_SLOT - interaction.originalStartSlot)
        const nextDuration = clamp(interaction.originalDurationSlots + deltaSlots, 1, maxDuration)
        return {
          ...block,
          durationSlots: nextDuration,
        }
      }))
    }

    const onMouseUp = () => {
      setInteraction(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [arrivalMarkers, interaction])

  const addBlock = () => {
    const fallbackColegioId = colegios[0]?.id || 'sin-colegio'
    const dayIndex = 0
    const arrivalSlot = getArrivalSlotForDay(arrivalMarkers, dayIndex)
    const availableSlots = Math.max(1, DEPARTURE_SLOT - arrivalSlot)
    const durationSlots = clamp(4, 1, availableSlots)
    const nextBlock: ScheduleBlock = {
      id: makeId(),
      dayIndex,
      startSlot: arrivalSlot,
      durationSlots,
      title: '',
      colegioId: fallbackColegioId,
    }

    setBlocks((prev) => [...prev, nextBlock])
    setSelectedBlockId(nextBlock.id)
    setSelectedArrivalId(null)
    setMensajeGuardado('')
  }

  const updateBlock = (blockId: string, patch: Partial<ScheduleBlock>) => {
    setBlocks((prev) => prev.map((item) => (item.id === blockId ? { ...item, ...patch } : item)))
    setMensajeGuardado('')
  }

  const deleteSelectedBlock = () => {
    if (!selectedBlockId) return

    setBlocks((prev) => prev.filter((item) => item.id !== selectedBlockId))
    setSelectedArrivalId(null)
    setSelectedBlockId((prev) => {
      const remaining = blocks.filter((item) => item.id !== prev)
      return remaining[0]?.id || null
    })
    setMensajeGuardado('')
  }

  const saveHorario = async () => {
    if (!docenteId) return

    setGuardando(true)
    setMensajeGuardado('')

    const payload = {
      version: 1,
      slots: {
        start: '06:45',
        end: '15:30',
        minutes: 15,
      },
      arrivalMarkers,
      blocks,
      notes,
    }

    const { error } = await supabase
      .from('personal')
      .update({ horario_laboral: JSON.stringify(payload) })
      .eq('id', docenteId)

    if (error) {
      setMensajeGuardado('No se pudo guardar el horario.')
      setGuardando(false)
      return false
    }

    setMensajeGuardado('Horario guardado con exito.')
    setBaselineSnapshot(currentSnapshot)
    setGuardando(false)
    return true
  }

  const navigateWithUnsavedCheck = async (targetPath: string) => {
    if (!hasUnsavedChanges) {
      router.push(targetPath)
      return
    }

    const shouldSaveBeforeExit = window.confirm(
      'Tienes cambios sin guardar. Presiona Aceptar para guardar antes de salir o Cancelar para salir sin guardar.'
    )

    if (shouldSaveBeforeExit) {
      const saved = await saveHorario()
      if (!saved) return
    }

    router.push(targetPath)
  }

  const handleTemplateDragStart = (event: React.DragEvent<HTMLButtonElement>, colegioId: string) => {
    event.dataTransfer.setData('text/colegio-id', colegioId)
    event.dataTransfer.effectAllowed = 'copy'
    setSelectedTemplateColegioId(colegioId)
  }

  const createBlockFromDrop = (clientX: number, clientY: number, colegioId: string) => {
    if (!gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()

    const dayWidth = rect.width / DAYS.length
    const dayIndex = clamp(Math.floor((clientX - rect.left) / dayWidth), 0, DAYS.length - 1)
    const arrivalSlot = getArrivalSlotForDay(arrivalMarkers, dayIndex)
    const maxDuration = Math.max(1, DEPARTURE_SLOT - arrivalSlot)
    const durationSlots = clamp(4, 1, maxDuration)
    const slot = clamp(Math.floor((clientY - rect.top) / SLOT_HEIGHT), arrivalSlot, DEPARTURE_SLOT - durationSlots)

    const nextBlock: ScheduleBlock = {
      id: makeId(),
      dayIndex,
      startSlot: slot,
      durationSlots,
      title: '',
      colegioId,
    }

    setBlocks((prev) => [...prev, nextBlock])
    setSelectedBlockId(nextBlock.id)
    setSelectedArrivalId(null)
    setMensajeGuardado('')
  }

  const handleGridDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const colegioId = event.dataTransfer.getData('text/colegio-id')
    if (!colegioId) return

    event.preventDefault()
    createBlockFromDrop(event.clientX, event.clientY, colegioId)
  }

  const handleGridDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('text/colegio-id')) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  const startInteraction = (event: React.MouseEvent, block: ScheduleBlock, mode: InteractionMode) => {
    event.preventDefault()
    event.stopPropagation()

    setSelectedBlockId(block.id)
    setSelectedArrivalId(null)
    setInteraction({
      targetType: 'block',
      itemId: block.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      originalDayIndex: block.dayIndex,
      originalStartSlot: block.startSlot,
      originalDurationSlots: block.durationSlots,
    })
  }

  const startArrivalInteraction = (event: React.MouseEvent, marker: ArrivalMarker) => {
    event.preventDefault()
    event.stopPropagation()

    setSelectedArrivalId(marker.id)
    setSelectedBlockId(null)
    setInteraction({
      targetType: 'arrival',
      itemId: marker.id,
      mode: 'move',
      startX: event.clientX,
      startY: event.clientY,
      originalDayIndex: marker.dayIndex,
      originalStartSlot: marker.startSlot,
      originalDurationSlots: 1,
    })
    setMensajeGuardado('')
  }

  const rowHeightPx = SLOT_COUNT * SLOT_HEIGHT
  const docenteNombre = getDocenteNombre(docente)

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-100 px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gray-100 to-transparent" />

      <div className="relative mx-auto w-full max-w-[1280px] rounded-[2.8rem] border border-gray-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-12">
        <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
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
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Horario laboral interactivo</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-black md:text-5xl">{docenteNombre}</h1>
              <p className="mt-2 text-base text-gray-600">Bloques de 15 minutos desde las 6:45 am hasta las 3:30 pm.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { void navigateWithUnsavedCheck('/operaciones/horarios') }}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a horarios
            </button>
            <button
              onClick={() => { void navigateWithUnsavedCheck('/operaciones') }}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600 shadow-sm transition-all hover:border-black hover:text-black"
            >
              <ArrowLeft size={14} /> Volver a operaciones
            </button>
          </div>
        </header>

        {cargando ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-600">Cargando horario...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          <>
            <section className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {resumenColegios.length === 0 ? (
                  <p className="text-sm text-gray-500">Aun no hay bloques asignados a colegios.</p>
                ) : resumenColegios.map((item) => (
                  <div key={item.colegioId} className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
                    <span className="h-3 w-3 rounded-full border border-gray-300" style={{ backgroundColor: item.color }} />
                    <span>{item.nombre}</span>
                    <span className="text-gray-400">{item.horasLabel}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                    <Clock3 size={14} /> Cuadricula semanal
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={addBlock}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-700 transition-all hover:border-black hover:text-black"
                    >
                      Agregar clase
                    </button>
                    <button
                      onClick={() => { void saveHorario() }}
                      disabled={guardando}
                      className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-gray-900 disabled:opacity-60"
                    >
                      <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar horario'}
                    </button>
                  </div>
                </div>

                {mensajeGuardado && (
                  <p className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">{mensajeGuardado}</p>
                )}

                <div className="overflow-auto rounded-xl border border-gray-200">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[120px_repeat(5,minmax(0,1fr))] border-b border-gray-200 bg-gray-50">
                      <div className="px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Hora</div>
                      {DAYS.map((day) => (
                        <div key={day} className="border-l border-gray-200 px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-gray-600">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-[120px_repeat(5,minmax(0,1fr))]">
                      <div className="relative border-r border-gray-200 bg-gray-50" style={{ height: rowHeightPx }}>
                        {Array.from({ length: SLOT_COUNT }).map((_, slot) => (
                          <div
                            key={`time-${slot}`}
                            className="absolute left-0 right-0 border-b border-gray-100 px-2 text-[10px] font-semibold text-gray-500"
                            style={{ top: slot * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                          >
                            {slotLabel(slot)}
                          </div>
                        ))}
                      </div>

                      <div
                        className="relative col-span-5"
                        ref={gridRef}
                        style={{ height: rowHeightPx }}
                        onDrop={handleGridDrop}
                        onDragOver={handleGridDragOver}
                      >
                        {DAYS.map((_, dayIndex) => (
                          <div
                            key={`day-bg-${dayIndex}`}
                            className="absolute top-0 h-full border-l border-gray-200"
                            style={{ left: `${(dayIndex * 100) / DAYS.length}%`, width: `${100 / DAYS.length}%` }}
                          />
                        ))}

                        {Array.from({ length: SLOT_COUNT }).map((_, slot) => (
                          <div
                            key={`line-${slot}`}
                            className="absolute left-0 right-0 border-b border-gray-100"
                            style={{ top: slot * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                          />
                        ))}

                        {arrivalMarkers.map((marker) => (
                          <div
                            key={marker.id}
                            onMouseDown={(event) => startArrivalInteraction(event, marker)}
                            onClick={() => {
                              setSelectedArrivalId(marker.id)
                              setSelectedBlockId(null)
                            }}
                            className={`absolute z-20 cursor-move rounded-md border px-2 py-0.5 text-[10px] font-bold text-blue-900 ${selectedArrivalId === marker.id ? 'border-blue-800 ring-1 ring-blue-900 bg-blue-300' : 'border-blue-700 bg-blue-200'}`}
                            style={{
                              left: `calc(${(marker.dayIndex * 100) / DAYS.length}% + 4px)`,
                              width: `calc(${100 / DAYS.length}% - 8px)`,
                              top: (marker.startSlot * SLOT_HEIGHT) + 2,
                              height: SLOT_HEIGHT - 4,
                            }}
                          >
                            Hora de llegada
                          </div>
                        ))}

                        {DAYS.map((_, dayIndex) => (
                          <div
                            key={`departure-${dayIndex}`}
                            className="absolute z-10 rounded-md border border-black bg-black px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{
                              left: `calc(${(dayIndex * 100) / DAYS.length}% + 4px)`,
                              width: `calc(${100 / DAYS.length}% - 8px)`,
                              top: ((SLOT_COUNT - 1) * SLOT_HEIGHT) + 2,
                              height: SLOT_HEIGHT - 4,
                            }}
                          >
                            Hora de salida
                          </div>
                        ))}

                        {blocks.map((block) => {
                          const blockColor = colegioColorById.get(block.colegioId) || '#e5e7eb'
                          const isSelected = block.id === selectedBlockId
                          const isCompactBlock = block.durationSlots <= 1
                          const compactLabel = (block.title || '').trim() || blockTimeLabel(block)

                          return (
                            <div
                              key={block.id}
                              onMouseDown={(event) => startInteraction(event, block, 'move')}
                              onClick={() => setSelectedBlockId(block.id)}
                              title={block.title ? `${block.title} | ${blockTimeLabel(block)}` : blockTimeLabel(block)}
                              className={`absolute z-20 cursor-move rounded-lg border px-2 py-1 text-center shadow-sm ${isSelected ? 'border-black ring-1 ring-black' : 'border-gray-400'} flex flex-col items-center justify-center overflow-hidden`}
                              style={{
                                left: `calc(${(block.dayIndex * 100) / DAYS.length}% + 4px)`,
                                width: `calc(${100 / DAYS.length}% - 8px)`,
                                top: (block.startSlot * SLOT_HEIGHT) + 2,
                                height: Math.max((block.durationSlots * SLOT_HEIGHT) - 4, 20),
                                backgroundColor: blockColor,
                              }}
                            >
                              <div
                                className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize"
                                onMouseDown={(event) => startInteraction(event, block, 'resize-start')}
                              />

                              {isCompactBlock ? (
                                <p className="w-full truncate px-1 text-[10px] font-extrabold leading-none text-black">
                                  {compactLabel}
                                </p>
                              ) : (
                                <>
                                  <p className="text-[10px] font-semibold text-gray-700">{blockTimeLabel(block)}</p>

                                  <input
                                    value={block.title}
                                    onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                    placeholder="Escribe nombre"
                                    className="mt-1 w-full border-none bg-transparent p-0 text-center text-[10px] font-bold text-black outline-none placeholder:text-gray-600"
                                  />
                                </>
                              )}

                              <div
                                className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
                                onMouseDown={(event) => startInteraction(event, block, 'resize-end')}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  <User size={14} /> Editor de clase
                </div>

                {!selectedBlock ? (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
                    Selecciona una clase para editar su colegio y su nombre.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Nombre de la clase</label>
                      <input
                        value={selectedBlock.title}
                        onChange={(event) => updateBlock(selectedBlock.id, { title: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-black outline-none transition-all focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Colegio</label>
                      <select
                        value={selectedBlock.colegioId || 'sin-colegio'}
                        onChange={(event) => updateBlock(selectedBlock.id, { colegioId: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-black outline-none transition-all focus:border-black"
                      >
                        <option value="sin-colegio">Sin colegio</option>
                        {colegios.map((colegio) => (
                          <option key={colegio.id} value={colegio.id}>{colegio.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <p className="font-bold text-gray-700">{DAYS[selectedBlock.dayIndex]}</p>
                      <p>{blockTimeLabel(selectedBlock)}</p>
                    </div>

                    <button
                      onClick={deleteSelectedBlock}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-700 transition-all hover:border-red-500"
                    >
                      <Trash2 size={14} /> Eliminar clase
                    </button>
                  </div>
                )}

                <div className="mt-6">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Notas adicionales</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black outline-none transition-all focus:border-black"
                    placeholder="Ej: Coordinacion, guardias, observaciones del docente..."
                  />
                </div>

                <div className="mt-6">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Colegios (arrastra al horario)</label>
                  <div className="space-y-2">
                    {colegios.length === 0 ? (
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">No hay colegios cargados.</p>
                    ) : colegios.map((colegio) => {
                      const color = colegioColorById.get(colegio.id) || '#e5e7eb'
                      const selected = selectedTemplateColegioId === colegio.id
                      return (
                        <button
                          key={colegio.id}
                          type="button"
                          draggable
                          onClick={() => setSelectedTemplateColegioId(colegio.id)}
                          onDragStart={(event) => handleTemplateDragStart(event, colegio.id)}
                          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold text-gray-700 transition-all ${selected ? 'border-black' : 'border-gray-300'}`}
                          style={{ backgroundColor: color }}
                        >
                          <span className="h-3 w-3 rounded-full border border-gray-400 bg-white/70" />
                          <span>{colegio.nombre}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
