'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Landmark, Building, FileText, Phone, Hash } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RegistroClubes() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre: '', rif: '', contacto_nombre: '', telefono: '', 
    monto_fijo_mensual: '', detalles_contrato: ''
  })
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargar = async () => {
    const { data } = await supabase.from('colegios').select('*').eq('tipo', 'club').order('nombre', { ascending: true })
    if (data) setLista(data)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre) { setMensaje('❌ El nombre es obligatorio'); return; }
    setCargando(true)
    const { error } = await supabase.from('colegios').insert([{
      nombre: formData.nombre,
      rif: formData.rif,
      contacto_nombre: formData.contacto_nombre,
      telefono: formData.telefono,
      monto_fijo_mensual: parseFloat(formData.monto_fijo_mensual || '0'),
      modalidad_pago: 'mensual',
      tipo: 'club',
      detalles_contrato: formData.detalles_contrato
    }])
    if (error) setMensaje('❌ ' + error.message)
    else {
      setMensaje('✅ Club registrado con éxito')
      setFormData({ nombre: '', rif: '', contacto_nombre: '', telefono: '', monto_fijo_mensual: '', detalles_contrato: '' })
      cargar()
    }
    setCargando(false)
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden -m-12 uppercase tracking-tight font-black text-black">
      <aside className="w-[20%] border-r border-gray-100 bg-gray-50/30 p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase font-black"><Landmark size={12} className="inline mr-2"/> Estructura B2B</h3>
        <p className="text-[10px] italic text-gray-400 font-medium lowercase">Directorio de clubes asociados...</p>
      </aside>

      <main className="w-[50%] p-12 overflow-y-auto border-r border-gray-100 bg-white">
        <header className="mb-10 text-black">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all uppercase font-black tracking-widest">
            <ArrowLeft size={14} /> VOLVER ATRÁS
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-black p-2 rounded-xl text-white"><Landmark size={20} /></div>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">Clubes B2B</h1>
          </div>
          <p className="text-gray-400 text-sm font-medium italic tracking-normal">Registra el convenio base. La facturación exacta se ajustará mes a mes.</p>
        </header>

        <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 text-black">
            
            <input required placeholder="NOMBRE DEL CLUB (Ej: Valle Arriba)" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="RIF DEL CLUB" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.rif} onChange={e => setFormData({...formData, rif: e.target.value})} />
              <input placeholder="TELÉFONO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
            </div>

            <input placeholder="PERSONA DE CONTACTO (Ej: Gerente de Deportes)" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.contacto_nombre} onChange={e => setFormData({...formData, contacto_nombre: e.target.value})} />

            <div className="relative">
              <span className="absolute left-4 top-4 text-gray-300 font-black">$</span>
              <input required type="number" step="0.01" placeholder="CANON BASE (REFERENCIA MES COMPLETO)" className="w-full bg-gray-100 rounded-xl p-4 pl-8 text-lg font-black border-none" value={formData.monto_fijo_mensual} onChange={e => setFormData({...formData, monto_fijo_mensual: e.target.value})} />
            </div>
            <p className="text-[9px] text-gray-400 font-bold italic ml-2 mt-1 lowercase">* Este monto base podrá editarse mensualmente al generar la factura según los días de clases dados.</p>
          </div>

          <textarea placeholder="DETALLES DEL CONVENIO (Porcentaje, acuerdos de pago, etc)..." className="w-full bg-gray-50 rounded-[2rem] p-6 text-xs font-medium border-none italic text-black" value={formData.detalles_contrato} onChange={e => setFormData({...formData, detalles_contrato: e.target.value})} />
          
          <button disabled={cargando} className="w-full bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all">
            {cargando ? <Loader2 className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><Save size={18}/> REGISTRAR CONTRATO BASE</span>}
          </button>
          {mensaje && <p className="text-center text-[10px] p-4 bg-green-50 text-green-700 rounded-2xl font-black">{mensaje}</p>}
        </form>
      </main>
      <aside className="w-[30%] bg-gray-50/20 p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2 font-black uppercase"><Building size={12}/> CLUBES ASOCIADOS ({lista.length})</h3>
        <div className="space-y-4">
          {lista.map((c) => (
            <div key={c.id} className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm uppercase leading-tight font-black">{c.nombre}</p>
                <span className="text-[8px] bg-black text-white px-2 py-1 rounded-full uppercase tracking-widest">VARIABLE</span>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Hash size={10}/> RIF: {c.rif || 'N/A'}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-4 flex items-center gap-1"><Phone size={10}/> {c.telefono || 'N/A'}</p>
              
              <div className="mt-4 flex justify-between items-end border-t border-gray-50 pt-4">
                <div>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Contacto</p>
                  <p className="text-[10px] font-black uppercase">{c.contacto_nombre || 'No definido'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Base Referencial</p>
                  <span className="text-xl italic tracking-tighter font-black text-black">${c.monto_fijo_mensual}</span>
                </div>
              </div>
            </div>
          ))}
          {lista.length === 0 && (
            <div className="text-center p-8 border border-dashed border-gray-200 rounded-3xl">
              <p className="text-xs text-gray-400 italic font-medium lowercase">No hay clubes registrados.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
