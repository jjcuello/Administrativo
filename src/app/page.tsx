import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6">
      {/* LOGO OFICIAL */}
      <div className="mb-10">
        <img 
          src="/logo_ana.jpg" 
          alt="Academia Nacional de Ajedrez" 
          className="w-64 h-auto object-contain"
        />
      </div>
      
      <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-black mb-4 leading-tight">
        SISTEMA DE CONTROL <br/> ESTRATÉGICO
      </h1>
      
      <p className="text-gray-400 text-xl max-w-lg mb-12 font-medium">
        Gestión administrativa y financiera. 
        Bienvenido al centro de mando.
      </p>

      <div className="flex flex-col md:flex-row gap-4">
        <Link 
          href="/dashboard" 
          className="bg-black text-white px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
        >
          Entrar al Sistema <ArrowRight size={20} />
        </Link>
        
        <Link 
          href="/gestion" 
          className="bg-white border border-gray-200 text-gray-600 px-10 py-4 rounded-2xl font-bold hover:border-black hover:text-black transition-all flex items-center justify-center"
        >
          Gestión de Clientes
        </Link>
      </div>
    </div>
  )
}
