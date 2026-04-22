'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Truck, Save, Loader2, Search, Edit3, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type DestinoContableEgreso = 'administrativo' | 'operativo' | 'proveedores'

type Proveedor = {
  id: string
  nombre: string
  nombre_comercial: string | null
  rif: string | null
  tipo: string | null
  contacto_nombre: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  condiciones_pago: string | null
  destino_contable_egresos: DestinoContableEgreso
  estado: 'activo' | 'inactivo'
  notas: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export default function GestionProveedores() {
  const router = useRouter()
  const [lista, setLista] = useState<Proveedor[]>([])
  const [busqueda, setBusqueda] = useState('')
  const debounced = useDebounce(busqueda, 350)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [cargando, setCargando] = useState(false)
  const [errorCarga, setErrorCarga] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    nombre_comercial: '',
    rif: '',
    tipo: '',
    contacto_nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    condiciones_pago: '',
    destino_contable_egresos: 'administrativo' as DestinoContableEgreso,
    estado: 'activo' as 'activo' | 'inactivo',
    notas: ''
  })

  const limpiarFormulario = () => {
    setFormData({
      nombre: '',
      nombre_comercial: '',
      rif: '',
      tipo: '',
      contacto_nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      condiciones_pago: '',
      destino_contable_egresos: 'administrativo',
      estado: 'activo',
      notas: ''
    })
  }

  const cargar = useCallback(async (term?: string, estado?: 'todos' | 'activo' | 'inactivo') => {
    setErrorCarga('')
    const filtro = estado ?? filtroEstado
    let query = supabase
      .from('proveedores')
      .select('*')
      .is('deleted_at', null)
      .order('nombre', { ascending: true })

    if (filtro !== 'todos') {
      query = query.eq('estado', filtro)
    }

    if (term) {
      const q = `%${term}%`
      query = query.or(`nombre.ilike.${q},nombre_comercial.ilike.${q},rif.ilike.${q},tipo.ilike.${q},contacto_nombre.ilike.${q},telefono.ilike.${q},email.ilike.${q}`)
    }

    const { data, error } = await query
    if (error) {
      setErrorCarga(error.message)
      return
    }
    setLista((data || []) as Proveedor[])
  }, [filtroEstado])

  useEffect(() => {
    const timer = setTimeout(() => {
      void cargar(debounced, filtroEstado)
    }, 0)

    return () => clearTimeout(timer)
  }, [debounced, filtroEstado, cargar])

  const seleccionarProveedor = (p: Proveedor) => {
    setFormData({
      nombre: p.nombre || '',
      nombre_comercial: p.nombre_comercial || p.nombre || '',
      rif: p.rif || '',
      tipo: p.tipo || '',
      contacto_nombre: p.contacto_nombre || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      condiciones_pago: p.condiciones_pago || '',
      destino_contable_egresos: p.destino_contable_egresos || 'administrativo',
      estado: p.estado || 'activo',
      notas: p.notas || ''
    })
    setEditId(p.id)
    setMensaje('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      setMensaje('❌ El nombre del proveedor es obligatorio')
      return
    }

    if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setMensaje('❌ El correo no tiene un formato válido')
      return
    }

    setCargando(true)
    setMensaje('')

    const payload = {
      nombre: formData.nombre.trim(),
      nombre_comercial: (formData.nombre_comercial.trim() || formData.nombre.trim()),
      rif: formData.rif.trim() || null,
      tipo: formData.tipo.trim() || null,
      contacto_nombre: formData.contacto_nombre.trim() || null,
      telefono: formData.telefono.trim() || null,
      email: formData.email.trim() || null,
      direccion: formData.direccion.trim() || null,
      condiciones_pago: formData.condiciones_pago.trim() || null,
      destino_contable_egresos: formData.destino_contable_egresos,
      estado: formData.estado,
      notas: formData.notas.trim() || null,
      updated_at: new Date().toISOString()
    }

    if (editId) {
      const { error } = await supabase.from('proveedores').update(payload).eq('id', editId)
      if (error) setMensaje(`❌ ${error.message}`)
      else {
        setMensaje('✅ Proveedor actualizado')
        limpiarFormulario()
        setEditId(null)
        await cargar(debounced, filtroEstado)
      }
    } else {
      const { error } = await supabase.from('proveedores').insert([{ ...payload, created_at: new Date().toISOString() }])
      if (error) setMensaje(`❌ ${error.message}`)
      else {
        setMensaje('✅ Proveedor registrado')
        limpiarFormulario()
        await cargar(debounced, filtroEstado)
      }
    }

    setCargando(false)
  }

  const cambiarEstado = async (p: Proveedor) => {
    setCargando(true)
    setMensaje('')
    const nuevoEstado: 'activo' | 'inactivo' = p.estado === 'activo' ? 'inactivo' : 'activo'
    const { error } = await supabase.from('proveedores').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', p.id)
    if (error) setMensaje(`❌ ${error.message}`)
    else {
      setMensaje(`✅ Proveedor ${nuevoEstado === 'activo' ? 'activado' : 'inactivado'}`)
      await cargar(debounced, filtroEstado)
      if (editId === p.id) {
        setFormData(prev => ({ ...prev, estado: nuevoEstado }))
      }
    }
    setCargando(false)
  }

  const cancelarEdicion = () => {
    setEditId(null)
    limpiarFormulario()
    setMensaje('')
  }

  const metricas = useMemo(() => {
    const activos = lista.filter(p => p.estado === 'activo').length
    const inactivos = lista.filter(p => p.estado === 'inactivo').length
    return { total: lista.length, activos, inactivos }
  }, [lista])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      <aside className="md:w-1/5 w-full md:border-r border-b md:border-b-0 border-gray-100 bg-gray-50/30 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 uppercase">Resumen</h3>
        <div className="space-y-3 text-[10px]">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Total proveedores</p>
            <p className="text-lg font-black text-black">{metricas.total}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Activos</p>
            <p className="text-lg font-black text-black">{metricas.activos}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-gray-400 mb-1">Inactivos</p>
            <p className="text-lg font-black text-black">{metricas.inactivos}</p>
          </div>
          {errorCarga && <p className="text-[10px] p-3 bg-red-50 text-red-700 rounded-2xl">❌ {errorCarga}</p>}
        </div>
      </aside>

      <main className="md:w-3/5 w-full p-6 md:p-12 overflow-y-auto md:border-r border-gray-100 bg-white">
        <header className="mb-10 text-black">
          <button onClick={() => router.push('/gestion')} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all uppercase font-black">
            <ArrowLeft size={14} /> VOLVER A GESTIÓN
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="bg-black p-2 rounded-xl text-white"><Truck size={20} /></div>
            <h1 className="text-3xl italic tracking-tighter uppercase font-black">Proveedores</h1>
            {editId && (
              <span className="ml-4 inline-block bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">EDITANDO — {formData.nombre}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mt-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, nombre comercial, rif, tipo, contacto, teléfono o correo"
                className="w-full pl-9 pr-3 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-xs"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value as 'todos' | 'activo' | 'inactivo')}
              className="w-full px-3 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-xs"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Solo activos</option>
              <option value="inactivo">Solo inactivos</option>
            </select>
          </div>
          <p className="text-gray-400 text-sm font-medium italic tracking-normal mt-3">Registro y mantenimiento del catálogo de proveedores.</p>
        </header>

        <form onSubmit={guardar} className="space-y-5 max-w-2xl mx-auto pb-10">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl space-y-4 text-black">
            <input required placeholder="NOMBRE DEL PROVEEDOR" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            <input placeholder="NOMBRE COMERCIAL" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.nombre_comercial} onChange={e => setFormData({ ...formData, nombre_comercial: e.target.value })} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="RIF" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.rif} onChange={e => setFormData({ ...formData, rif: e.target.value })} />
              <input placeholder="TIPO (cantina, papelería, etc.)" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="CONTACTO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.contacto_nombre} onChange={e => setFormData({ ...formData, contacto_nombre: e.target.value })} />
              <input placeholder="TELÉFONO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
            <input placeholder="EMAIL" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <input placeholder="DIRECCIÓN" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="CONDICIONES DE PAGO" className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none" value={formData.condiciones_pago} onChange={e => setFormData({ ...formData, condiciones_pago: e.target.value })} />
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-gray-500 font-black">Destino contable de egresos proveedores</p>
                <select className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.destino_contable_egresos} onChange={e => setFormData({ ...formData, destino_contable_egresos: e.target.value as DestinoContableEgreso })}>
                  <option value="administrativo">Proveedores: Administrativo</option>
                  <option value="operativo">Proveedores: Operativo</option>
                  <option value="proveedores">Proveedores: Cuenta Proveedores</option>
                </select>
                <p className="mt-2 text-[10px] text-gray-500 normal-case">Define cómo se registran por defecto los egresos de este proveedor.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="w-full bg-gray-100 rounded-xl p-4 text-sm font-black border-none" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <textarea placeholder="NOTAS" className="w-full bg-gray-50 rounded-xl p-4 text-xs font-medium border-none italic text-black min-h-24" value={formData.notas} onChange={e => setFormData({ ...formData, notas: e.target.value })} />
          </div>

          <div className="flex gap-4">
            <button disabled={cargando} className="flex-1 bg-black text-white py-5 rounded-2xl font-black italic shadow-2xl transition-all flex items-center justify-center gap-2">
              {cargando ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              {editId ? 'ACTUALIZAR PROVEEDOR' : 'REGISTRAR PROVEEDOR'}
            </button>
            {editId && (
              <button type="button" onClick={cancelarEdicion} className="w-44 bg-white text-black py-5 rounded-2xl font-black italic border border-gray-200 hover:bg-gray-100 transition-all">CANCELAR EDICIÓN</button>
            )}
          </div>
          {mensaje && <p className={`text-center text-[10px] p-4 rounded-2xl ${mensaje.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{mensaje}</p>}
        </form>
      </main>

      <aside className="md:w-1/5 w-full bg-gray-50/20 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2 font-black uppercase"><Truck size={12}/> PROVEEDORES ({lista.length})</h3>
        <div className="space-y-3">
          {lista.map((p) => (
            <div key={p.id} className={`p-5 rounded-3xl border transition-all ${editId === p.id ? 'bg-black text-white border-black' : 'bg-white border-gray-100 hover:shadow-xl'}`}>
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => seleccionarProveedor(p)} className="text-left flex-1">
                  <p className="text-sm uppercase leading-tight font-black">{p.nombre_comercial || p.nombre}</p>
                  <p className="text-[9px] mt-1 italic opacity-80">{p.tipo || 'Sin tipo'}</p>
                </button>
                <span className={`text-[8px] px-2 py-1 rounded-full uppercase ${p.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{p.estado}</span>
              </div>

              <div className="mt-3 text-[9px] space-y-1 opacity-90">
                <p>RIF: {p.rif || 'N/A'}</p>
                <p>Contacto: {p.contacto_nombre || 'N/A'}</p>
                <p>Teléfono: {p.telefono || 'N/A'}</p>
                <p>Email: {p.email || 'N/A'}</p>
                <p>Egresos proveedores por defecto: {p.destino_contable_egresos === 'operativo' ? 'Operativo' : p.destino_contable_egresos === 'proveedores' ? 'Proveedores' : 'Administrativo'}</p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => seleccionarProveedor(p)} className="flex-1 text-[9px] px-3 py-2 rounded-xl border border-gray-200 bg-white text-black flex items-center justify-center gap-1">
                  <Edit3 size={12} /> Editar
                </button>
                <button onClick={() => cambiarEstado(p)} disabled={cargando} className="flex-1 text-[9px] px-3 py-2 rounded-xl border border-gray-200 bg-white text-black flex items-center justify-center gap-1">
                  {p.estado === 'activo' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                  {p.estado === 'activo' ? 'Inactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}

          {lista.length === 0 && (
            <div className="text-center p-8 border border-dashed border-gray-200 rounded-3xl">
              <p className="text-xs text-gray-400 italic lowercase">No hay proveedores con este filtro.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
