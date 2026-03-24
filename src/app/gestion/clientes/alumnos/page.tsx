'use client'
import { useState, useEffect, useCallback } from 'react'
import useDebounce from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Search, PlusCircle, User, Phone, Mail, Baby, Activity, CreditCard, X, CheckCircle2, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatUSD } from '@/lib/currency'

type Alumno = {
  id?: string
  nombres?: string
  apellidos?: string
  fecha_nacimiento?: string
}

type Representante = {
  id?: string
  nombres?: string
  apellidos?: string
  cedula_tipo?: string
  cedula_numero?: string
  telefono?: string
  email?: string
  alumnos?: Alumno[]
}

type GrupoOpt = { id?: string; colegios?: { nombre?: string }; nombre?: string; tarifa_mensual?: number }
type VipOpt = { id?: string; modalidad?: string; nombre?: string; tarifa?: number }
type Inscripcion = { id?: string; estado?: string; grupos_tardes?: { tarifa_mensual?: number; nombre?: string }; clases_particulares?: { tarifa?: number; nombre?: string } }
type ConfirmacionInscripcion = {
  inscripcionId?: string
  estadoDestino: 'retirada' | 'activa'
  servicioNombre?: string
  alumnoId?: string
  alumnoNombre?: string
} | null

export default function GestionFamilias() {
  const router = useRouter()
  const [vista, setVista] = useState('inicio') 
  const [busqueda, setBusqueda] = useState('')
  const [familias, setFamilias] = useState<Representante[]>([])
  const [repSeleccionado, setRepSeleccionado] = useState<Representante | null>(null)
  
  // Estados para Inscripción
  const [mostrarModalIns, setMostrarModalIns] = useState(false)
  const [alumnoParaInscribir, setAlumnoParaInscribir] = useState<Alumno | null>(null)
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState<string | null>(null)
  const [opcionesClases, setOpcionesClases] = useState<{grupos: GrupoOpt[], vips: VipOpt[]}>({grupos: [], vips: []})
  const [inscripcionesActuales, setInscripcionesActuales] = useState<Inscripcion[]>([])
  const [filtroEstadoIns, setFiltroEstadoIns] = useState<'activa' | 'retirada' | 'pausada' | 'anulada' | 'todas'>('activa')
  const [confirmacionInscripcion, setConfirmacionInscripcion] = useState<ConfirmacionInscripcion>(null)

  const [formRep, setFormRep] = useState({ nombres: '', apellidos: '', cedula_tipo: 'V', cedula_numero: '', telefono: '', email: '' })
  const [formAlumno, setFormAlumno] = useState({ nombres: '', apellidos: '', fecha_nacimiento: '', condiciones_medicas: '', talla_uniforme: '' })
  
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [detalleAccion, setDetalleAccion] = useState('')
  const [errorCarga, setErrorCarga] = useState('')

  const hidratarRepresentantesConAlumnos = useCallback(async (representantesBase: Representante[]) => {
    const ids = representantesBase.map(r => r.id).filter(Boolean) as string[]
    if (!ids.length) return representantesBase

    const { data: alumnosRows, error: alumnosErr } = await supabase
      .from('alumnos')
      .select('id, nombres, apellidos, fecha_nacimiento, representante_id')
      .in('representante_id', ids)

    if (alumnosErr) {
      setErrorCarga(alumnosErr.message)
      return representantesBase
    }

    const mapa = new Map<string, Alumno[]>()
    for (const row of (alumnosRows || []) as Array<Alumno & { representante_id?: string }>) {
      if (!row.representante_id) continue
      if (!mapa.has(row.representante_id)) mapa.set(row.representante_id, [])
      mapa.get(row.representante_id)?.push({
        id: row.id,
        nombres: row.nombres,
        apellidos: row.apellidos,
        fecha_nacimiento: row.fecha_nacimiento,
      })
    }

    return representantesBase.map(rep => ({ ...rep, alumnos: rep.id ? (mapa.get(rep.id) || []) : [] }))
  }, [])

  const cargarFamilias = useCallback(async () => {
    const { data, error } = await supabase.from('representantes').select('*').order('apellidos')
    if (error) {
      setErrorCarga(error.message)
      return
    }
    if (data) {
      const hidratadas = await hidratarRepresentantesConAlumnos(data as Representante[])
      setFamilias(hidratadas)
      setRepSeleccionado((prev) => {
        if (!prev?.id) return prev
        return hidratadas.find((rep) => rep.id === prev.id) || prev
      })
    }
  }, [hidratarRepresentantesConAlumnos])

  const cargarInscripciones = async (idAlumno?: string) => {
    if (!idAlumno) return
    const { data, error } = await supabase.from('inscripciones').select(`
      *,
      grupos_tardes (nombre, tarifa_mensual),
      clases_particulares (nombre, tarifa)
    `).eq('alumno_id', idAlumno)
    if (error) {
      setErrorCarga(error.message)
      return
    }
    if (data) setInscripcionesActuales(data)
  }

  useEffect(() => { (async () => { await cargarFamilias() })() }, [cargarFamilias])

  const debouncedBusqueda = useDebounce(busqueda, 350)
  useEffect(() => {
    const term = debouncedBusqueda.trim()
    ;(async () => {
      if (!term) { await cargarFamilias(); return }
      const q = `%${term}%`
      const { data, error } = await supabase.from('representantes')
        .select('*')
        .or(`nombres.ilike.${q},apellidos.ilike.${q},telefono.ilike.${q},email.ilike.${q},cedula_numero.ilike.${q}`)
        .order('apellidos')
      if (error) {
        setErrorCarga(error.message)
        return
      }
      if (data) {
        const hidratadas = await hidratarRepresentantesConAlumnos(data as Representante[])
        setFamilias(hidratadas)
      }
    })()
  }, [debouncedBusqueda, cargarFamilias, hidratarRepresentantesConAlumnos])

  const seleccionarFamilia = (rep: Representante) => {
    setRepSeleccionado(rep)
    setVista('hub')
    setMensaje('')
    setAlumnoSeleccionadoId(null)
    setFiltroEstadoIns('activa')
    setInscripcionesActuales([]) // Se limpian hasta que selecciones un alumno
  }

  const seleccionarAlumno = async (idAlumno?: string) => {
    if (!idAlumno) return
    setAlumnoSeleccionadoId(idAlumno)
    await cargarInscripciones(idAlumno)
  }

  const abrirInscripcion = async (alumno: Alumno) => {
    setAlumnoParaInscribir(alumno)
    setCargando(true)
    const { data: grp, error: grpErr } = await supabase.from('grupos_tardes').select('*, colegios(nombre)').eq('estado', 'activo')
    const { data: vip, error: vipErr } = await supabase.from('clases_particulares').select('*').eq('estado', 'activo')
    if (grpErr || vipErr) {
      setMensaje('❌ ' + (grpErr?.message || vipErr?.message || 'No se pudieron cargar las opciones de inscripción'))
      setCargando(false)
      return
    }
    setOpcionesClases({ grupos: (grp || []) as GrupoOpt[], vips: (vip || []) as VipOpt[] })
    setMostrarModalIns(true)
    setCargando(false)
  }

  const ejecutarInscripcion = async (idActividad?: string, esVip?: boolean) => {
    if (!idActividad || !alumnoParaInscribir?.id || typeof esVip !== 'boolean') return
    setCargando(true)
    const alumnoId = alumnoParaInscribir.id
    const candidatos = esVip
      ? [
          { alumno_id: alumnoId, clase_vip_id: idActividad, estado: 'activa' },
        ]
      : [
          { alumno_id: alumnoId, grupo_id: idActividad, estado: 'activa' },
        ]

    let ok = false
    let ultimoError: string | null = null
    for (const payload of candidatos) {
      const { error } = await supabase.from('inscripciones').insert([payload])
      if (!error) {
        ok = true
        break
      }
      ultimoError = error.message
    }

    if (!ok) {
      const msg = (ultimoError || '').toLowerCase()
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setMensaje('❌ Este alumno ya tiene una inscripción activa en ese servicio')
      } else {
        setMensaje('❌ ' + (ultimoError || 'No se pudo registrar la inscripción'))
      }
      setDetalleAccion('')
    } else {
      setMensaje('✅ Inscripción exitosa')
      const actividad = (esVip ? opcionesClases.vips : opcionesClases.grupos).find(item => item.id === idActividad)
      const ahora = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setDetalleAccion(`Inscripción • ${repSeleccionado?.apellidos || ''} ${repSeleccionado?.nombres || ''} • ${alumnoParaInscribir?.apellidos || ''} ${alumnoParaInscribir?.nombres || ''} • ${actividad?.nombre || 'Servicio'} • ${ahora}`)
      setMostrarModalIns(false)
      await cargarInscripciones(alumnoId)
      await cargarFamilias()
    }
    setCargando(false)
  }

  const guardarRep = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    if (repSeleccionado?.id && vista === 'form_rep') {
      const payload = {
        nombres: formRep.nombres,
        apellidos: formRep.apellidos,
        cedula_tipo: formRep.cedula_tipo,
        cedula_numero: formRep.cedula_numero,
        telefono: formRep.telefono,
        email: formRep.email,
      }
      const { data, error } = await supabase
        .from('representantes')
        .update(payload)
        .eq('id', repSeleccionado.id)
        .select('*')
        .single()
      if (error) {
        setMensaje('❌ ' + error.message)
        setCargando(false)
        return
      }
      if (data) {
        setRepSeleccionado((prev) => ({
          ...(prev || {}),
          ...(data as Representante),
          alumnos: prev?.alumnos || [],
        }))
      }
      setMensaje('✅ Información actualizada')
    } else {
      const payload = {
        nombres: formRep.nombres,
        apellidos: formRep.apellidos,
        cedula_tipo: formRep.cedula_tipo,
        cedula_numero: formRep.cedula_numero,
        telefono: formRep.telefono,
        email: formRep.email,
        estado: 'activo',
      }
      const { data, error } = await supabase.from('representantes').insert([payload]).select().single()
      if (error) {
        setMensaje('❌ ' + error.message)
        setCargando(false)
        return
      }
      if(data) {
        setRepSeleccionado({...data, alumnos: []})
        setMensaje('✅ Familia creada')
      }
    }
    await cargarFamilias(); setVista('hub'); setCargando(false)
  }

  const guardarAlumno = async (e: React.FormEvent) => {
    e.preventDefault(); setCargando(true)
    if (!repSeleccionado?.id) { setCargando(false); return }
    const payload = {
      nombres: formAlumno.nombres,
      apellidos: formAlumno.apellidos,
      fecha_nacimiento: formAlumno.fecha_nacimiento,
      condiciones_medicas: formAlumno.condiciones_medicas,
      talla_uniforme: formAlumno.talla_uniforme,
      representante_id: repSeleccionado.id,
      estado: 'activo',
    }
    const { data, error } = await supabase.from('alumnos').insert([payload]).select().single()
    if (error) {
      setMensaje('❌ ' + error.message)
      setCargando(false)
      return
    }
    if(data) {
       const nuevos = [...(repSeleccionado.alumnos || []), data]
       setRepSeleccionado({...repSeleccionado, alumnos: nuevos})
    }
    cargarFamilias(); setVista('hub'); setCargando(false)
  }

  const ejecutarCambioEstadoInscripcion = async (
    inscripcionId?: string,
    estadoDestino?: 'retirada' | 'activa',
    servicioNombre?: string,
    alumnoId?: string,
    alumnoNombre?: string
  ) => {
    if (!inscripcionId || !estadoDestino) return
    setCargando(true)
    const alumnoObjetivoId = alumnoId || alumnoSeleccionadoId || ''
    const alumnoObjetivoNombre = alumnoNombre || alumnoSeleccionadoNombre || 'Alumno'
    const { error } = await supabase.from('inscripciones').update({ estado: estadoDestino }).eq('id', inscripcionId)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (estadoDestino === 'activa' && (msg.includes('duplicate') || msg.includes('unique'))) {
        setMensaje('❌ Ya existe una inscripción activa para ese mismo servicio')
      } else {
        setMensaje('❌ ' + error.message)
      }
      setDetalleAccion('')
    } else {
      setMensaje(estadoDestino === 'activa' ? '✅ Inscripción reactivada' : '✅ Inscripción retirada')
      const accion = estadoDestino === 'activa' ? 'Reactivación' : 'Retiro'
      const ahora = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setDetalleAccion(`${accion} • ${repSeleccionado?.apellidos || ''} ${repSeleccionado?.nombres || ''} • ${alumnoObjetivoNombre} • ${servicioNombre || 'Servicio'} • ${ahora}`)
      if (alumnoObjetivoId) {
        await cargarInscripciones(alumnoObjetivoId)
      } else {
        setInscripcionesActuales((prev) => prev.map((ins) => (
          ins.id === inscripcionId ? { ...ins, estado: estadoDestino } : ins
        )))
      }
    }
    setCargando(false)
  }

  const solicitarRetiroInscripcion = (inscripcionId?: string, servicioNombre?: string) => {
    if (!inscripcionId) return
    setConfirmacionInscripcion({
      inscripcionId,
      estadoDestino: 'retirada',
      servicioNombre,
      alumnoId: alumnoSeleccionadoId || undefined,
      alumnoNombre: alumnoSeleccionadoNombre || undefined,
    })
  }

  const solicitarReactivacionInscripcion = (inscripcionId?: string, servicioNombre?: string) => {
    if (!inscripcionId) return
    setConfirmacionInscripcion({
      inscripcionId,
      estadoDestino: 'activa',
      servicioNombre,
      alumnoId: alumnoSeleccionadoId || undefined,
      alumnoNombre: alumnoSeleccionadoNombre || undefined,
    })
  }

  const confirmarCambioInscripcion = async () => {
    if (!confirmacionInscripcion) return
    const { inscripcionId, estadoDestino, servicioNombre, alumnoId, alumnoNombre } = confirmacionInscripcion
    setConfirmacionInscripcion(null)
    await ejecutarCambioEstadoInscripcion(inscripcionId, estadoDestino, servicioNombre, alumnoId, alumnoNombre)
  }

  const inscripcionesFiltradas = filtroEstadoIns === 'todas'
    ? inscripcionesActuales
    : inscripcionesActuales.filter(ins => (ins.estado || 'activa') === filtroEstadoIns)

  const totalMensual = inscripcionesFiltradas.reduce((acc, ins) => {
    return acc + (ins.grupos_tardes?.tarifa_mensual || 0) + (ins.clases_particulares?.tarifa || 0)
  }, 0)
  const activasCount = inscripcionesActuales.filter(ins => (ins.estado || 'activa') === 'activa').length
  const formatearMonto = formatUSD
  const alumnoSeleccionadoNombre = (() => {
    const alumno = repSeleccionado?.alumnos?.find(a => a.id === alumnoSeleccionadoId)
    return alumno ? `${alumno.nombres || ''} ${alumno.apellidos || ''}`.trim() : ''
  })()
  const representanteNombre = `${repSeleccionado?.nombres || ''} ${repSeleccionado?.apellidos || ''}`.trim()

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white overflow-hidden uppercase tracking-tight font-black text-black">
      {/* MODAL CONFIRMACIÓN ESTADO INSCRIPCIÓN */}
      {confirmacionInscripcion && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-gray-100">
            <p className="text-[10px] text-gray-400 tracking-widest mb-2">CONFIRMAR ACCIÓN</p>
            <h3 className="text-xl font-black italic mb-2">
              {confirmacionInscripcion.estadoDestino === 'retirada' ? 'Retirar inscripción' : 'Reactivar inscripción'}
            </h3>
            <p className="text-xs text-gray-500 mb-6 normal-case">
              {confirmacionInscripcion.estadoDestino === 'retirada'
                ? 'Esta inscripción pasará a estado retirada y no sumará en activos.'
                : 'Esta inscripción volverá a estado activa y se incluirá en los cálculos.'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Servicio: <span className="text-black">{confirmacionInscripcion.servicioNombre || 'No identificado'}</span>
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Alumno: <span className="text-black">{confirmacionInscripcion.alumnoNombre || alumnoSeleccionadoNombre || 'No identificado'}</span>
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">
              Familia: <span className="text-black">{representanteNombre || 'No identificada'}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmacionInscripcion(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-black text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCambioInscripcion}
                className={`flex-1 py-3 rounded-2xl text-[10px] uppercase tracking-widest text-white ${confirmacionInscripcion.estadoDestino === 'retirada' ? 'bg-red-600' : 'bg-green-600'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INSCRIPCIÓN PREMIUM */}
      {mostrarModalIns && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <p className="text-[10px] text-gray-400 tracking-widest mb-1">PROCESO DE INSCRIPCIÓN</p>
                <h2 className="text-2xl font-black italic">INSCRIBIR A {alumnoParaInscribir?.nombres}</h2>
              </div>
              <button onClick={() => setMostrarModalIns(false)} className="bg-black text-white p-3 rounded-2xl hover:scale-110 transition-all"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-8">
              {/* Columna Grupos Tardes */}
              <div className="space-y-4">
                <h3 className="text-xs font-black tracking-widest text-gray-400 mb-4 flex items-center gap-2"><Activity size={14}/> ACADEMIAS TARDES</h3>
                {opcionesClases.grupos.map(g => (
                  <div key={g.id} onClick={() => ejecutarInscripcion(g.id, false)} className="p-5 border border-gray-100 rounded-[2rem] hover:border-black hover:shadow-xl transition-all cursor-pointer bg-white group relative">
                    <p className="text-[9px] text-gray-400 font-bold mb-1 uppercase">{g.colegios?.nombre}</p>
                    <p className="text-sm font-black mb-3">{g.nombre}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg italic font-black text-black">${formatearMonto(g.tarifa_mensual)}</span>
                      <span className="text-[9px] bg-black text-white px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all font-black uppercase">INSCRIBIR</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Columna VIP */}
              <div className="space-y-4">
                <h3 className="text-xs font-black tracking-widest text-gray-400 mb-4 flex items-center gap-2"><Star size={14} className="text-yellow-500"/> SERVICIOS VIP</h3>
                {opcionesClases.vips.map(v => (
                  <div key={v.id} onClick={() => ejecutarInscripcion(v.id, true)} className="p-5 border border-gray-100 rounded-[2rem] hover:border-black hover:shadow-xl transition-all cursor-pointer bg-white group relative">
                    <p className="text-[9px] text-gray-400 font-bold mb-1 uppercase">{v.modalidad}</p>
                    <p className="text-sm font-black mb-3">{v.nombre}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg italic font-black text-black">${formatearMonto(v.tarifa)}</span>
                      <span className="text-[9px] bg-yellow-500 text-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all font-black uppercase">VENDER VIP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. IZQUIERDA: BUSCADOR */}
      <aside className="w-[25%] border-r border-gray-100 bg-gray-50/50 p-8 flex flex-col">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-4 uppercase flex items-center gap-2"><Users size={12}/> Directorio Familiar</h3>
        <div className="relative mb-6"><Search size={14} className="absolute left-4 top-4 text-gray-300"/><input placeholder="BUSCAR..." className="w-full bg-white rounded-2xl p-4 pl-10 text-[10px] font-bold border border-gray-100 shadow-sm focus:border-black outline-none" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        <button onClick={() => { setRepSeleccionado(null); setVista('form_rep'); setFormRep({nombres:'', apellidos:'', cedula_tipo:'V', cedula_numero:'', telefono:'', email:''}) }} className="w-full bg-black text-white p-4 rounded-2xl mb-6 text-xs flex items-center justify-center gap-2 hover:scale-105 transition-all font-black italic"><PlusCircle size={14}/> NUEVA FAMILIA</button>
        <div className="space-y-2 overflow-y-auto flex-1 pr-2">
          {familias.map((f: Representante) => (
              <button key={f.id} onClick={() => seleccionarFamilia(f)} className={`w-full text-left p-4 rounded-2xl border transition-all ${repSeleccionado?.id === f.id ? 'bg-black text-white border-black shadow-xl scale-95' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}`}><p className="text-xs font-black">{f.apellidos}, {f.nombres}</p><p className={`text-[9px] font-bold ${repSeleccionado?.id === f.id ? 'text-gray-400' : 'text-gray-300'}`}>{f.cedula_tipo}-{f.cedula_numero}</p></button>
            ))}
        </div>
        {errorCarga && <p className="mt-4 text-[10px] p-3 bg-red-50 text-red-700 rounded-2xl">❌ {errorCarga}</p>}
      </aside>

      {/* 2. CENTRO: FAMILY HUB */}
      <main className="w-[45%] p-12 overflow-y-auto border-r border-gray-100 bg-white relative">
        <header className="mb-10 text-black"><button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-black mb-6 transition-all tracking-widest"><ArrowLeft size={14} /> VOLVER ATRÁS</button>
          <div className="flex justify-between items-start"><div><div className="flex items-center gap-3 mb-2"><div className="bg-black p-2 rounded-xl text-white"><Users size={20} /></div><h1 className="text-3xl italic tracking-tighter uppercase font-black">Centro Familiar</h1></div><p className="text-gray-400 text-sm font-medium italic lowercase">Gestión B2C.</p></div>{vista !== 'inicio' && vista !== 'hub' && <button onClick={() => setVista('hub')} className="text-[10px] text-gray-400 font-black hover:text-black border-b border-gray-100">CANCELAR</button>}</div>
        </header>

        {vista === 'inicio' && <div className="flex flex-col items-center justify-center h-[50vh] text-gray-200"><Users size={80} strokeWidth={1}/></div>}

        {vista === 'hub' && repSeleccionado && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="p-8 bg-gray-50/50 rounded-[3rem] border border-gray-100 relative group transition-all hover:bg-white hover:shadow-2xl">
              <button onClick={() => { setFormRep({ nombres: repSeleccionado.nombres || '', apellidos: repSeleccionado.apellidos || '', cedula_tipo: repSeleccionado.cedula_tipo || 'V', cedula_numero: repSeleccionado.cedula_numero || '', telefono: repSeleccionado.telefono || '', email: repSeleccionado.email || '' }); setVista('form_rep') }} className="absolute top-8 right-8 text-[10px] font-black border border-gray-200 px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:text-white uppercase">Editar Perfil</button>
              <p className="text-[10px] text-gray-400 tracking-[0.2em] mb-1 font-black">TITULAR DE CUENTA</p>
              <h2 className="text-3xl font-black mb-4 italic tracking-tighter">{repSeleccionado.apellidos}, {repSeleccionado.nombres}</h2>
              <div className="flex gap-6 text-[10px] text-gray-400 font-black uppercase"><p className="flex items-center gap-1"><User size={12}/> {repSeleccionado.cedula_tipo}-{repSeleccionado.cedula_numero}</p><p className="flex items-center gap-1"><Phone size={12}/> {repSeleccionado.telefono || 'N/A'}</p><p className="flex items-center gap-1 lowercase"><Mail size={12}/> {repSeleccionado.email || 'N/A'}</p></div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-6 px-4"><h3 className="text-xs font-black tracking-widest uppercase flex items-center gap-2"><Baby size={16}/> Hijos / Alumnos registrados</h3><button onClick={() => { setFormAlumno({nombres:'', apellidos:repSeleccionado.apellidos || '', fecha_nacimiento:'', condiciones_medicas:'', talla_uniforme:''}); setVista('form_alumno') }} className="text-[10px] bg-black text-white px-4 py-2 rounded-full font-black italic hover:scale-105 transition-all shadow-lg">+ AGREGAR NIÑO</button></div>
              <div className="space-y-4">
                {repSeleccionado.alumnos?.map((a: Alumno) => (
                  <div key={a.id} onClick={() => seleccionarAlumno(a.id)} className="p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm flex justify-between items-center group hover:border-black hover:shadow-xl transition-all cursor-pointer">
                    <div><p className="text-lg font-black italic">{a.nombres} {a.apellidos}</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Nacimiento: {a.fecha_nacimiento || 'N/A'}</p></div>
                    <button onClick={(e) => { e.stopPropagation(); abrirInscripcion(a); }} className="text-[10px] bg-black text-white px-5 py-3 rounded-2xl transition-all flex items-center gap-2 font-black italic shadow-lg hover:scale-110"><Activity size={12}/> INSCRIBIR EN CLASE</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Formularios compactados por espacio */}
        {(vista === 'form_rep' || vista === 'form_alumno') && (
           <form onSubmit={vista === 'form_rep' ? guardarRep : guardarAlumno} className="space-y-6 max-w-xl animate-in zoom-in-95 duration-200">
             <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl space-y-5">
               <h3 className="text-xs text-gray-400 font-black tracking-widest uppercase mb-4">{vista === 'form_rep' ? 'Datos del Representante' : 'Datos del Alumno'}</h3>
               <div className="grid grid-cols-2 gap-4">
                 <input required placeholder="NOMBRES" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black outline-none border-none" value={vista === 'form_rep' ? formRep.nombres : formAlumno.nombres} onChange={e=>vista === 'form_rep' ? setFormRep({...formRep, nombres:e.target.value}) : setFormAlumno({...formAlumno, nombres:e.target.value})} />
                 <input required placeholder="APELLIDOS" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black outline-none border-none" value={vista === 'form_rep' ? formRep.apellidos : formAlumno.apellidos} onChange={e=>vista === 'form_rep' ? setFormRep({...formRep, apellidos:e.target.value}) : setFormAlumno({...formAlumno, apellidos:e.target.value})} />
               </div>
               {vista === 'form_rep' ? (
                 <div className="grid grid-cols-12 gap-2"><select className="col-span-3 bg-gray-100 rounded-2xl p-4 text-sm font-black border-none" value={formRep.cedula_tipo} onChange={e=>setFormRep({...formRep, cedula_tipo:e.target.value})}><option value="V">V</option><option value="E">E</option></select><input required placeholder="CÉDULA" className="col-span-9 bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formRep.cedula_numero} onChange={e=>setFormRep({...formRep, cedula_numero:e.target.value})} /></div>
               ) : (
                 <input required type="date" className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-black border-none" value={formAlumno.fecha_nacimiento} onChange={e=>setFormAlumno({...formAlumno, fecha_nacimiento:e.target.value})} />
               )}
             </div>
             <button className="w-full bg-black text-white py-6 rounded-[2rem] font-black italic shadow-2xl hover:scale-[1.02] transition-all">GUARDAR INFORMACIÓN</button>
           </form>
        )}
        {mensaje && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-4 rounded-3xl font-black text-xs shadow-2xl z-[100] animate-bounce text-center">
            <p>{mensaje}</p>
            {detalleAccion && <p className="text-[9px] text-gray-300 mt-1 normal-case">{detalleAccion}</p>}
          </div>
        )}
      </main>

      {/* 3. DERECHA: FINANZAS DINÁMICAS */}
      <aside className="md:w-2/5 w-full bg-gray-50/20 p-6 md:p-8 overflow-y-auto">
        <h3 className="text-[10px] text-gray-400 tracking-[0.2em] mb-8 uppercase font-black flex items-center gap-2"><CreditCard size={12}/> ESTADO DE CUENTA B2C</h3>
        {repSeleccionado ? (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-150 transition-all duration-700"><CreditCard size={120}/></div>
              <p className="text-[10px] text-gray-500 mb-2 tracking-[0.3em] font-black">MENSUALIDAD ESTIMADA</p>
              <p className="text-6xl font-black italic tracking-tighter">${formatearMonto(totalMensual)}</p>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-gray-400 italic lowercase border-t border-white/10 pt-6"><CheckCircle2 size={12} className="text-green-500"/> Basado en {activasCount} inscripciones activas</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-[10px] text-gray-400 font-black tracking-widest uppercase">DETALLE DE CLASES</h4>
                <div className="flex items-center gap-1">
                  {['activa', 'retirada', 'todas'].map(st => (
                    <button
                      key={st}
                      onClick={() => setFiltroEstadoIns(st as 'activa' | 'retirada' | 'todas')}
                      className={`text-[8px] px-2 py-1 rounded-full uppercase tracking-widest ${filtroEstadoIns === st ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {inscripcionesFiltradas.map(ins => (
                  <div key={ins.id} className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm flex justify-between items-center group hover:border-black transition-all">
                    <div>
                      <p className="text-[11px] font-black uppercase italic tracking-tight">{ins.grupos_tardes?.nombre || ins.clases_particulares?.nombre}</p>
                      <p className="text-[8px] text-gray-400 font-bold tracking-widest uppercase">ESTADO: {ins.estado || 'activa'}</p>
                    </div>
                    <div className="text-right space-y-2">
                      <span className="block text-sm font-black italic">${formatearMonto(ins.grupos_tardes?.tarifa_mensual || ins.clases_particulares?.tarifa)}</span>
                      {(ins.estado || 'activa') === 'activa' && (
                        <button onClick={() => solicitarRetiroInscripcion(ins.id, ins.grupos_tardes?.nombre || ins.clases_particulares?.nombre)} disabled={cargando} className="text-[8px] px-2 py-1 rounded-full bg-red-50 text-red-700 uppercase tracking-widest border border-red-200">
                          Retirar
                        </button>
                      )}
                      {(ins.estado || 'activa') === 'retirada' && (
                        <button onClick={() => solicitarReactivacionInscripcion(ins.id, ins.grupos_tardes?.nombre || ins.clases_particulares?.nombre)} disabled={cargando} className="text-[8px] px-2 py-1 rounded-full bg-green-50 text-green-700 uppercase tracking-widest border border-green-200">
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {inscripcionesFiltradas.length === 0 && <p className="text-xs text-gray-300 italic text-center p-10 border border-dashed rounded-[2rem]">{alumnoSeleccionadoId ? 'No hay inscripciones para el filtro seleccionado...' : 'Selecciona un alumno para ver sus clases e importes...'}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-200"><CreditCard size={60} strokeWidth={1}/></div>
        )}
      </aside>
    </div>
  )
}