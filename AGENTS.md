<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SEO OT - Guia de agentes IA del proyecto

Este archivo define el comportamiento esperado para asistentes IA que colaboren en este repositorio.

### Objetivo operativo

- Priorizar estabilidad para uso de taller (produccion local Windows + NSSM).
- Evitar cambios riesgosos en rutas de DB, scripts de actualizacion y APIs criticas sin validacion.
- Cerrar cada cambio con verificacion minima (`npm run lint` y `npm run build`).

### Contexto tecnico vigente (release 0.2.0)

- Stack: Next.js 16.3.0, React 19, Prisma 6.13.0, SQLite local.
- Ruta canonica de DB: `prisma/prisma/dev.db` y `DATABASE_URL="file:./prisma/dev.db"`.
- Script de actualizacion operativo: `update-ot.bat`.
- Endpoint de salud: `/api/health` (app + DB).

### Reglas para agentes

- Antes de tocar codigo Next, consultar documentacion incluida en `node_modules/next/dist/docs/` y respetar deprecaciones.
- Mantener validaciones de negocio en backend aunque exista validacion de UI.
- No introducir migraciones automaticas en scripts de update para produccion de taller.
- Si se modifica `update-ot.bat`, preservar modos interactivos `F`/`R`/`L` y opcion `--force`.
- Si se modifica documentacion, reflejar estado real de release y comandos efectivos.

### Agentes IA recomendados en este proyecto

- GitHub Copilot (GPT-5.3-Codex): agente principal para implementacion y QA rapido.
- Subagente Explore: exploracion de codigo read-only cuando se necesite ubicar contexto con rapidez.
- Claude (via `CLAUDE.md`): debe heredar estas mismas reglas para mantener consistencia.

### Definicion de "hecho" para cambios de codigo

1. Codigo compila (`npm run build`).
2. Lint de release limpio (`npm run lint`).
3. Documentacion actualizada cuando cambie comportamiento operativo.
4. No se rompe flujo local (`/`) ni configuracion (`/configuracion`) ni salud (`/api/health`).
