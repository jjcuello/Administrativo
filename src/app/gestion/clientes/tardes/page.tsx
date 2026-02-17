'use client'
import { useState, useEffect, useRef } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Trophy, MapPin, Users, Clock, PlusCircle, Edit3, X, Building } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Grupo = {
  id?: number
  nombre?: string
  colegio_id?: number | string
  profesor_id?: number | string
  horario?: string
  tarifa_mensual?: number
  cupos_max?: number
  colegios?: { nombre?: string }
  personal?: { nombres?: string; apellidos?: string }
}

export default function GestionTardes() {
  const router = useRouter()
  const [vista, setVista] = useState('menu') 
  const [seleccionado, setSeleccionado] = useState<Grupo | null>(null)
  const [filtroSede, setFiltroSede] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '', colegio_id: '', profesor_id: '', horario: '', tarifa_mensual: '', cupos_max: ''
  })
  
  const [sedes, setSedes] = useState<{id: number; nombre: string}[]>([])
  const [profesores, setProfesores] = useState<{id: number; nombres: string; apellidos: string}[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const nombreRef = useRef<HTMLInputElement | null>(null)
  const debounced = useDebounce(busqueda, 350)

  const cargarDatos = async (term?: string) => {
    const { data: s } = await supabase.from('colegios').select('id, nombre').order('nombre')
    if (s) setSedes(s)
    
    const { data: p } = await supabase.from('personal').select('id, nombres, apellidos').eq('estado', 'activo').order('apellidos')
    if (p) setProfesores(p)
      
    // CONSULTA ULTRA-COMPATIBLE: Usamos la sintaxis de relación estándar de Supabase
    if (!term) {
      const { data: g } = await supabase.from('grupos_tardes').select(`
      *,
      colegios ( nombre ),
      personal ( nombres, apellidos )
    `).order('nombre')
      if (g) setGrupos(g)
      return
    }
    const q = `%${term}%`
    const { data: g } = await supabase.from('grupos_tardes').select(`
      *,
      colegios ( nombre ),
      personal ( nombres, apellidos )
    `)
    .or(`nombre.ilike.${q},horario.ilike.${q}`)
    .order('nombre')
    if (g) setGrupos(g)
  }

  useEffect(() => { (async () => { await cargarDatos() })() }, [])
  useEffect(() => { (async () => { await cargarDatos(debounced) })() }, [debounced])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true); setMensaje('')
    
    const payload = { 
      nombre: formData.nombre,
      colegio_id: formData.colegio_id,
      profesor_id: formData.profesor_id,
      horario: formData.horario,
      tarifa_mensual: parseFloat(formData.tarifa_mensual || '0'),
      cupos_max: parseInt(formData.cupos_max || '0')
    }
    
    const { error } = vista === 'editar' 
      ? await supabase.from('grupos_tardes').update(payload).eq('id', seleccionado?.id)
      : await supabase.from('grupos_tardes').insert([{ ...payload, estado: 'activo' }])

    if (error) {
      setMensaje('❌ ' + error.message)
    } else {
      setMensaje('✅ ÉXITO AL GUARDAR')
      await cargarDatos()
      setTimeout(() => { setVista('menu'); setSeleccionado(null) }, 1000)
    }
    setCargando(false)
  }

  const seleccionarParaEditar = () => {
    if (!seleccionado) return
    setFormData({
      nombre: seleccionado.nombre,
      colegio_id: seleccionado.colegio_id,
      profesor_id: seleccionado.profesor_id,
      horario: seleccionado.horario,
      tarifa_mensual: seleccionado.tarifa_mensual.toString(),
      cupos_max: seleccionado.cupos_max.toString()
    })
    setVista('editar')
    setTimeout(() => nombreRef.current?.focus(), 200)
  }

  const seleccionarGrupo = (g: Grupo) => {
    setSeleccionado(g)
    setFormData({
      nombre: g.nombre || '',
      colegio_id: g.colegio_id || '',
      profesor_id: g.profesor_id || '',
      horario: g.horario || '',
      tarifa_mensual: g.tarifa_mensual ? String(g.tarifa_mensual) : '',
      cupos_max: g.cupos_max ? String(g.cupos_max) : ''
    })
    setVista('editar')
    setTimeout(() => nombreRef.current?.focus(), 200)
  }

  const cancelarEdicion = () => {
    setSeleccionado(null)
    setFormData({ nombre: '', colegio_id: '', profesor_id: '', horario: '', tarifa_mensual: '', cupos_max: '' })
    setVista('menu')
    setMensaje('')
    nombreRef.current?.blur()
  }

  const gruposMostrados = filtroSede ? grupos.filter(g => g.colegio_id === filtroSede) : grupos

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      {/* IZQUIERDA */}
      <aside className="md:w-1/5 w-full md:border-r border-b md:border-b-0 border-gray-100 bg-gray-50/50 p-6 md:p-8 overflow-y-auto">
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
            <button onClick={() => { setSeleccionado(null); setVista('crear'); setFormData({nombre:'', colegio_id:'', profesor_id:'', horario:'', tarifa_mensual:'', cupos_max:''})}} className="flex items-center gap-6 p-8 bg-black text-white rounded-[2.5rem] shadow-xl hover:scale-[1.02] transition-all text-left">
              <PlusCircle size={28}/> <p className="text-xl italic font-black uppercase">Nuevo Grupo</p>
            </button>
            <button onClick={seleccionarParaEditar} disabled={!seleccionado} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${seleccionado ? 'bg-white border-black shadow-xl hover:scale-[1.02]' : 'opacity-30'}`}>
              <Edit3 size={28}/> <p className="text-xl italic uppercase font-black">Editar Selección</p>
            </button>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 font-black">
              <input ref={nombreRef} required placeholder="NOMBRE DEL GRUPO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none text-black" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              <div className="grid grid-cols-2 gap-4 text-black">
                <select required className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.colegio_id} onChange={e => setFormData({...formData, colegio_id: e.target.value})}>
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
                <input required type="number" placeholder="CUPOS MÁX" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-black border-none text-black" value={formData.cupos_max} onChange={e => setFormData({...formData, cupos_max: e.target.value})} />
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
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> {g.colegios?.nombre || 'SEDE'}</p>
                <span className="text-xl italic font-black text-black tracking-tighter">${g.tarifa_mensual}</span>
              </div>
              <h4 className="text-base font-black uppercase leading-tight text-black mb-4">{g.nombre}</h4>
              <div className="flex items-center gap-4 mb-4">
                <p className="text-[9px] font-black uppercase flex items-center gap-1 text-gray-500 font-black"><Clock size={12}/> {g.horario}</p>
                <p className="text-[9px] font-black uppercase flex items-center gap-1 text-gray-500 font-black"><Users size={12}/> 0 / {g.cupos_max}</p>
              </div>
              <div className="border-t border-gray-50 pt-4 flex justify-between items-end">
                <div>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5 font-black">PROFESOR ASIGNADO</p>
                  <p className="text-[10px] font-black uppercase text-black">{g.personal?.apellidos} {g.personal?.nombres}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
