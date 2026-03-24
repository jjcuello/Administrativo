'use client'
import { useState, useEffect, useRef } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Landmark, Building, Phone, Hash } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatUSD } from '@/lib/currency'

type Club = {
  id?: string
  tipo?: string
  nombre?: string
  rif?: string
  contacto_nombre?: string
  telefono?: string
  monto_fijo_mensual?: number
  detalles_contrato?: string
}

export default function RegistroClubes() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre: '', rif: '', contacto_nombre: '', telefono: '', 
    monto_fijo_mensual: '', detalles_contrato: ''
  })
  const [lista, setLista] = useState<Club[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const nombreRef = useRef<HTMLInputElement | null>(null)

  const limpiarFormulario = () => {
    setFormData({ nombre: '', rif: '', contacto_nombre: '', telefono: '', monto_fijo_mensual: '', detalles_contrato: '' })
  }

  const cargar = async (term?: string) => {
    setErrorCarga('')
    if (!term) {
      const { data, error } = await supabase.from('colegios').select('*').eq('tipo', 'club').order('nombre', { ascending: true })
      if (error) {
        setErrorCarga(error.message)
        return
      }
      if (data) setLista(data as Club[])
      return
    }
    const q = `%${term}%`
    const { data, error } = await supabase.from('colegios').select('*').eq('tipo', 'club')
      .or(`nombre.ilike.${q},rif.ilike.${q},contacto_nombre.ilike.${q},telefono.ilike.${q}`)
      .order('nombre')
    if (error) {
      setErrorCarga(error.message)
      return
    }
    if (data) setLista(data as Club[])
  }
  useEffect(() => { (async () => { await cargar() })() }, [])
  const debounced = useDebounce(busqueda, 350)
  useEffect(() => { (async () => { await cargar(debounced) })() }, [debounced])

  const seleccionarClub = (c: Club) => {
    setFormData({
      nombre: c.nombre || '',
      rif: c.rif || '',
      contacto_nombre: c.contacto_nombre || '',
      telefono: c.telefono || '',
      monto_fijo_mensual: c.monto_fijo_mensual ? String(c.monto_fijo_mensual) : '',
      detalles_contrato: c.detalles_contrato || ''
    })
    setEditId(c.id ?? null)
    setMensaje('')
    // scroll to top of form area (main) if needed
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // focus first input after scroll
    setTimeout(() => nombreRef.current?.focus(), 250)
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre) { setMensaje('❌ El nombre es obligatorio'); return; }
    if (Number(formData.monto_fijo_mensual || 0) < 0) { setMensaje('❌ El monto no puede ser negativo'); return }
    setCargando(true)
    setMensaje('')
    if (editId) {
      const { error } = await supabase.from('colegios').update({
        nombre: formData.nombre,
        rif: formData.rif,
        contacto_nombre: formData.contacto_nombre,
        telefono: formData.telefono,
        monto_fijo_mensual: parseFloat(formData.monto_fijo_mensual || '0'),
        tipo: 'club',
        detalles_contrato: formData.detalles_contrato
      }).eq('id', editId)
      if (error) setMensaje('❌ ' + error.message)
      else {
        setMensaje('✅ Club actualizado con éxito')
        limpiarFormulario()
        setEditId(null)
        cargar()
      }
    } else {
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
        limpiarFormulario()
        cargar()
      }
    }
    setCargando(false)
  }

  const cancelarEdicion = () => {
    setEditId(null)
    limpiarFormulario()
    setMensaje('')
    nombreRef.current?.blur()
  }

  const totalMensual = lista.reduce((acc, item) => acc + Number(item.monto_fijo_mensual || 0), 0)
  const formatearMonto = formatUSD

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      <aside className="md:w-1/5 w-full md:border-r border-b md:border-b-0 border-gray-100 bg-gray-50/30 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase font-black"><Landmark size={12} className="inline mr-2"/> Estructura B2B</h3>
        <div className="space-y-3 text-[10px]">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Clubes activos</p>
            <p className="text-lg font-black text-black">{lista.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Base mensual total</p>
            <p className="text-lg font-black text-black">${formatearMonto(totalMensual)}</p>
          </div>
          {errorCarga && <p className="text-[10px] p-3 bg-red-50 text-red-700 rounded-2xl">❌ {errorCarga}</p>}
        </div>
      </aside>

      <main className="md:w-3/5 w-full p-6 md:p-12 overflow-y-auto md:border-r border-gray-100 bg-white">
        <header className="mb-10 text-black">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all uppercase font-black tracking-widest">
            <ArrowLeft size={14} /> VOLVER ATRÁS
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-black p-2 rounded-xl text-white"><Landmark size={20} /></div>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">Clubes B2B</h1>
            {editId && (
              <span className="ml-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">EDITANDO{formData.nombre ? ' — ' + formData.nombre : ''}</span>
            )}
          </div>
          <div className="max-w-md mt-4">
            <div className="relative">
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar clubes por nombre, rif, contacto o teléfono..." className="w-full pl-4 pr-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-sm" />
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium italic tracking-normal">Registra el convenio base. La facturación exacta se ajustará mes a mes.</p>
        </header>

        <form onSubmit={guardar} className="space-y-6 max-w-xl mx-auto pb-10">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 text-black">
            
            <input ref={nombreRef} required placeholder="NOMBRE DEL CLUB (Ej: Valle Arriba)" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            
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
          
          <div className="flex gap-4">
            <button disabled={cargando} className="flex-1 bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all">
              {cargando ? <Loader2 className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-2"><Save size={18}/> {editId ? 'ACTUALIZAR CONTRATO' : 'REGISTRAR CONTRATO BASE'}</span>}
            </button>
            {editId && (
              <button type="button" onClick={cancelarEdicion} className="w-36 bg-white text-black py-5 rounded-2xl font-black italic border border-gray-200 hover:bg-gray-100 transition-all">CANCELAR EDICIÓN</button>
            )}
          </div>
          {mensaje && <p className={`text-center text-[10px] p-4 rounded-2xl font-black ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{mensaje}</p>}
        </form>
      </main>

      <aside className="md:w-1/5 w-full bg-gray-50/20 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2 font-black uppercase"><Building size={12}/> CLUBES ASOCIADOS ({lista.length})</h3>
        <div className="space-y-4">
          {lista.map((c) => (
            <div key={c.id} onClick={() => seleccionarClub(c)} className={`p-6 rounded-[2rem] shadow-sm cursor-pointer transition-all ${editId === c.id ? 'bg-black text-white border-black shadow-xl scale-95' : 'bg-white border border-gray-100 hover:shadow-xl'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm uppercase leading-tight font-black">{c.nombre}</p>
                <span className={`text-[8px] px-2 py-1 rounded-full uppercase tracking-widest ${editId === c.id ? 'bg-white text-black' : 'bg-black text-white'}`}>VARIABLE</span>
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
                  <span className="text-xl italic tracking-tighter font-black text-black">${formatearMonto(c.monto_fijo_mensual)}</span>
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
