'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Edit3, UserMinus, Landmark, Smartphone, School, UserCheck, ChevronRight, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function GestionPersonal() {
  const router = useRouter()
  const [vista, setVista] = useState('menu') 
  const [seleccionado, setSeleccionado] = useState(null)
  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', cedula_tipo: 'V', cedula_numero: '',
    cargo: '', tipo_personal: 'profesor', monto_base_mensual: '',
    banco_nombre: '', banco_numero_cuenta: '',
    pm_telefono: '', pm_cedula: '', pm_banco: ''
  })
  const [listaPersonal, setListaPersonal] = useState([])
  const [colegios, setColegios] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargarDatos = async () => {
    const { data: pers } = await supabase.from('personal').select('*').order('estado', { ascending: true }).order('apellidos', { ascending: true })
    if (pers) setListaPersonal(pers)
    const { data: col } = await supabase.from('colegios').select('id, nombre').order('nombre')
    if (col) setColegios(col)
  }

  useEffect(() => { (async () => { await cargarDatos() })() }, [])

  const manejarSeleccion = (p: any) => { setSeleccionado(p); setVista('menu'); setMensaje('') }

  const iniciarEdicion = () => {
    if (!seleccionado) return
    setFormData({ 
      ...seleccionado, 
      monto_base_mensual: seleccionado.monto_base_mensual?.toString() || '',
      cedula_tipo: seleccionado.cedula_tipo || 'V' 
    })
    setVista('editar')
  }

  const guardar = async (e) => {
    e.preventDefault(); setCargando(true)
    const d = { ...formData, monto_base_mensual: parseFloat(formData.monto_base_mensual || '0') }
    const { error } = vista === 'editar' 
      ? await supabase.from('personal').update(d).eq('id', seleccionado?.id)
      : await supabase.from('personal').insert([{ ...d, estado: 'activo' }])

    if (error) setMensaje('❌ ' + error.message)
    else { setMensaje('✅ Éxito'); cargarDatos(); setTimeout(() => { setVista('menu'); setSeleccionado(null) }, 1000) }
    setCargando(false)
  }

  const cambiarEstado = async (st) => {
    if (!seleccionado?.id) return
    await supabase.from('personal').update({ estado: st }).eq('id', seleccionado.id)
    cargarDatos(); setSeleccionado(null)
  }
  return (
    <div className="flex h-screen bg-white overflow-hidden -m-12 uppercase tracking-tight font-black text-black">
      {/* IZQUIERDA: ÁRBOL */}
      <aside className="w-[20%] border-r border-gray-100 bg-gray-50/50 p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase flex items-center gap-2 font-black"><School size={12}/> Estructura</h3>
        <div className="space-y-3">
          {colegios.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-[11px] font-black">
              <ChevronRight size={14} className="text-gray-300"/> {c.nombre}
            </div>
          ))}
        </div>
      </aside>

      {/* CENTRO: GESTIÓN */}
      <main className="w-[50%] p-12 overflow-y-auto border-r border-gray-100 bg-white">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-4 transition-all">
              <ArrowLeft size={14}/> VOLVER ATRÁS
            </button>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">{vista === 'menu' ? 'Gestión' : 'Ficha Personal'}</h1>
          </div>
          {vista !== 'menu' && <button onClick={() => setVista('menu')} className="text-[10px] text-gray-400 font-black hover:text-black border-b border-gray-100">CANCELAR</button>}
        </header>

        {vista === 'menu' ? (
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
            <button onClick={() => { setSeleccionado(null); setVista('crear'); setFormData({nombres:'', apellidos:'', cedula_tipo:'V', cedula_numero:'', cargo:'', tipo_personal:'profesor', monto_base_mensual:'', banco_nombre:'', banco_numero_cuenta:'', pm_telefono:'', pm_cedula:'', pm_banco:''})}} className="flex items-center gap-6 p-8 bg-black text-white rounded-[2.5rem] shadow-xl hover:scale-[1.02] transition-all text-left">
              <UserPlus size={28}/> <p className="text-xl italic">1. Nuevo Registro</p>
            </button>
            <button onClick={iniciarEdicion} disabled={!seleccionado} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${seleccionado ? 'bg-white border-black shadow-xl' : 'opacity-30'}`}>
              <Edit3 size={28}/> <p className="text-xl italic">2. Editar Datos</p>
            </button>
            <button onClick={() => cambiarEstado(seleccionado?.estado === 'activo' ? 'cesado' : 'activo')} disabled={!seleccionado} className={`flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all text-left font-black ${seleccionado ? (seleccionado.estado === 'activo' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600') : 'opacity-30'}`}>
              {seleccionado?.estado === 'activo' ? <UserMinus size={28}/> : <UserCheck size={28}/>} <p className="text-xl italic">{seleccionado?.estado === 'activo' ? '3. Cesar' : '3. Rescatar'}</p>
            </button>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 font-black">
              <div className="grid grid-cols-2 gap-4 text-black">
                <input required placeholder="NOMBRES" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} />
                <input required placeholder="APELLIDOS" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
              </div>
              <div className="grid grid-cols-12 gap-2 text-black">
                <select className="col-span-3 bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.cedula_tipo} onChange={e => setFormData({...formData, cedula_tipo: e.target.value})}>
                  <option value="V">V</option><option value="E">E</option>
                </select>
                <input required placeholder="CÉDULA" className="col-span-9 bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.cedula_numero} onChange={e => setFormData({...formData, cedula_numero: e.target.value})} />
              </div>
              <input required placeholder="CARGO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none text-black" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
              <div className="relative text-black">
                <span className="absolute left-4 top-4 text-gray-300 font-black">$</span>
                <input required type="number" step="0.01" className="w-full bg-gray-100 rounded-xl p-4 pl-8 text-lg font-black border-none" value={formData.monto_base_mensual} onChange={e => setFormData({...formData, monto_base_mensual: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-2 text-black">
                <p className="text-[9px] text-gray-400 font-black uppercase"><Landmark size={12} className="inline mr-1"/> Datos Banco</p>
                <input placeholder="NOMBRE BANCO" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.banco_nombre} onChange={e => setFormData({...formData, banco_nombre: e.target.value})} />
                <input placeholder="NRO CUENTA (20 DÍGITOS)" className="w-full bg-white rounded-xl p-3 text-[10px] font-mono border-none" value={formData.banco_numero_cuenta} onChange={e => setFormData({...formData, banco_numero_cuenta: e.target.value})} />
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-2 text-black">
                <p className="text-[9px] text-gray-400 font-black uppercase"><Smartphone size={12} className="inline mr-1"/> Pago Móvil</p>
                <input placeholder="TELÉFONO" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.pm_telefono} onChange={e => setFormData({...formData, pm_telefono: e.target.value})} />
                <input placeholder="BANCO RECEPTOR" className="w-full bg-white rounded-xl p-3 text-xs font-bold border-none" value={formData.pm_banco} onChange={e => setFormData({...formData, pm_banco: e.target.value})} />
              </div>
            </div>
            <button className="w-full bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all">GUARDAR CAMBIOS</button>
            {mensaje && <p className="text-center text-[10px] p-4 bg-green-50 text-green-700 rounded-2xl font-black">{mensaje}</p>}
          </form>
        )}
      </main>
      <aside className="w-[30%] bg-gray-50/20 p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase font-black">Nómina Registrada</h3>
        <div className="space-y-4">
          {listaPersonal.map((p) => (
            <div key={p.id} onClick={() => manejarSeleccion(p)}
              className={`p-6 bg-white border rounded-[2rem] transition-all cursor-pointer flex justify-between items-center ${seleccionado?.id === p.id ? 'border-black ring-2 ring-black shadow-2xl scale-[1.02]' : 'border-gray-100'} ${p.estado === 'cesado' ? 'opacity-40 grayscale' : ''}`}>
              <div>
                <p className="text-[8px] text-gray-400 font-black uppercase mb-1">{p.estado === 'cesado' ? '⚠️ CESADO' : p.cargo || 'DOCENTE'}</p>
                <p className="text-sm font-black uppercase leading-tight text-black">{p.apellidos}<br/>{p.nombres}</p>
                <p className="text-[10px] text-gray-300 font-mono mt-2">{p.cedula_tipo}-{p.cedula_numero}</p>
              </div>
              <p className="text-xl italic font-black text-black">${p.monto_base_mensual}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
