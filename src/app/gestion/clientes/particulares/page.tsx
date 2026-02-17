'use client'
import { useState, useEffect, useRef } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Crown, Monitor, MapPin, Building, Clock, Users, UserCheck, PlusCircle, Edit3, X, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Clase = {
  id?: number
  nombre?: string
  modalidad?: string
  profesor_id?: number | string
  tarifa?: number
  tipo_cobro?: string
  estado?: string
  personal?: { nombres?: string; apellidos?: string }
}

export default function GestionParticulares() {
  const router = useRouter()
  const [vista, setVista] = useState('menu') 
  const [seleccionado, setSeleccionado] = useState<Clase | null>(null)
  const [filtroModalidad, setFiltroModalidad] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '', modalidad: 'Virtual', profesor_id: '', tarifa: '', tipo_cobro: 'Por Hora'
  })
  
  const [profesores, setProfesores] = useState<{id: number; nombres: string; apellidos: string}[]>([])
  const [clases, setClases] = useState<Clase[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const nombreRef = useRef<HTMLInputElement | null>(null)

  const cargarDatos = async (term?: string) => {
    // 1. Profesores activos
    const { data: prof } = await supabase.from('personal').select('id, nombres, apellidos').eq('estado', 'activo').order('apellidos')
    if (prof) setProfesores(prof)
    
    // 2. Clases VIP con datos del profesor
    if (!term) {
      const { data: cls } = await supabase.from('clases_particulares').select(`
        *,
        personal (nombres, apellidos)
      `).order('nombre')
      if (cls) setClases(cls)
      return
    }
    const q = `%${term}%`
    const { data: cls } = await supabase.from('clases_particulares').select(`
      *,
      personal (nombres, apellidos)
    `)
    .or(`nombre.ilike.${q},modalidad.ilike.${q}`)
    .order('nombre')
    if (cls) setClases(cls)
  }

  useEffect(() => { (async () => { await cargarDatos() })() }, [])
  const debounced = useDebounce(busqueda, 350)
  useEffect(() => { (async () => { await cargarDatos(debounced) })() }, [debounced])
  const iniciarEdicion = () => {
    if (!seleccionado) return
    setFormData({ 
      ...seleccionado, 
      tarifa: seleccionado.tarifa?.toString() || ''
    })
    setVista('editar')
    setTimeout(() => nombreRef.current?.focus(), 200)
  }

  const seleccionarClase = (c: Clase) => {
    setSeleccionado(c)
    setFormData({ 
      ...c,
      tarifa: c.tarifa?.toString() || ''
    })
    setVista('editar')
    setMensaje('')
    setTimeout(() => nombreRef.current?.focus(), 200)
  }

  const cancelarEdicion = () => {
    setSeleccionado(null)
    setFormData({ nombre: '', modalidad: 'Virtual', profesor_id: '', tarifa: '', tipo_cobro: 'Por Hora' })
    setVista('menu')
    setMensaje('')
    nombreRef.current?.blur()
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    const d = { 
      ...formData, 
      tarifa: parseFloat(formData.tarifa || '0')
    }
    
    const { error } = vista === 'editar' 
      ? await supabase.from('clases_particulares').update(d).eq('id', seleccionado?.id)
      : await supabase.from('clases_particulares').insert([{ ...d, estado: 'activo' }])

    if (error) setMensaje('❌ ' + error.message)
    else { setMensaje('✅ Servicio VIP guardado'); cargarDatos(); setTimeout(() => { setVista('menu'); setSeleccionado(null) }, 1000) }
    setCargando(false)
  }

  const cambiarEstado = async (st: string) => {
    if (!seleccionado?.id) return
    await supabase.from('clases_particulares').update({ estado: st }).eq('id', seleccionado.id)
    cargarDatos(); setSeleccionado(null)
  }

  // Filtrar clases para la columna derecha
  const clasesMostradas = filtroModalidad ? clases.filter(c => c.modalidad === filtroModalidad) : clases

  const getIconoModalidad = (mod) => {
    if (mod === 'Virtual') return <Monitor size={14} className="inline mr-1"/>
    if (mod === 'A Domicilio') return <MapPin size={14} className="inline mr-1"/>
    return <Building size={14} className="inline mr-1"/>
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      {/* 1. IZQUIERDA: FILTRO */}
      <aside className="md:w-1/5 w-full md:border-r border-b md:border-b-0 border-gray-100 bg-gray-50/50 p-6 md:p-8 overflow-y-auto">
        <div className="mb-4">
          <div className="relative mb-4">
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar servicios VIP..." className="w-full pl-4 pr-3 py-3 rounded-2xl border border-gray-100 bg-white text-sm" />
          </div>
          <button onClick={() => setFiltroModalidad(null)} className={`w-full text-left p-3 rounded-2xl transition-all text-[10px] tracking-widest flex items-center gap-2 ${filtroModalidad === null ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-black'}`}>
            <Crown size={12}/> TODAS LAS MODALIDADES
          </button>
        </div>
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-4 uppercase flex items-center gap-2"><Zap size={12}/> Filtrar Catálogo</h3>
        <div className="space-y-2">
          {['Virtual', 'A Domicilio', 'Sede Principal'].map(mod => (
            <button key={mod} onClick={() => setFiltroModalidad(mod)} 
              className={`w-full text-left p-3 rounded-2xl shadow-sm text-[11px] font-black transition-all border ${filtroModalidad === mod ? 'bg-black text-white border-black' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
              {getIconoModalidad(mod)} {mod}
            </button>
          ))}
        </div>
      </aside>
      {/* 2. CENTRO: COMANDOS Y FORMULARIO */}
      <main className="md:w-3/5 w-full p-6 md:p-12 overflow-y-auto md:border-r border-gray-100 bg-white">
        <header className="mb-10 text-black">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all uppercase font-black tracking-widest">
            <ArrowLeft size={14} /> VOLVER ATRÁS
          </button>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-black p-2 rounded-xl text-white"><Crown size={20} /></div>
                <h1 className="text-3xl italic tracking-tighter uppercase font-black">{vista === 'menu' ? 'Servicios VIP' : 'Ficha de Servicio'}</h1>
                {vista === 'editar' && (
                  <span className="ml-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">EDITANDO{formData.nombre ? ' — ' + formData.nombre : ''}</span>
                )}
              </div>
              <p className="text-gray-400 text-sm font-medium italic tracking-normal">Clases particulares, tutorías y entrenamientos personalizados.</p>
            </div>
            {vista !== 'menu' && <button onClick={() => setVista('menu')} className="text-[10px] text-gray-400 font-black hover:text-black border-b border-gray-100">CANCELAR</button>}
          </div>
        </header>

        {vista === 'menu' ? (
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto mt-8">
            <button onClick={() => { setSeleccionado(null); setVista('crear'); setFormData({nombre:'', modalidad:'Virtual', profesor_id:'', tarifa:'', tipo_cobro:'Por Hora'})}} 
              className="flex items-center gap-6 p-8 bg-black text-white rounded-[2.5rem] shadow-xl hover:scale-[1.02] transition-all text-left">
              <PlusCircle size={28}/> <p className="text-xl italic">1. Nuevo Servicio VIP</p>
            </button>
            <button onClick={iniciarEdicion} disabled={!seleccionado} 
              className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${seleccionado ? 'bg-white border-black shadow-xl' : 'opacity-30'}`}>
              <Edit3 size={28}/> <p className="text-xl italic">2. Editar Servicio</p>
            </button>
            <button onClick={() => cambiarEstado(seleccionado?.estado === 'activo' ? 'inactivo' : 'activo')} disabled={!seleccionado} 
              className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${seleccionado ? (seleccionado.estado === 'activo' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600') : 'opacity-30'}`}>
              <UserCheck size={28}/> <p className="text-xl italic">{seleccionado?.estado === 'activo' ? '3. Desactivar Servicio' : '3. Reactivar Servicio'}</p>
            </button>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 font-black text-black">
              
              <input ref={nombreRef} required placeholder="NOMBRE DEL SERVICIO (Ej: Clase Piano 1 a 1)" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <select required className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.modalidad} onChange={e => setFormData({...formData, modalidad: e.target.value})}>
                  <option value="Virtual">💻 Virtual (Zoom/Meet)</option>
                  <option value="A Domicilio">🚗 A Domicilio</option>
                  <option value="Sede Principal">🏢 Sede Principal</option>
                </select>
                <select required className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.profesor_id} onChange={e => setFormData({...formData, profesor_id: e.target.value})}>
                  <option value="" disabled>SELECCIONE PROFESOR</option>
                  {profesores.map(p => <option key={p.id} value={p.id}>{p.apellidos}, {p.nombres}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-300 font-black">$</span>
                  <input required type="number" step="0.01" placeholder="TARIFA" className="w-full bg-gray-50 rounded-xl p-4 pl-8 text-lg font-black border-none" value={formData.tarifa} onChange={e => setFormData({...formData, tarifa: e.target.value})} />
                </div>
                <select required className="w-full bg-gray-50 rounded-xl p-4 text-sm font-black border-none" value={formData.tipo_cobro} onChange={e => setFormData({...formData, tipo_cobro: e.target.value})}>
                  <option value="Por Hora">Por Hora</option>
                  <option value="Por Clase">Por Clase Fija</option>
                  <option value="Mensual">Paquete Mensual</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="flex-1 bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all" disabled={cargando}>
                {cargando ? <Loader2 className="animate-spin mx-auto" /> : (vista === 'editar' ? 'ACTUALIZAR SERVICIO VIP' : 'GUARDAR SERVICIO VIP')}
              </button>
              {vista === 'editar' && (
                <button type="button" onClick={cancelarEdicion} className="w-36 bg-white text-black py-5 rounded-2xl font-black italic border border-gray-200 hover:bg-gray-100 transition-all">CANCELAR EDICIÓN</button>
              )}
            </div>
            {mensaje && <p className="text-center text-[10px] p-4 bg-green-50 text-green-700 rounded-2xl font-black">{mensaje}</p>}
          </form>
        )}
      </main>
      {/* 3. DERECHA: CATÁLOGO */}
      <aside className="md:w-1/5 w-full bg-gray-50/20 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase font-black flex justify-between">
          <span>Catálogo de Servicios</span>
          <span className="bg-black text-white px-2 py-0.5 rounded-full">{clasesMostradas.length}</span>
        </h3>
        <div className="space-y-4">
          {clasesMostradas.map((c) => (
            <div key={c.id} onClick={() => { seleccionarClase(c); setMensaje(''); }}
              className={`p-6 bg-white border rounded-[2rem] transition-all cursor-pointer ${seleccionado?.id === c.id ? 'border-black ring-2 ring-black shadow-2xl scale-[1.02]' : 'border-gray-100 hover:border-gray-300 shadow-sm'} ${c.estado !== 'activo' ? 'opacity-50 grayscale' : ''}`}>
              
              <div className="flex justify-between items-start mb-3">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{getIconoModalidad(c.modalidad)} {c.modalidad}</p>
                <div className="text-right">
                  <span className="text-xl italic font-black text-black block">${c.tarifa}</span>
                  <span className="text-[8px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase">{c.tipo_cobro}</span>
                </div>
              </div>
              
              <h4 className="text-base font-black uppercase leading-tight text-black mb-4 pr-10">{c.nombre}</h4>
              
              <div className="border-t border-gray-50 pt-3">
                <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Talento Asignado</p>
                <p className="text-[11px] font-black uppercase"><Crown size={10} className="inline mr-1 text-yellow-500"/> {c.personal?.apellidos} {c.personal?.nombres}</p>
              </div>

            </div>
          ))}
          {clasesMostradas.length === 0 && (
            <div className="text-center p-8 border border-dashed border-gray-200 rounded-3xl">
              <p className="text-xs text-gray-400 italic font-medium lowercase">No hay servicios registrados.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
