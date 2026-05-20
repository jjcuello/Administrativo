# Administrativo / FANA Web

Repositorio Next.js compartido para iterar la experiencia visual del sitio web de la Fundacion Academia Nacional de Ajedrez.

## Enfoque de este repo

- Prioriza **paginas, componentes, estilos y assets**.
- Incluye la landing publica (`/` y `/propuesta`) y la app interna existente.
- Omite helpers operativos del servidor para mantener una superficie mas limpia para trabajo de UI/UX.

## Requisitos

1. Node.js 22
2. npm
3. Un archivo `.env.local` basado en `.env.example`

## Variables de entorno

1. Copia `.env.example` a `.env.local`
2. Completa las claves de Supabase y, si aplica, las del agente AI

```bash
cp .env.example .env.local
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Scripts utiles

```bash
npm run dev
npm run lint
npm run build
```

## Rutas frontend clave

- `src/app/page.tsx`: entrada publica principal
- `src/app/propuesta/page.tsx`: landing publica actual
- `src/app/layout.tsx`: shell global
- `src/app/globals.css`: estilos globales
- `public/branding` y `public/images`: assets visuales

## Notas para colaboracion visual

- Mantener cambios enfocados en layout, tipografia, color, espaciado, componentes y assets
- Evitar introducir secretos en el repositorio
- Si se necesita contexto funcional, revisar los componentes y hooks en `src/`
