'use client'
import { useRouter } from 'next/navigation'
import { Building2, Trophy, Landmark, Users, Monitor, ArrowLeft } from 'lucide-react'

export default function ClientesDashboard() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-8 relative font-sans text-black">
      
      {/* BOTÓN DE RETROCESO */}
      <button 
        onClick={() => router.push('/gestion')} 
        className="absolute top-12 left-12 md:top-16 md:left-16 flex items-center gap-2 text-xs text-gray-400 hover:text-black transition-all uppercase tracking-widest font-bold"
      >
        <ArrowLeft size={16} /> VOLVER A GESTIÓN
      </button>

      <div className="max-w-6xl w-full">
        <header className="mb-14 text-center">
          <p className="text-xs text-gray-400 font-bold tracking-[0.2em] uppercase mb-3">Módulo de Clientes e Ingresos</p>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-4">Panel de Control</h1>
          <p className="text-gray-500 text-base italic lowercase">Configura tus servicios y gestiona tus alumnos desde un solo lugar.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. COLEGIOS */}
          <button 
            onClick={() => router.push('/gestion/clientes/colegios')} 
            className="text-left p-10 rounded-[2.5rem] border border-gray-100 hover:border-black hover:shadow-xl transition-all group bg-white"
          >
            <Building2 size={32} strokeWidth={1.5} className="mb-6 text-black group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-black italic tracking-tighter uppercase mb-2">Colegios</h2>
            <p className="text-xs text-gray-400 font-medium lowercase italic">Convenios B2B mañanas.</p>
          </button>

          {/* 2. CLUBES */}
          <button 
            onClick={() => router.push('/gestion/clientes/clubes')} 
            className="text-left p-10 rounded-[2.5rem] border border-gray-100 hover:border-black hover:shadow-xl transition-all group bg-white"
          >
            <Landmark size={32} strokeWidth={1.5} className="mb-6 text-black group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-black italic tracking-tighter uppercase mb-2">Clubes</h2>
            <p className="text-xs text-gray-400 font-medium lowercase italic">Acuerdos de base variable.</p>
          </button>

          {/* 3. TARDES (CONFIG) */}
          <button 
            onClick={() => router.push('/gestion/clientes/tardes')} 
            className="text-left p-10 rounded-[2.5rem] border border-gray-100 hover:border-black hover:shadow-xl transition-all group bg-white"
          >
            <Trophy size={32} strokeWidth={1.5} className="mb-6 text-black group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-black italic tracking-tighter uppercase mb-2">Catálogo Tardes</h2>
            <p className="text-xs text-gray-400 font-medium lowercase italic">Configura grupos y sedes.</p>
          </button>

          {/* 4. VIP / VIRTUALES (CONFIG) */}
          <button 
            onClick={() => router.push('/gestion/clientes/particulares')} 
            className="text-left p-10 rounded-[2.5rem] border border-gray-100 hover:border-black hover:shadow-xl transition-all group bg-white"
          >
            <Monitor size={32} strokeWidth={1.5} className="mb-6 text-black group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-black italic tracking-tighter uppercase mb-2 text-blue-500">Catálogo VIP</h2>
            <p className="text-xs text-gray-400 font-medium lowercase italic">Crea servicios virtuales y 1 a 1.</p>
          </button>

          {/* 5. CENTRO FAMILIAR (OPERACIÓN TOTAL B2C) */}
          <button 
            onClick={() => router.push('/gestion/clientes/alumnos')} 
            className="md:col-span-2 text-left p-10 rounded-[2.5rem] border-2 border-black bg-black text-white hover:shadow-2xl transition-all group relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
                <Users size={180} />
            </div>
            <Users size={32} strokeWidth={1.5} className="mb-6 text-white" />
            <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Centro Familiar</h2>
            <p className="text-sm text-gray-400 font-bold lowercase italic">Inscripciones, gestión de alumnos y estados de cuenta.</p>
            <div className="mt-4 inline-block bg-white text-black text-[10px] px-4 py-1 rounded-full font-black uppercase tracking-widest">Panel de Operación</div>
          </button>

        </div>
      </div>
    </div>
  )
}
