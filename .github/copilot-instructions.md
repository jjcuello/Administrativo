# Copilot instructions for this repository

Purpose: Help an AI coding agent be immediately productive in this Next.js + Supabase app.

- **Big picture:** This is a Next.js 16 app using the `app/` directory (server components by default) with a client-side Supabase JS client at `src/lib/supabase.ts`. UI lives under `src/app` (e.g. `src/app/gestion/...`). There are duplicated nested paths under `src/app/gestion/clientes/src/app/...` — treat those as either generated/experimental copies or search for the true source when editing.

- **Key files to read first:**
  - [package.json](package.json#L1) — scripts and major deps (Next 16, React 19, Tailwind).
  - [src/lib/supabase.ts](src/lib/supabase.ts#L1) — Supabase client configuration and required env vars.
  - [src/app/layout.tsx](src/app/layout.tsx#L1) — global layout, fonts, and CSS import.
  - [next.config.ts](next.config.ts#L1) — project-level Next config (`reactCompiler: true`).

- **Workflows / commands:**
  - Dev: `npm run dev` (runs `next dev`).
  - Build: `npm run build` (runs `next build`).
  - Start (production): `npm run start` (runs `next start`).
  - Lint: `npm run lint` (runs `eslint`).
  - Environment: create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before starting.

- **Project-specific patterns & conventions:**
  - Uses the Next `app/` directory (server components by default). Add `"use client"` at the top of a file to make it a client component.
  - Fonts are loaded in `src/app/layout.tsx` via `next/font` (Geist families) and injected as CSS variables (see `geistSans.variable`).
  - Supabase is used directly from the client: avoid adding secret server keys to `src/lib/supabase.ts`; server-only keys are not present in this repo.
  - UI structure: look under `src/app/gestion/` for business feature pages (`clientes`, `alumnos`, `clubes`, `colegios`, `particulares`, `tardes`).
  - CSS: global styles in `src/app/globals.css` and Tailwind configured (see `postcss.config.mjs`).

- **Integration points & externals:**
  - Supabase: `@supabase/supabase-js` (client). Read `src/lib/supabase.ts` for how env vars are consumed.
  - Tailwind / PostCSS: styles use Tailwind v4; edits to design tokens occur in `globals.css`.

- **Editing guidance / examples:**
  - To add a new feature page under management: add a route under `src/app/gestion/<feature>/page.tsx`.
  - To query data, reuse `supabase` from `src/lib/supabase.ts`:

    Example: `const { data, error } = await supabase.from('table').select('*')`

  - If adding client-only hooks or stateful UI, add `"use client"` at file top and import React hooks.

- **Common gotchas found in repo:**
  - Duplicate nested `src/app` copies may confuse searches or edits. Prefer the top-level `src/app/...` paths unless the nested copy is explicitly used.
  - Missing env vars will log an error in `src/lib/supabase.ts`; ensure `.env.local` is present for local dev.

- **When to open a PR vs quick edit:**
  - Small textual fixes, README tweaks: quick PRs are fine.
  - Structural changes (routing, auth flows, supabase schema changes): open an issue + PR describing migration/rollout steps.

If any section is unclear or you'd like more examples (e.g., typical Supabase queries used across `src/app/gestion`), tell me which area to expand.
