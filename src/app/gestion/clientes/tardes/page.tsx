'use client'
import { useState, useEffect, useRef } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Trophy, MapPin, Users, Clock, PlusCircle, Edit3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatUSD } from '@/lib/currency'

type Grupo = {
  id?: string
  nombre?: string
  sede_id?: string
  profesor_id?: string
  horario?: string
  tarifa_mensual?: number
  cupos_maximos?: number
  colegios?: { nombre?: string }
  personal?: { nombres?: string; apellidos?: string }
}

type Sede = { id: string; nombre: string; tipo?: string }
type InscripcionRow = {
  id?: string
  grupo_id?: string
  estado?: string
  alumnos?: { id?: string; nombres?: string; apellidos?: string }
}

export default function GestionTardes() {
  const router = useRouter()
  const [vista, setVista] = useState('menu') 
  const [seleccionado, setSeleccionado] = useState<Grupo | null>(null)
  const [filtroSede, setFiltroSede] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '', sede_id: '', profesor_id: '', horario: '', tarifa_mensual: '', cupos_maximos: ''
  })
  
  const [sedes, setSedes] = useState<Sede[]>([])
  const [profesores, setProfesores] = useState<{id: string; nombres: string; apellidos: string}[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [inscritosPorGrupo, setInscritosPorGrupo] = useState<Record<string, number>>({})
  const [inscripcionesDetalle, setInscripcionesDetalle] = useState<InscripcionRow[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const nombreRef = useRef<HTMLInputElement | null>(null)
  const debounced = useDebounce(busqueda, 350)

  const limpiarFormulario = () => {
    setFormData({ nombre: '', sede_id: '', profesor_id: '', horario: '', tarifa_mensual: '', cupos_maximos: '' })
  }

    const esCupoSinLimite = (cupos?: number | null) => Number(cupos || 0) <= 0
    const formatearCupo = (cupos?: number | null) => (esCupoSinLimite(cupos) ? 'SIN LÍMITE' : String(cupos || 0))

  const cargarDatos = async (term?: string) => {
    setErrorCarga('')
    const { data: s, error: sedesErr } = await supabase.from('colegios').select('id, nombre, tipo').order('nombre')
    if (sedesErr) setErrorCarga(sedesErr.message)
    if (s) setSedes((s as Sede[]).filter(item => (item.tipo || 'colegio') !== 'club'))
    
    const { data: p, error: profErr } = await supabase.from('personal').select('id, nombres, apellidos').eq('estado', 'activo').order('apellidos')
    if (profErr) setErrorCarga(profErr.message)
    if (p) setProfesores(p)
      
    // CONSULTA ULTRA-COMPATIBLE: Usamos la sintaxis de relación estándar de Supabase
    if (!term) {
      const { data: g, error: gruposErr } = await supabase.from('grupos_tardes').select(`
      *,
      colegios ( nombre ),
      personal ( nombres, apellidos )
    `).order('nombre')
      if (gruposErr) setErrorCarga(gruposErr.message)
      if (g) setGrupos(g)
      return
    }
    const q = `%${term}%`
    const { data: g, error: gruposErr } = await supabase.from('grupos_tardes').select(`
      *,
      colegios ( nombre ),
      personal ( nombres, apellidos )
    `)
    .or(`nombre.ilike.${q},horario.ilike.${q}`)
    .order('nombre')
    if (gruposErr) setErrorCarga(gruposErr.message)
    if (g) setGrupos(g)
  }

  const cargarInscripciones = async () => {
    const { data: ins, error: insErr } = await supabase.from('inscripciones').select(`
      id,
      estado,
      grupo_id,
      alumnos ( id, nombres, apellidos )
    `).eq('estado', 'activa')
    if (insErr) {
      setErrorCarga(insErr.message)
      return
    }
    const conteos: Record<string, number> = {}
    for (const row of (ins || []) as InscripcionRow[]) {
      const grupoId = row.grupo_id
      if (!grupoId) continue
      conteos[grupoId] = (conteos[grupoId] || 0) + 1
    }
    setInscritosPorGrupo(conteos)
    setInscripcionesDetalle((ins || []) as InscripcionRow[])
  }

  useEffect(() => { (async () => { await cargarDatos(); await cargarInscripciones() })() }, [])
  useEffect(() => { (async () => { await cargarDatos(debounced) })() }, [debounced])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setMensaje('')

    if (!formData.nombre || !formData.sede_id || !formData.profesor_id || !formData.horario) {
      setMensaje('❌ Completa nombre, sede, profesor y horario')
      setCargando(false)
      return
    }
    if (Number(formData.tarifa_mensual || 0) < 0 || Number(formData.cupos_maximos || 0) < 0) {
      setMensaje('❌ Tarifa o cupos no pueden ser negativos')
      setCargando(false)
      return
    }
    
    const payload = { 
      nombre: formData.nombre,
      sede_id: formData.sede_id || null,
      profesor_id: formData.profesor_id || null,
      horario: formData.horario,
      tarifa_mensual: parseFloat(formData.tarifa_mensual || '0'),
      cupos_maximos: parseInt(formData.cupos_maximos || '0')
    }
    
    const { error } = vista === 'editar' 
      ? await supabase.from('grupos_tardes').update(payload).eq('id', seleccionado?.id)
      : await supabase.from('grupos_tardes').insert([{ ...payload, estado: 'activo' }])

    if (error) {
      setMensaje('❌ ' + error.message)
    } else {
      setMensaje('✅ ÉXITO AL GUARDAR')
      await cargarDatos()
      setTimeout(() => { setVista('menu'); setSeleccionado(null); limpiarFormulario() }, 700)
    }
    setCargando(false)
  }

  const seleccionarParaEditar = () => {
    if (!seleccionado) return
    setFormData({
      nombre: seleccionado.nombre || '',
      sede_id: seleccionado.sede_id || '',
      profesor_id: seleccionado.profesor_id || '',
      horario: seleccionado.horario || '',
      tarifa_mensual: seleccionado.tarifa_mensual ? String(seleccionado.tarifa_mensual) : '',
      cupos_maximos: seleccionado.cupos_maximos === 0 ? '0' : (seleccionado.cupos_maximos ? String(seleccionado.cupos_maximos) : '')
    })
    setVista('editar')
    setTimeout(() => nombreRef.current?.focus(), 200)
  }

  const seleccionarGrupo = (g: Grupo) => {
    setSeleccionado(g)
    setFormData({
      nombre: g.nombre || '',
      sede_id: g.sede_id || '',
      profesor_id: g.profesor_id || '',
      horario: g.horario || '',
      tarifa_mensual: g.tarifa_mensual ? String(g.tarifa_mensual) : '',
      cupos_maximos: g.cupos_maximos === 0 ? '0' : (g.cupos_maximos ? String(g.cupos_maximos) : '')
    })
    setVista('editar')
    setTimeout(() => nombreRef.current?.focus(), 200)
  }

  const cancelarEdicion = () => {
    setSeleccionado(null)
    limpiarFormulario()
    setVista('menu')
    setMensaje('')
    nombreRef.current?.blur()
  }

  const gruposMostrados = filtroSede ? grupos.filter(g => g.sede_id === filtroSede) : grupos
  const totalGrupos = gruposMostrados.length
  const totalCuposFinitos = gruposMostrados.reduce((acc, g) => {
    const cupos = Number(g.cupos_maximos || 0)
    return cupos > 0 ? acc + cupos : acc
  }, 0)
  const totalGruposSinLimite = gruposMostrados.filter((g) => esCupoSinLimite(g.cupos_maximos)).length
  const totalMensual = gruposMostrados.reduce((acc, g) => {
    const inscritos = g.id ? (inscritosPorGrupo[g.id] || 0) : 0
    return acc + Number(g.tarifa_mensual || 0) * inscritos
  }, 0)

  const obtenerGrupoId = (row: InscripcionRow) => row.grupo_id
  const obtenerSedeId = (row: InscripcionRow) => {
    const grupoId = obtenerGrupoId(row)
    return grupos.find(g => g.id === grupoId)?.sede_id
  }
  const inscripcionesMostradas = inscripcionesDetalle.filter(row => {
    if (!row.alumnos) return false
    if (!filtroSede) return true
    return obtenerSedeId(row) === filtroSede
  })
  const alumnosUnicos = (() => {
    const mapa = new Map<string, { id?: string; nombres?: string; apellidos?: string; grupos: Set<string> }>()
    for (const row of inscripcionesMostradas) {
      const alumnoId = row.alumnos?.id || `${row.alumnos?.apellidos || ''}-${row.alumnos?.nombres || ''}`.trim()
      if (!alumnoId) continue
      if (!mapa.has(alumnoId)) {
        mapa.set(alumnoId, { ...row.alumnos, grupos: new Set<string>() })
      }
      const grupoId = obtenerGrupoId(row)
      const grupoNombre = grupos.find(g => g.id === grupoId)?.nombre
      if (grupoNombre) mapa.get(alumnoId)?.grupos.add(grupoNombre)
    }
    return Array.from(mapa.values()).sort((a, b) => `${a.apellidos || ''} ${a.nombres || ''}`.localeCompare(`${b.apellidos || ''} ${b.nombres || ''}`))
  })()
  const formatearMonto = formatUSD

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      {/* IZQUIERDA */}
      <aside className="md:w-1/5 w-full md:border-r border-b md:border-b-0 border-gray-100 bg-gray-50/50 p-6 md:p-8 overflow-y-auto">
        <div className="space-y-3 mb-6 text-[10px]">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Grupos activos</p>
            <p className="text-lg font-black text-black">{totalGrupos}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Cupos finitos</p>
            <p className="text-lg font-black text-black">{totalCuposFinitos}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Grupos sin límite</p>
            <p className="text-lg font-black text-black">{totalGruposSinLimite}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Monto mensual total</p>
            <p className="text-lg font-black text-black">${formatearMonto(totalMensual)}</p>
          </div>
          {errorCarga && <p className="text-[10px] p-3 bg-red-50 text-red-700 rounded-2xl">❌ {errorCarga}</p>}
        </div>
        <button onClick={() => setFiltroSede(null)} className={`w-full text-left p-3 mb-4 rounded-2xl transition-all text-[10px] tracking-widest font-black ${filtroSede === null ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>TODAS LAS SEDES</button>
        <div className="space-y-2">
          {sedes.map(s => (
            <button key={s.id} onClick={() => setFiltroSede(s.id)} className={`w-full text-left p-3 rounded-2xl text-[10px] font-black transition-all border ${filtroSede === s.id ? 'bg-black text-white' : 'bg-white border-gray-100 hover:border-gray-300'}`}>{s.nombre}</button>
          ))}
        </div>
      </aside>

      {/* CENTRO */}
      <main className="md:w-3/5 w-full p-6 md:p-12 overflow-y-auto md:border-r border-gray-100 bg-white">
        <header className="mb-10 text-black">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all tracking-widest font-black uppercase"><ArrowLeft size={14} /> VOLVER ATRÁS</button>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-black p-2 rounded-xl text-white"><Trophy size={20} /></div>
                <h1 className="text-3xl italic tracking-tighter uppercase font-black">{vista === 'menu' ? 'Academias Tardes' : 'Ficha de Grupo'}</h1>
                {vista === 'editar' && (
                  <span className="ml-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">EDITANDO{formData.nombre ? ' — ' + formData.nombre : ''}</span>
                )}
              </div>
              <div className="max-w-md mt-4">
                <div className="relative">
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar grupos por nombre, horario o sede..." className="w-full pl-4 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-sm" />
                </div>
              </div>
            </div>
            {vista !== 'menu' && <button onClick={() => setVista('menu')} className="text-[10px] text-gray-400 font-black hover:text-black border-b border-gray-100 uppercase">CANCELAR</button>}
          </div>
        </header>

        {vista === 'menu' ? (
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto mt-8">
            <button onClick={() => { setSeleccionado(null); setVista('crear'); setFormData({nombre:'', sede_id:'', profesor_id:'', horario:'', tarifa_mensual:'', cupos_maximos:''})}} className="flex items-center gap-6 p-8 bg-black text-white rounded-[2.5rem] shadow-xl hover:scale-[1.02] transition-all text-left">
              <PlusCircle size={28}/> <p className="text-xl italic font-black uppercase">Nuevo Grupo</p>
            </button>
            <button onClick={seleccionarParaEditar} disabled={!seleccionado} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${seleccionado ? 'bg-white border-black shadow-xl hover:scale-[1.02]' : 'opacity-30'}`}>
              <Edit3 size={28}/> <p className="text-xl italic uppercase font-black">Editar Selección</p>
            </button>
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alumnos inscritos</p>
                <span className="text-[10px] font-black uppercase text-black">{alumnosUnicos.length}</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {alumnosUnicos.map(alumno => {
                  const nombre = `${alumno.apellidos || ''} ${alumno.nombres || ''}`.trim() || 'Alumno'
                  const grupos = Array.from(alumno.grupos)
                  const detalle = grupos.length ? `${grupos.length} grupos` : 'Grupo'
                  const key = alumno.id || nombre
                  return (
                    <div key={key} className="p-3 rounded-2xl border border-gray-100 bg-gray-50">
                      <p className="text-[11px] font-black uppercase text-black">{nombre}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{detalle}</p>
                    </div>
                  )
                })}
                {alumnosUnicos.length === 0 && (
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center p-6">Sin inscripciones</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 font-black">
              <input ref={nombreRef} required placeholder="NOMBRE DEL GRUPO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none text-black" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              <div className="grid grid-cols-2 gap-4 text-black">
                <select required className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.sede_id} onChange={e => setFormData({...formData, sede_id: e.target.value})}>
                  <option value="">SEDE / COLEGIO</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <select required className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.profesor_id} onChange={e => setFormData({...formData, profesor_id: e.target.value})}>
                  <option value="">PROFESOR</option>
                  {profesores.map(p => <option key={p.id} value={p.id}>{p.apellidos} {p.nombres}</option>)}
                </select>
              </div>
              <input required placeholder="HORARIO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none text-black" value={formData.horario} onChange={e => setFormData({...formData, horario: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" step="0.01" placeholder="TARIFA $" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-black border-none text-black" value={formData.tarifa_mensual} onChange={e => setFormData({...formData, tarifa_mensual: e.target.value})} />
                <input required type="number" min="0" placeholder="CUPOS MÁX (0 = SIN LÍMITE)" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-black border-none text-black" value={formData.cupos_maximos} onChange={e => setFormData({...formData, cupos_maximos: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <button disabled={cargando} className="flex-1 bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all uppercase">
                {cargando ? <Loader2 className="animate-spin mx-auto" /> : (vista === 'editar' ? 'ACTUALIZAR GRUPO' : 'GUARDAR GRUPO')}
              </button>
              {vista === 'editar' && (
                <button type="button" onClick={cancelarEdicion} className="w-36 bg-white text-black py-5 rounded-2xl font-black italic border border-gray-200 hover:bg-gray-100 transition-all">CANCELAR EDICIÓN</button>
              )}
            </div>
            {mensaje && <p className="text-center text-[10px] p-4 bg-gray-50 text-black rounded-2xl font-black mt-4 uppercase border border-gray-200">{mensaje}</p>}
          </form>
        )}
      </main>

      {/* DERECHA */}
      <aside className="md:w-1/5 w-full bg-gray-50/20 p-6 md:p-8 overflow-y-auto text-black">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase font-black">CATÁLOGO ACTIVO ({gruposMostrados.length})</h3>
        <div className="space-y-4">
          {gruposMostrados.map((g) => (
            <div key={g.id} onClick={() => seleccionarGrupo(g)} className={`p-6 rounded-[2rem] transition-all cursor-pointer ${seleccionado?.id === g.id ? 'bg-black text-white border-black ring-2 ring-black shadow-2xl scale-[1.02]' : 'bg-white border border-gray-100 hover:border-gray-300 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${seleccionado?.id === g.id ? 'text-gray-300' : 'text-gray-400'}`}><MapPin size={10}/> {g.colegios?.nombre || 'SEDE'}</p>
                <span className={`text-xl italic font-black tracking-tighter ${seleccionado?.id === g.id ? 'text-white' : 'text-black'}`}>${formatearMonto(g.tarifa_mensual)}</span>
              </div>
              <h4 className={`text-base font-black uppercase leading-tight mb-4 ${seleccionado?.id === g.id ? 'text-white' : 'text-black'}`}>{g.nombre}</h4>
              {esCupoSinLimite(g.cupos_maximos) && (
                <span className={`inline-flex mb-3 rounded-full px-3 py-1 text-[8px] font-black tracking-widest uppercase ${seleccionado?.id === g.id ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  Sin limite
                </span>
              )}
              <div className="flex items-center gap-4 mb-4">
                <p className={`text-[9px] font-black uppercase flex items-center gap-1 ${seleccionado?.id === g.id ? 'text-gray-300' : 'text-gray-500'}`}><Clock size={12}/> {g.horario}</p>
                <p className={`text-[9px] font-black uppercase flex items-center gap-1 ${seleccionado?.id === g.id ? 'text-gray-300' : 'text-gray-500'}`}><Users size={12}/> {(g.id ? inscritosPorGrupo[g.id] || 0 : 0)} / {formatearCupo(g.cupos_maximos)}</p>
              </div>
              <div className="border-t border-gray-50 pt-4 flex justify-between items-end">
                <div>
                  <p className={`text-[8px] uppercase tracking-widest mb-0.5 font-black ${seleccionado?.id === g.id ? 'text-gray-300' : 'text-gray-400'}`}>PROFESOR ASIGNADO</p>
                  <p className={`text-[10px] font-black uppercase ${seleccionado?.id === g.id ? 'text-white' : 'text-black'}`}>{g.personal?.apellidos} {g.personal?.nombres}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
