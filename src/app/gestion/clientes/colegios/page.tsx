 'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, School, Loader2, ArrowLeft, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Colegio = {
  id?: number
  nombre?: string
  rif?: string
  contacto_nombre?: string
  telefono?: string
  monto_fijo_mensual?: number
  modalidad_pago?: string
  cantidad_ninos?: number
  detalles_contrato?: string
}

export default function RegistroColegiosContratos() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre: '', rif: '', contacto_nombre: '', telefono: '', 
    monto_fijo_mensual: '', modalidad_pago: 'mensual', 
    cantidad_ninos: '', detalles_contrato: ''
  })
  const [lista, setLista] = useState<Colegio[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const nombreRef = useRef<HTMLInputElement | null>(null)

  const cargar = async () => {
    const { data } = await supabase.from('colegios').select('*').order('nombre', { ascending: true })
    if (data) setLista(data as Colegio[])
  }
  useEffect(() => { (async () => { await cargar() })() }, [])
  const seleccionarColegio = (c: Colegio) => {
    setFormData({
      nombre: c.nombre || '',
      rif: c.rif || '',
      contacto_nombre: c.contacto_nombre || '',
      telefono: c.telefono || '',
      monto_fijo_mensual: c.monto_fijo_mensual ? String(c.monto_fijo_mensual) : '',
      modalidad_pago: c.modalidad_pago || 'mensual',
      cantidad_ninos: c.cantidad_ninos ? String(c.cantidad_ninos) : '',
      detalles_contrato: c.detalles_contrato || ''
    })
    setEditId(c.id ?? null)
    setMensaje('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => nombreRef.current?.focus(), 250)
  }
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre) { setMensaje('❌ El nombre es obligatorio'); return; }
    setCargando(true)
    if (editId) {
      const { error } = await supabase.from('colegios').update({
        nombre: formData.nombre,
        monto_fijo_mensual: parseFloat(formData.monto_fijo_mensual || '0'),
        modalidad_pago: formData.modalidad_pago,
        cantidad_ninos: parseInt(formData.cantidad_ninos || '0'),
        detalles_contrato: formData.detalles_contrato
      }).eq('id', editId)
      if (error) setMensaje('❌ ' + error.message)
      else {
        setMensaje('✅ Colegio actualizado con éxito')
        setFormData({ nombre: '', rif: '', contacto_nombre: '', telefono: '', monto_fijo_mensual: '', modalidad_pago: 'mensual', cantidad_ninos: '', detalles_contrato: '' })
        setEditId(null)
        cargar()
      }
    } else {
      const { error } = await supabase.from('colegios').insert([{
        nombre: formData.nombre,
        monto_fijo_mensual: parseFloat(formData.monto_fijo_mensual || '0'),
        modalidad_pago: formData.modalidad_pago,
        cantidad_ninos: parseInt(formData.cantidad_ninos || '0'),
        detalles_contrato: formData.detalles_contrato
      }])
      if (error) setMensaje('❌ ' + error.message)
      else {
        setMensaje('✅ Contrato registrado con éxito')
        setFormData({ nombre: '', rif: '', contacto_nombre: '', telefono: '', monto_fijo_mensual: '', modalidad_pago: 'mensual', cantidad_ninos: '', detalles_contrato: '' })
        cargar()
      }
    }
    setCargando(false)
  }

  const cancelarEdicion = () => {
    setEditId(null)
    setFormData({ nombre: '', rif: '', contacto_nombre: '', telefono: '', monto_fijo_mensual: '', modalidad_pago: 'mensual', cantidad_ninos: '', detalles_contrato: '' })
    setMensaje('')
    nombreRef.current?.blur()
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden -m-12 uppercase tracking-tight font-black text-black">
      <aside className="w-[20%] border-r border-gray-100 bg-gray-50/30 p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase">Estructura</h3>
        <p className="text-[10px] italic text-gray-400 font-medium lowercase">Vista de sedes activas...</p>
      </aside>
      <main className="w-[50%] p-12 overflow-y-auto border-r border-gray-100 bg-white">
        <header className="mb-10 text-black">
          {/* AQUÍ ESTÁ EL BOTÓN DE RETROCESO HOMOLOGADO CON PERSONAL */}
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all uppercase font-black">
            <ArrowLeft size={14} /> VOLVER ATRÁS
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-black p-2 rounded-xl text-white"><School size={20} /></div>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">Colegios y Contratos</h1>
            {editId && (
              <span className="ml-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">EDITANDO{formData.nombre ? ' — ' + formData.nombre : ''}</span>
            )}
          </div>
          <p className="text-gray-400 text-sm font-medium italic tracking-normal">Defina la sede y los términos de negociación.</p>
        </header>

        <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 text-black">
            <input ref={nombreRef} required placeholder="NOMBRE DE LA INSTITUCIÓN" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <select className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.modalidad_pago} onChange={e => setFormData({...formData, modalidad_pago: e.target.value})}>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
              <input placeholder="CANT. NIÑOS" type="number" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.cantidad_ninos} onChange={e => setFormData({...formData, cantidad_ninos: e.target.value})} />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-4 text-gray-300 font-black">$</span>
              <input required type="number" step="0.01" placeholder="MONTO CONTRATO" className="w-full bg-gray-100 rounded-xl p-4 pl-8 text-lg font-black border-none" value={formData.monto_fijo_mensual} onChange={e => setFormData({...formData, monto_fijo_mensual: e.target.value})} />
            </div>
          </div>
          <textarea placeholder="DETALLES DEL CONTRATO..." className="w-full bg-gray-50 rounded-[2rem] p-6 text-xs font-medium border-none italic text-black" value={formData.detalles_contrato} onChange={e => setFormData({...formData, detalles_contrato: e.target.value})} />
          <div className="flex gap-4">
            <button disabled={cargando} className="flex-1 bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all">
              {cargando ? <Loader2 className="animate-spin" /> : <Save size={18} className="inline mr-2"/>} {editId ? 'ACTUALIZAR CONTRATO' : 'GUARDAR CONTRATO'}
            </button>
            {editId && (
              <button type="button" onClick={cancelarEdicion} className="w-36 bg-white text-black py-5 rounded-2xl font-black italic border border-gray-200 hover:bg-gray-100 transition-all">CANCELAR EDICIÓN</button>
            )}
          </div>
          {mensaje && <p className="text-center text-[10px] p-4 bg-green-50 text-green-700 rounded-2xl">{mensaje}</p>}
        </form>
      </main>

      <aside className="w-[30%] bg-gray-50/20 p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2 font-black uppercase"><Building2 size={12}/> COLEGIOS ({lista.length})</h3>
          <div className="space-y-3">
          {lista.map((c) => (
            <div key={c.id} onClick={() => seleccionarColegio(c)} className={`p-6 rounded-3xl shadow-sm cursor-pointer transition-all ${editId === c.id ? 'bg-black text-white border-black shadow-xl scale-95' : 'bg-white border border-gray-100 hover:shadow-xl'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm uppercase leading-tight font-black">{c.nombre}</p>
                <span className={`text-[8px] px-2 py-1 rounded-full uppercase ${editId === c.id ? 'bg-white text-black' : 'bg-black text-white'}`}>{c.modalidad_pago}</span>
              </div>
              <p className="text-[9px] italic mb-4 line-clamp-2">{c.detalles_contrato}</p>
              <div className="mt-4 flex justify-between items-end border-t border-gray-50 pt-3">
                <span className="text-[10px] font-bold text-gray-400">{c.cantidad_ninos} NIÑOS</span>
                <span className="text-xl italic tracking-tighter font-black">${c.monto_fijo_mensual}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
