'use client'
import { useRouter } from 'next/navigation'
import { UserCog, Users, Truck, Landmark, ArrowLeft } from 'lucide-react'

export default function GestionDashboard() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-8 relative font-sans">
      
      {/* BOTÓN DE RETROCESO ELEGANTE Y SIN ROMPER EL CENTRADO */}
      <button 
        onClick={() => router.push('/')} 
        className="absolute top-12 left-12 md:top-16 md:left-16 flex items-center gap-2 text-xs text-gray-400 hover:text-black transition-all uppercase tracking-widest font-bold"
      >
        <ArrowLeft size={16} /> VOLVER AL INICIO
      </button>

      <div className="max-w-4xl w-full">
        <header className="mb-14">
          <p className="text-xs text-gray-400 font-bold tracking-[0.2em] uppercase mb-3">Módulo de Configuración</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-black">Gestión</h1>
          <p className="text-gray-500 text-base">Administra las entidades y actores principales de la Academia.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. MANEJO DEL PERSONAL */}
          <button 
            onClick={() => router.push('/gestion/personal')} 
            className="text-left p-10 rounded-[2.5rem] border border-gray-100 hover:border-black hover:shadow-xl transition-all group bg-white"
          >
            <UserCog size={32} strokeWidth={1.5} className="mb-6 text-black group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-black">Manejo del Personal</h2>
            <p className="text-sm text-gray-400">Profesores y Personal Administrativo</p>
          </button>

          {/* 2. CLIENTES */}
          <button 
            onClick={() => router.push('/gestion/clientes')} 
            className="text-left p-10 rounded-[2.5rem] border border-gray-100 hover:border-black hover:shadow-xl transition-all group bg-white"
          >
            <Users size={32} strokeWidth={1.5} className="mb-6 text-black group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-black">Clientes</h2>
            <p className="text-sm text-gray-400">Colegios, Clubes, Alumnos y Virtuales</p>
          </button>

          {/* 3. PROVEEDORES */}
          <button className="text-left p-10 rounded-[2.5rem] border border-gray-100 bg-white opacity-50 cursor-not-allowed">
            <Truck size={32} strokeWidth={1.5} className="mb-6 text-black" />
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-black">Proveedores</h2>
            <p className="text-sm text-gray-400">Cantina y suministros</p>
          </button>

          {/* 4. SOCIOS */}
          <button className="text-left p-10 rounded-[2.5rem] border border-gray-100 bg-white opacity-50 cursor-not-allowed">
            <Landmark size={32} strokeWidth={1.5} className="mb-6 text-black" />
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-black">Socios</h2>
            <p className="text-sm text-gray-400">Capital y utilidades de gerencia</p>
          </button>

        </div>
      </div>
    </div>
  )
}
