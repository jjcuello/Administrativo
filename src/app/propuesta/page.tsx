'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Medal,
  Quote,
  Smartphone,
  Telescope,
  Trophy,
  Users,
} from 'lucide-react'

type PieceKind = 'knight' | 'rook' | 'queen' | 'king'

type Copy = {
  nav: {
    programas: string
    torneos: string
    docentes: string
    contacto: string
  }
  hero: {
    kicker: string
    title: string
    subtitle: string
    ctaPrimary: string
    ctaSecondary: string
  }
  trust: string[]
  heroCards: string[]
  heroSceneTag: string
  heroSceneCaption: string
  valuesTitle: string
  valuesItems: Array<{ title: string; body: string }>
  servicesTitle: string
  services: Array<{ title: string; body: string }>
  processTitle: string
  process: Array<{ step: string; title: string; body: string }>
  pedagogiaTitle: string
  pedagogiaBody: string
  projectsTitle: string
  projectsBody: string
  testimonialsTitle: string
  testimonials: Array<{ quote: string; author: string; role: string }>
  mercadosTitle: string
  mercadosBody: string
  pagosTitle: string
  pagosItems: string[]
  funnelTitle: string
  funnelBody: string
  funnelButton: string
  footer: string
}

const copyEs: Copy = {
  nav: {
    programas: 'Programas',
    torneos: 'Torneos',
    docentes: 'Docentes',
    contacto: 'Contacto',
  },
  hero: {
    kicker: 'Fundacion Academia Nacional de Ajedrez',
    title: 'Potenciamos mentes con ajedrez: formacion moderna, humana y competitiva.',
    subtitle:
      'Sembrando el Ajedrez en Venezuela con proyeccion internacional. Clases online, presenciales, nucleos de ensenanza e inscripcion a torneos en una sola plataforma.',
    ctaPrimary: 'Reservar clase diagnostico gratis',
    ctaSecondary: 'Explorar programas',
  },
  trust: ['+5000 alumnos formados', 'Aval institucional en Venezuela', 'Foco internacional: Colombia, Miami y Venezuela'],
  heroCards: ['Modelo para padres y representantes', 'Iniciacion, desarrollo y alto rendimiento', 'Programa permanente de diagnostico gratis'],
  heroSceneTag: 'Experiencia real en clase',
  heroSceneCaption: 'Sesiones dinamicas con ninos jugando, aprendiendo y sonriendo en un entorno moderno.',
  valuesTitle: 'Beneficios de aprender ajedrez',
  valuesItems: [
    {
      title: 'Pensamiento estrategico',
      body: 'Los alumnos aprenden a planificar, anticipar escenarios y tomar mejores decisiones.',
    },
    {
      title: 'Creatividad aplicada',
      body: 'Cada partida impulsa nuevas ideas para resolver problemas dentro y fuera del tablero.',
    },
    {
      title: 'Disciplina y enfoque',
      body: 'Se fortalece la constancia, la concentracion y la gestion del tiempo en el estudio.',
    },
    {
      title: 'Confianza y crecimiento',
      body: 'El progreso por niveles refuerza autoestima, perseverancia y autonomia.',
    },
    {
      title: 'Trabajo en comunidad',
      body: 'Fomentamos valores de respeto, juego limpio y colaboracion entre familias y alumnos.',
    },
  ],
  servicesTitle: 'Programas que convierten talento en resultados',
  services: [
    {
      title: 'Ajedrez Transversal',
      body: 'Estrategia pedagogica para fortalecer pensamiento critico, habilidades STEM e inteligencia emocional.',
    },
    {
      title: 'Nexus Ajedrez',
      body: 'Laboratorio digital con metodologia estandarizada y seguimiento personalizado para clases en linea.',
    },
    {
      title: 'Semillero de Talentos',
      body: 'Ruta estructurada para ninos y jovenes con proyeccion competitiva regional y federada.',
    },
    {
      title: 'Formacion de Docentes',
      body: 'Capacitacion de monitores y lideres en metodologia moderna para escalar calidad educativa.',
    },
  ],
  processTitle: 'Ruta de servicio en 3 pasos',
  process: [
    {
      step: '01',
      title: 'Evaluamos perfil y objetivos',
      body: 'Levantamos nivel actual, edad, contexto y metas del alumno para recomendar el programa ideal.',
    },
    {
      step: '02',
      title: 'Activamos plan academico',
      body: 'Definimos modalidad, frecuencia y acompanamiento pedagogico para un avance progresivo.',
    },
    {
      step: '03',
      title: 'Seguimos resultados medibles',
      body: 'Monitoreamos progreso y ajustamos estrategia para sostener motivacion y rendimiento.',
    },
  ],
  pedagogiaTitle: 'Modelo academico orientado a padres',
  pedagogiaBody:
    'El foco principal es el nivel basico: evaluamos, trazamos ruta de aprendizaje y acompanamos progreso con metas medibles. Cada alumno avanza segun su contexto y potencial.',
  projectsTitle: 'Lineas de impacto institucional',
  projectsBody:
    'Disenadas para colegios, comunidades y talentos deportivos, nuestras lineas de accion combinan pedagogia, competicion y desarrollo social.',
  testimonialsTitle: 'Lo que valoran nuestras familias y aliados',
  testimonials: [
    {
      quote: 'La metodologia le dio estructura y seguridad a mi hijo desde sus primeras clases.',
      author: 'Representante ANA',
      role: 'Padre de alumno - Nivel basico',
    },
    {
      quote: 'La academia facilito un programa claro para integrar ajedrez en nuestro entorno educativo.',
      author: 'Coordinacion institucional',
      role: 'Aliado educativo',
    },
  ],
  mercadosTitle: 'Presencia internacional con costos competitivos',
  mercadosBody:
    'Atendemos familias e instituciones en Bogota, Cali, Medellin, Miami y Venezuela con atencion sincronica y asincronica adaptada a cada huso horario.',
  pagosTitle: 'Metodos de pago aceptados (fase 1 informativa)',
  pagosItems: ['Transferencia bancaria', 'Zelle', 'PayPal', 'Binance', 'Pago movil (Venezuela)'],
  funnelTitle: 'Inscripcion simple para lanzar conversiones',
  funnelBody:
    'Primera fase con formulario Google + redireccion WhatsApp. Segunda fase: e-commerce y automatizacion de admisiones.',
  funnelButton: 'Ir a WhatsApp comercial',
  footer: 'Fundacion Academia Nacional de Ajedrez - Sembrando el Ajedrez en Venezuela',
}

const copyEn: Copy = {
  nav: {
    programas: 'Programs',
    torneos: 'Tournaments',
    docentes: 'Coaches',
    contacto: 'Contact',
  },
  hero: {
    kicker: 'National Chess Academy Foundation',
    title: 'We develop minds through chess with modern, human, and competitive learning.',
    subtitle:
      'Planting the seed of chess in Venezuela with international reach. Online classes, in-person coaching, learning hubs, and tournament enrollment in one platform.',
    ctaPrimary: 'Book a free diagnostic class',
    ctaSecondary: 'Explore programs',
  },
  trust: ['5,000+ trained students', 'Institutional recognition in Venezuela', 'International focus: Colombia, Miami, and Venezuela'],
  heroCards: ['Parent-centered educational model', 'Beginner to high-performance pathways', 'Permanent free diagnostic class campaign'],
  heroSceneTag: 'Real class experience',
  heroSceneCaption: 'Dynamic sessions where kids play, learn, and smile in a modern learning setting.',
  valuesTitle: 'Benefits of learning chess',
  valuesItems: [
    {
      title: 'Strategic thinking',
      body: 'Students learn to plan ahead, read scenarios, and make stronger decisions.',
    },
    {
      title: 'Applied creativity',
      body: 'Every game stimulates new ways to solve challenges on and off the board.',
    },
    {
      title: 'Discipline and focus',
      body: 'Chess builds consistency, concentration, and better time management habits.',
    },
    {
      title: 'Confidence and growth',
      body: 'Level-based progress reinforces self-esteem, resilience, and autonomy.',
    },
    {
      title: 'Community values',
      body: 'We promote respect, fair play, and collaboration among students and families.',
    },
  ],
  servicesTitle: 'Programs designed to turn potential into outcomes',
  services: [
    {
      title: 'Transversal Chess',
      body: 'Educational strategy to strengthen critical thinking, STEM skills, and emotional intelligence.',
    },
    {
      title: 'Nexus Chess',
      body: 'Digital learning lab with a standardized method and personalized tracking for online classes.',
    },
    {
      title: 'Talent Seed Program',
      body: 'Structured pathway for children and teens with competitive goals and federation transition.',
    },
    {
      title: 'Coach Development',
      body: 'Training for instructors and community leaders in modern teaching methods.',
    },
  ],
  processTitle: 'Our 3-step service roadmap',
  process: [
    {
      step: '01',
      title: 'Assess profile and goals',
      body: 'We map level, age, context, and outcomes to recommend the right program.',
    },
    {
      step: '02',
      title: 'Launch the academic plan',
      body: 'We define format, pace, and pedagogical support to ensure sustainable growth.',
    },
    {
      step: '03',
      title: 'Track measurable progress',
      body: 'We monitor results and adjust strategy to maximize motivation and performance.',
    },
  ],
  pedagogiaTitle: 'Parent-oriented academic model',
  pedagogiaBody:
    'Our core focus is beginner-level growth: assess, map learning pathways, and track progress with measurable goals for every student.',
  projectsTitle: 'Institutional impact tracks',
  projectsBody:
    'Designed for schools, communities, and sports talent, our impact tracks combine pedagogy, competition, and social development.',
  testimonialsTitle: 'What families and partners value most',
  testimonials: [
    {
      quote: 'The methodology gave my child confidence and structure from day one.',
      author: 'ANA Parent',
      role: 'Parent - Beginner level',
    },
    {
      quote: 'The academy delivered a clear and scalable framework for our educational environment.',
      author: 'Institutional Coordination',
      role: 'Education partner',
    },
  ],
  mercadosTitle: 'International coverage with competitive pricing',
  mercadosBody:
    'We support families and institutions in Bogota, Cali, Medellin, Miami, and Venezuela through synchronized and asynchronous learning formats.',
  pagosTitle: 'Accepted payment methods (phase 1 info)',
  pagosItems: ['Bank transfer', 'Zelle', 'PayPal', 'Binance', 'Mobile payments (Venezuela)'],
  funnelTitle: 'Simple enrollment flow to boost conversions',
  funnelBody:
    'Phase 1 uses Google Forms + WhatsApp redirection. Phase 2 introduces e-commerce and admissions automation.',
  funnelButton: 'Open business WhatsApp',
  footer: 'National Chess Academy Foundation - Planting the seed of chess in Venezuela',
}

export default function PropuestaPage() {
  const [lang, setLang] = useState<'es' | 'en'>('es')

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const locale = navigator.language.toLowerCase()
    if (!locale.startsWith('en')) return

    const frame = window.requestAnimationFrame(() => setLang('en'))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const c = useMemo(() => (lang === 'en' ? copyEn : copyEs), [lang])

  const ChessPieceIcon = ({ piece, className = '' }: { piece: PieceKind; className?: string }) => {
    if (piece === 'knight') {
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <path d="M7 19h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.5 19c.3-2.7 1.4-4.4 3.4-5.4 1.2-.6 2-1.6 2-2.9 0-.8-.3-1.6-.9-2.3l2.3-2.1c.5-.5.5-1.3 0-1.8-.4-.4-1.1-.5-1.6-.2l-2.1 1.3c-.7-.6-1.5-.9-2.3-.9-1.1 0-2.1.5-2.8 1.4 1.3.5 2.1 1.4 2.4 2.8-.8.2-1.5.7-2.1 1.4-.8 1-.9 2.1-.3 3.3.5 1 1.3 1.8 2.4 2.5-.3.9-.4 1.9-.4 2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11.6" cy="8.2" r="0.9" fill="currentColor" />
        </svg>
      )
    }

    if (piece === 'rook') {
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <path d="M6.5 19h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 19V9.5h8V19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M7.5 9.5V6h2.2v2.2H12V6h2.2v2.2h2.3V6h2v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M7 12.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    }

    if (piece === 'queen') {
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
          <circle cx="6.5" cy="6.8" r="1.3" fill="currentColor" />
          <circle cx="12" cy="5.2" r="1.3" fill="currentColor" />
          <circle cx="17.5" cy="6.8" r="1.3" fill="currentColor" />
          <path d="M7.4 17.8h9.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 17.8 6.7 9l5.3 3.1L17.3 9 16 17.8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 14.2h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9.4 20h5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    }

    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <path d="M8.5 19h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 19v-4.2c0-1.7 1.3-3 3-3s3 1.3 3 3V19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.3 12.3h5.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 4.5v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 6.6h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  const renderTrust = (item: string) => {
    const match = item.match(/^([+\d.,]+)\s+(.*)$/)

    if (!match) {
      return <p className="text-sm font-extrabold leading-relaxed text-[#ECECEC]">{item}</p>
    }

    return (
      <p className="leading-relaxed text-[#ECECEC]">
        <span className="block text-xl font-black tracking-tight text-[#F6BA47]">{match[1]}</span>
        <span className="block text-sm font-extrabold">{match[2]}</span>
      </p>
    )
  }

  const heroEditorialStats =
    lang === 'en'
      ? [
          { value: '12+', label: 'active cohorts' },
          { value: '3', label: 'service formats' },
          { value: '24h', label: 'response promise' },
        ]
      : [
          { value: '12+', label: 'cohortes activas' },
          { value: '3', label: 'modalidades de servicio' },
          { value: '24h', label: 'promesa de respuesta' },
        ]

  const impactItems = [
    {
      title: lang === 'en' ? 'Transversal Chess for Schools' : 'Ajedrez Transversal en Colegios',
      photo: lang === 'en' ? 'Ideal photo: students inside a partner school classroom' : 'Foto ideal: alumnos en una jornada dentro del colegio aliado',
      eyebrow: lang === 'en' ? 'School implementation' : 'Implementacion escolar',
      body:
        lang === 'en'
          ? 'A visual block for partner schools, classroom culture, and learning impact.'
          : 'Un bloque visual para mostrar colegios aliados, vida en aula e impacto pedagogico.',
      accent: 'from-[#f7d56a] via-[#fff1bf] to-white',
    },
    {
      title: lang === 'en' ? 'Nexus Chess with Global Reach' : 'Nexus Ajedrez para alcance global',
      photo: lang === 'en' ? 'Ideal photo: live online class with teacher and students on screen' : 'Foto ideal: clase online en vivo con docente y alumnos en pantalla',
      eyebrow: lang === 'en' ? 'Digital learning' : 'Aprendizaje digital',
      body:
        lang === 'en'
          ? 'Use a real session capture to support the promise of international access.'
          : 'Usar una captura real de sesion para respaldar la promesa de alcance internacional.',
      accent: 'from-[#9ec5ff] via-[#dcebff] to-white',
    },
    {
      title: lang === 'en' ? 'Talent Seed with Federation Pathway' : 'Semillero con ruta federada',
      photo: lang === 'en' ? 'Ideal photo: youth tournament with clocks, boards, and emotion' : 'Foto ideal: torneo juvenil con relojes, tableros y emocion competitiva',
      eyebrow: lang === 'en' ? 'Competitive development' : 'Desarrollo competitivo',
      body:
        lang === 'en'
          ? 'This card should feel aspirational, with intensity, focus, and tournament atmosphere.'
          : 'Esta tarjeta debe sentirse aspiracional, con intensidad, foco y atmosfera de torneo.',
      accent: 'from-[#ffb784] via-[#ffe0c7] to-white',
    },
    {
      title: lang === 'en' ? 'Teacher and Community Training' : 'Formacion docente y comunitaria',
      photo: lang === 'en' ? 'Ideal photo: teacher workshop, mentor circle, or training session' : 'Foto ideal: taller docente, circulo de mentoria o jornada de capacitacion',
      eyebrow: lang === 'en' ? 'Community training' : 'Formacion comunitaria',
      body:
        lang === 'en'
          ? 'Show facilitation, printed materials, and collaborative learning, not placeholders.'
          : 'Mostrar facilitacion, materiales impresos y aprendizaje colaborativo, no placeholders.',
      accent: 'from-[#b7f5c5] via-[#e4ffeb] to-white',
    },
  ]

  const teacherProfiles =
    lang === 'en'
      ? [
          {
            name: 'Strategic methodology',
            role: 'Beginner to competitive progression',
            body: 'Present the lead teacher here with portrait, levels taught, and a clear teaching promise.',
          },
          {
            name: 'Sports psychology support',
            role: 'Confidence, discipline, and performance habits',
            body: 'This card works best with a real face, short credentials, and a more human teaching angle.',
          },
          {
            name: 'Tournament preparation',
            role: 'Analysis, training plans, and measurable growth',
            body: 'Highlight the coach who turns talent into results through structure and competitive follow-up.',
          },
        ]
      : [
          {
            name: 'Metodologia estrategica',
            role: 'Progresion desde iniciacion hasta competencia',
            body: 'Aqui conviene presentar al docente principal con retrato, niveles que atiende y una promesa pedagogica clara.',
          },
          {
            name: 'Acompanamiento psicodeportivo',
            role: 'Confianza, disciplina y habitos de rendimiento',
            body: 'Esta tarjeta funciona mejor con un rostro real, credenciales cortas y un enfoque docente mas humano.',
          },
          {
            name: 'Preparacion para torneos',
            role: 'Analisis, planes de entrenamiento y progreso medible',
            body: 'Destaca al entrenador que convierte talento en resultados con estructura y seguimiento competitivo.',
          },
        ]

  const initials = (name: string) =>
    name
      .split(' ')
      .map(token => token[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  const navItems: Array<{ href: string; label: string; piece: PieceKind; accent: string; eyebrow: string }> = [
    {
      href: '#programas',
      label: c.nav.programas,
      piece: 'knight',
      accent: '#F6BA47',
      eyebrow: lang === 'en' ? 'Learning routes' : 'Rutas de aprendizaje',
    },
    {
      href: '#torneos',
      label: c.nav.torneos,
      piece: 'rook',
      accent: '#F6692F',
      eyebrow: lang === 'en' ? 'Competitive scene' : 'Escena competitiva',
    },
    {
      href: '#docentes',
      label: c.nav.docentes,
      piece: 'queen',
      accent: '#7C8AF6',
      eyebrow: lang === 'en' ? 'Academic guidance' : 'Guia academica',
    },
    {
      href: '#contacto',
      label: c.nav.contacto,
      piece: 'king',
      accent: '#BAFCC7',
      eyebrow: lang === 'en' ? 'Immediate action' : 'Accion inmediata',
    },
  ]

  return (
    <div className="min-h-screen bg-[#121417] text-[#ECECEC] relative overflow-x-hidden">
      {/* GLOW fondo global superior izquierdo */}
      <div className="pointer-events-none absolute -top-32 -left-32 z-0 h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-[120px]" />
      {/* GLOW fondo global superior derecho */}
      <div className="pointer-events-none absolute -top-40 right-0 z-0 h-[340px] w-[340px] rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 sm:px-8 sm:py-5 lg:px-10">
        <header className="rounded-3xl border border-white/10 bg-[#191d24] px-4 py-3 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.75)] sm:px-6 sm:py-3.5">
          <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,430px)_auto] xl:items-center xl:gap-6">
            <div className="flex items-start justify-between gap-4 xl:min-w-0">
              <div className="min-w-0 xl:max-w-[430px]">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#F6BA47]">FANA</p>
                <h1 className="max-w-[12ch] text-lg font-extrabold leading-tight tracking-tight sm:max-w-none sm:text-xl xl:max-w-none xl:whitespace-nowrap xl:text-[1rem] xl:leading-none xl:tracking-[-0.02em]">Fundacion Academia Nacional de Ajedrez</h1>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 p-1 lg:hidden">
                <button
                  type="button"
                  onClick={() => setLang('es')}
                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${lang === 'es' ? 'bg-[#F6692F] text-black' : 'text-[#ECECEC]/70'}`}
                >
                  ES
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${lang === 'en' ? 'bg-[#F6692F] text-black' : 'text-[#ECECEC]/70'}`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end xl:justify-start xl:self-stretch">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 p-1 xl:flex">
                <button
                  type="button"
                  onClick={() => setLang('es')}
                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${lang === 'es' ? 'bg-[#F6692F] text-black' : 'text-[#ECECEC]/70'}`}
                >
                  ES
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${lang === 'en' ? 'bg-[#F6692F] text-black' : 'text-[#ECECEC]/70'}`}
                >
                  EN
                </button>
              </div>

              <a
                href="#contacto"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F6692F] px-5 py-3 text-center text-[10px] font-black uppercase leading-relaxed tracking-[0.16em] text-black shadow-[0_10px_28px_-12px_rgba(246,105,47,0.9)] ring-1 ring-[#F6BA47]/45 transition hover:bg-[#f47d4d] hover:shadow-[0_16px_34px_-14px_rgba(246,105,47,0.95)] sm:w-auto sm:self-end sm:text-[11px] sm:tracking-[0.18em]"
              >
                {c.hero.ctaPrimary} <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </header>

        <section className="mt-3 grid gap-3 lg:grid-cols-4 lg:items-stretch">
          {navItems.map(item => (
            <a
              key={`${item.href}-quick`}
              href={item.href}
              className="group rounded-[1.45rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] px-4 py-3 shadow-[0_18px_40px_-34px_rgba(0,0,0,0.85)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-white/18 hover:bg-[linear-gradient(160deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] hover:shadow-[0_20px_44px_-30px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 transition group-hover:scale-[1.03]"
                  style={{ color: item.accent, boxShadow: `0 0 0 1px ${item.accent}22 inset` }}
                >
                  <ChessPieceIcon piece={item.piece} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-white/45">{item.eyebrow}</p>
                  <p className="mt-1 text-sm font-extrabold uppercase tracking-[0.16em] text-[#ECECEC]">{item.label}</p>
                </div>
                <ArrowRight size={14} className="shrink-0 text-white/35 transition duration-200 group-hover:translate-x-0.5 group-hover:text-white/70" />
              </div>
            </a>
          ))}
        </section>

        <main className="mt-8 space-y-8">
          {/* HERO con glows personalizados */}
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#1a1f27] px-5 py-14 sm:px-10 sm:py-24">
            {/* Glow naranja arriba izquierda HERO */}
            <div className="pointer-events-none absolute -top-32 -left-32 z-0 h-[340px] w-[340px] rounded-full bg-orange-500/20 blur-[120px]" />
            {/* Glow azul arriba derecha HERO */}
            <div className="pointer-events-none absolute -top-36 -right-24 z-0 h-[260px] w-[260px] rounded-full bg-blue-500/20 blur-[100px]" />
            {/* Glow extra sutil detrás de imagen HERO */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[220px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[80px]" />
            <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[#7C8AF6]/30" />
            <div className="absolute -bottom-28 left-0 h-72 w-72 rounded-full bg-[#BAFCC7]/20" />
            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(246,105,47,0.10)_0%,rgba(246,186,71,0.08)_42%,rgba(124,138,246,0.12)_100%)]" />

            <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-[9px] font-black uppercase tracking-[0.24em] text-[#ECECEC] sm:px-4 sm:text-[10px] sm:tracking-[0.3em]">
                  <Globe2 size={14} /> {c.hero.kicker}
                </p>
                <h2 className="mt-5 max-w-3xl text-[2.45rem] font-extrabold leading-[0.98] tracking-tight sm:mt-6 sm:text-5xl sm:leading-tight">
                  {c.hero.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-gray-300 sm:mt-5 sm:text-lg">
                  {c.hero.subtitle}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href="#contacto"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F6692F] px-6 py-3 text-center text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[0_12px_30px_-14px_rgba(246,105,47,0.92)] ring-1 ring-[#F6BA47]/45 transition hover:bg-[#f47d4d] hover:shadow-[0_18px_36px_-16px_rgba(246,105,47,0.95)] sm:w-auto sm:text-xs sm:tracking-[0.18em]"
                  >
                    {c.hero.ctaPrimary} <ArrowRight size={15} />
                  </a>
                  <a
                    href="#programas"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-transparent px-6 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#ECECEC]/88 transition hover:border-[#F6BA47] hover:text-[#F6BA47] sm:w-auto sm:text-xs sm:tracking-[0.18em]"
                  >
                    {c.hero.ctaSecondary}
                  </a>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {heroEditorialStats.map(item => (
                    <article key={item.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-md">
                      <p className="text-2xl font-black tracking-tight text-[#F6BA47]">{item.value}</p>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/70">{item.label}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-black/25 p-3 shadow-[0_20px_65px_-42px_rgba(0,0,0,0.8)] backdrop-blur sm:p-4">
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                  <div className="relative">
                    <Image
                      src="/chess-people-hero.svg"
                      alt="Escena moderna de ninos jugando ajedrez"
                      width={1200}
                      height={760}
                      className="h-56 w-full object-cover sm:h-72"
                      priority
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.58)_100%)]" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#BAFCC7] sm:text-[10px] sm:tracking-[0.24em]">{c.heroSceneTag}</p>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-gray-100 sm:text-base">{c.heroSceneCaption}</p>
                    </div>
                    <div className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-white sm:right-4 sm:top-4 sm:px-3 sm:text-[10px] sm:tracking-[0.2em]">
                      {lang === 'en' ? 'Institutional scene' : 'Escena institucional'}
                    </div>
                    <div className="absolute inset-x-4 bottom-4 hidden rounded-2xl border border-white/15 bg-slate-950/55 p-3 backdrop-blur-md sm:block">
                      <div className="grid grid-cols-3 gap-3">
                        {heroEditorialStats.map(item => (
                          <div key={`${item.label}-overlay`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <p className="text-lg font-black tracking-tight text-white">{item.value}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/65">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>

                <div className="grid gap-2">
                  {c.heroCards.map(item => (
                    <article key={item} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                      <p className="flex items-start gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-[#ECECEC]">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#BAFCC7]" />
                        {item}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 py-10 sm:grid-cols-3">
            {c.trust.map(item => (
              <article key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                {renderTrust(item)}
              </article>
            ))}
          </section>

          {/* BENEFICIOS con glow azul sutil */}
          <section className="relative rounded-[2rem] border border-white/10 bg-[#1a1f27] px-6 py-20 sm:px-8 sm:py-24 overflow-hidden">
            {/* Glow azul detrás de Beneficios */}
            <div className="pointer-events-none absolute -top-32 right-0 z-0 h-[320px] w-[320px] rounded-full bg-blue-500/15 blur-[100px]" />
            <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-[#ECECEC]">{c.valuesTitle}</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { color: '#F6692F', icon: Trophy },
                { color: '#F6BA47', icon: Medal },
                { color: '#ECECEC', icon: CheckCircle2 },
                { color: '#BAFCC7', icon: HeartHandshake },
                { color: '#7C8AF6', icon: Globe2 },
              ].map((item, index) => {
                const value = c.valuesItems[index]
                const Icon = item.icon

                return (
                  <article key={value.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                    <div className="inline-flex rounded-xl p-2" style={{ backgroundColor: `${item.color}22` }}>
                      <Icon size={18} style={{ color: item.color }} />
                    </div>
                    <p className="mt-3 text-sm font-black leading-tight text-[#ECECEC]">{value.title}</p>
                    <p className="mt-2 text-base font-medium leading-relaxed text-gray-400">{value.body}</p>
                  </article>
                )
              })}
            </div>
          </section>

          <section id="programas" className="mt-6 rounded-[2rem] border border-[#d9e3ef] bg-white px-6 py-20 sm:px-8 sm:py-24">
            <div className="mb-6 flex items-center gap-3">
              <GraduationCap className="text-blue-700" size={24} />
              <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.servicesTitle}</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[Smartphone, HeartHandshake, Trophy, Telescope].map((Icon, index) => {
                const service = c.services[index]
                return (
                  <article key={service.title} className="rounded-2xl bg-gradient-to-br from-white to-[#f6fbff] p-5 shadow-xl shadow-slate-900/5">
                    <div className="inline-flex rounded-xl bg-[#eaf2ff] p-2 text-blue-700">
                      <Icon size={18} />
                    </div>
                    <h4 className="mt-4 text-lg font-black tracking-tight text-[#223449]">{service.title}</h4>
                    <p className="mt-2 text-base font-medium leading-relaxed text-gray-600">{service.body}</p>
                    <button className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.18em] text-[#30445b] transition hover:text-[#1d2b3a]">
                      Ver mas <ChevronRight size={14} />
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="bg-white px-1 py-20 sm:px-0 sm:py-24">
            <div className="mb-6 flex items-center gap-3">
              <Medal className="text-amber-600" size={24} />
              <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.processTitle}</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {c.process.map(item => (
                <article key={item.step} className="rounded-2xl bg-[#fbfdff] p-5 shadow-lg shadow-slate-900/5">
                  <p className="text-3xl font-black tracking-tight text-slate-300">{item.step}</p>
                  <h4 className="mt-2 text-lg font-black tracking-tight text-[#1d2b3a]">{item.title}</h4>
                  <p className="mt-2 text-base font-medium leading-relaxed text-gray-600">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-5 py-20 lg:grid-cols-2 sm:py-24">
            <article className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5">
              <div className="flex items-center gap-3">
                <Users className="text-indigo-700" size={22} />
                <h4 className="text-xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.pedagogiaTitle}</h4>
              </div>
              <p className="mt-3 text-lg font-medium leading-relaxed text-gray-600">{c.pedagogiaBody}</p>
            </article>

            <article className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5">
              <div className="flex items-center gap-3">
                <Globe2 className="text-cyan-700" size={22} />
                <h4 className="text-xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.mercadosTitle}</h4>
              </div>
              <p className="mt-3 text-lg font-medium leading-relaxed text-gray-600">{c.mercadosBody}</p>
            </article>
          </section>

          <section className="bg-white px-1 py-20 sm:px-0 sm:py-24">
            <h4 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.projectsTitle}</h4>
            <p className="mt-3 max-w-3xl text-lg font-medium leading-relaxed text-gray-600">{c.projectsBody}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {impactItems.map((item, index) => (
                <article key={item.title} className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                  <div className={`relative h-44 bg-gradient-to-br ${item.accent} p-4`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),transparent_42%)]" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                          {item.eyebrow}
                        </span>
                        <span className="text-3xl font-black tracking-tight text-slate-900/20">0{index + 1}</span>
                      </div>
                      <p className="max-w-[18ch] text-sm font-bold leading-snug text-slate-700">{item.photo}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-lg font-black leading-tight tracking-tight text-slate-800">{item.title}</p>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="torneos" className="grid gap-5 py-20 lg:grid-cols-[1fr_1fr] sm:py-24">
            <article className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5">
              <div className="flex items-center gap-3">
                <Trophy className="text-amber-600" size={22} />
                <h4 className="text-xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">Torneos y calendario interactivo</h4>
              </div>
              <p className="mt-3 text-lg font-medium leading-relaxed text-gray-600">
                Espacio disenado para inscripciones, cronogramas y resultados de eventos. Base preparada para conectar un calendario interactivo en la siguiente iteracion.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                <CalendarDays size={14} /> Calendario en fase de integracion
              </div>
            </article>

            <article className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5">
              <h4 className="text-xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.pagosTitle}</h4>
              <ul className="mt-4 space-y-3">
                {c.pagosItems.map(item => (
                  <li key={item} className="rounded-xl border border-slate-200 bg-[#f7fbff] px-4 py-3 text-sm font-bold text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="bg-white px-1 py-20 sm:px-0 sm:py-24">
            <h4 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.testimonialsTitle}</h4>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {c.testimonials.map(item => (
                <article key={item.quote} className="rounded-2xl bg-[#f8fbff] p-5 shadow-xl shadow-slate-900/5">
                  <Quote className="text-[#7C8AF6]" size={26} />
                  <p className="mt-2 text-lg font-medium leading-relaxed text-gray-600">&ldquo;{item.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d2b3a] text-[11px] font-black text-white">
                      {initials(item.author)}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{item.author}</p>
                      <p className="text-xs font-bold text-slate-400">{item.role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="docentes" className="rounded-[2rem] border border-[#d9e3ef] bg-gradient-to-br from-[#eef7ff] via-white to-[#fff6ed] px-6 py-20 sm:px-8 sm:py-24">
            <h4 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">Perfiles docentes destacados</h4>
            <p className="mt-3 max-w-3xl text-lg font-medium leading-relaxed text-gray-600">
              {lang === 'en'
                ? 'Use this section to introduce your teaching team with portraits, specialties, and concrete learning outcomes.'
                : 'Usa esta seccion para presentar al equipo docente con retratos, especialidades y resultados de aprendizaje concretos.'}
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {teacherProfiles.map((item, index) => (
                <article key={item.name} className="rounded-[1.7rem] border border-white/70 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white shadow-lg shadow-slate-900/15">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="text-base font-black tracking-tight text-slate-800">{item.name}</p>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{item.role}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="contacto" className="rounded-[2rem] border border-[#d9e3ef] bg-white px-6 py-20 sm:px-8 sm:py-24">
            <h4 className="text-2xl font-extrabold leading-tight tracking-tight text-[#1d2b3a]">{c.funnelTitle}</h4>
            <p className="mt-3 max-w-3xl text-lg font-medium leading-relaxed text-gray-600">{c.funnelBody}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="https://wa.me/584126256525"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-500"
              >
                {c.funnelButton} <ArrowRight size={15} />
              </a>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">WhatsApp: +58 412 6256525</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#cfdceb] bg-slate-900 px-6 py-20 text-white sm:px-10 sm:py-24">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-300">
              {lang === 'en' ? 'Ready to enroll?' : 'Listos para comenzar?'}
            </p>
            <h4 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {lang === 'en'
                ? 'Let us take your learning path to an international level.'
                : 'Llevemos tu ruta de aprendizaje a un nivel internacional.'}
            </h4>
            <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed text-gray-400">
              {lang === 'en'
                ? 'Book your free diagnostic class and receive a personalized academic proposal in less than 24 hours.'
                : 'Agenda tu diagnostico gratis y recibe una propuesta academica personalizada en menos de 24 horas.'}
            </p>
            <a
              href="https://wa.me/584126256525"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#F6692F] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[0_14px_34px_-14px_rgba(246,105,47,0.95)] ring-1 ring-[#F6BA47]/40 transition hover:bg-[#f47d4d] hover:shadow-[0_20px_40px_-16px_rgba(246,105,47,1)]"
            >
              {lang === 'en' ? 'Immediate contact' : 'Contacto inmediato'} <ArrowRight size={15} />
            </a>
          </section>
        </main>

        <footer className="py-8 text-center text-xs font-bold uppercase tracking-[0.17em] text-slate-500">
          {c.footer}
        </footer>

        <div className="pb-10 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[#223449] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-md transition hover:bg-[#30445b] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F6BA47] focus:ring-offset-2"
          >
            Acceder a ANA-FANA
          </Link>
        </div>
      </div>
    </div>
  )
}
