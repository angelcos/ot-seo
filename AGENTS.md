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

### Contexto tecnico vigente (release 0.3.0)

- Stack: Next.js 16.3.0, React 19, Prisma 6.13.0, SQLite local.
- Ruta canonica de DB: `prisma/prisma/dev.db` y `DATABASE_URL="file:./prisma/dev.db"`.
- Script de actualizacion operativo: `update-ot.bat`.
- Endpoint de salud: `/api/health` (app + DB).
- Modelos Prisma: `WorkOrder`, `WorkTimeEntry`, `Mechanic`, `Brand`, `QuickEntry`.
- Al actualizar desde 0.2.0: ejecutar `db:push` para crear la tabla `QuickEntry`.

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

### Estandares de UI — Design System Industrial

El sistema de diseno reside exclusivamente en `src/components/ui/industrial-ui.tsx`.
**Regla principal: ningun patron de UI se duplica fuera de ese archivo.**

#### Tokens de identidad (solo estos, sin excepcion)

| Token | Valor | Uso |
|-------|-------|-----|
| Rojo corporativo | `#B81318` | Acciones primarias, titulos de acento, valores en stat cards |
| Carbon | `#33353A` | Cabeceras de panel, fondos oscuros, texto secondary |
| Gris claro | `#F0F0F0` | Fondos de secciones internas, tarjetas de quick load |
| Borde | `#CCCCCC` | Todos los bordes de paneles, tablas y separadores |
| Blanco | `#FFFFFF` | Fondo de pagina y tarjetas |

Ningun otro color de fondo ni borde se introduce salvo para estados semanticos (error, warning, success) definidos en `IndustrialAlert` y `IndustrialBadge`.

#### Geometria

- **Cero border-radius** en paneles, botones, tarjetas, tablas y cabeceras. Esta es una restriccion absoluta del sistema.
- Unica excepcion permitida: modales/dialogs flotantes (`rounded-3xl`) y elementos internos de modales (`rounded-xl`, `rounded-lg`) porque flotan sobre la UI industrial y necesitan diferenciarse visualmente.
- Cortes diagonales: usar exclusivamente `industrialClipPaths` e `industrialTabGeometry` exportados del design system. No calcular `clip-path` ad hoc.

#### Componentes disponibles y cuando usarlos

| Componente | Cuando usarlo |
|-----------|---------------|
| `IndustrialPanel` | Toda seccion con cabecera oscura. Nunca construir el patron manualmente. |
| `IndustrialSectionHeading` | Si se necesita la cabecera sin el wrapper `<section>`. |
| `IndustrialHeader` | Header de pagina de 3 paneles. Solo uno por pagina. |
| `IndustrialHeaderActionLink` | Links de navegacion en el header de pagina. |
| `IndustrialHeaderActionButton` | Botones de accion en el header de pagina. |
| `IndustrialButton` | Todo boton de accion. Variantes: `primary`, `secondary`, `danger`, `warning`, `ghost`. |
| `IndustrialInput` | Todo `<input>` en formularios. |
| `IndustrialSelect` | Todo `<select>` en formularios con fondo claro. |
| `IndustrialTextarea` | Todo `<textarea>` en formularios. |
| `IndustrialCombobox` | Selects con busqueda/filtrado (ej. marcas). |
| `IndustrialBadge` | Etiquetas inline de estado o conteo. Variantes: `red`, `slate`, `emerald`, `amber`. |
| `IndustrialAlert` | Mensajes de error, aviso o exito. Variantes: `danger`, `warning`, `success`, `info`. |
| `IndustrialStatCard` | Tarjeta de estadistica numerica grande. |
| `IndustrialEmptyState` | Mensaje de lista vacia. |

#### Excepcion conocida: select en cabecera oscura de panel

`IndustrialSelect` tiene `bg-white` en su clase base. Cuando se usa dentro de `headingChildren` de un `IndustrialPanel` (fondo `#33353A`), el conflicto de clases Tailwind hace que `bg-white` prevalezca. En ese caso concreto usar `<select>` nativo con `style={{ backgroundColor: '#33353A', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}`. Esta es la unica excepcion documentada al uso de componentes del sistema.

#### Reglas para extender el sistema

- Si se necesita una variante nueva de boton, badge o alert: **anadirla al registro en `industrial-ui.tsx`**, no usar clases Tailwind ad hoc en el componente consumidor.
- Si se necesita un nuevo patron de layout reutilizable: extraerlo como componente en `industrial-ui.tsx` antes de duplicarlo en dos o mas lugares.
- Los `industrialClasses` (panel, emptyState, headerActionControl) son la fuente canonica de clases base. Si una clase base cambia, cambia solo en ese objeto.
- No importar estilos desde fuera de `industrial-ui.tsx` ni de `globals.css` para logica de componentes. `globals.css` es solo para resets y variables globales.

#### Tipografia

- Unica fuente: **Inter** (cargada en `layout.tsx` via `next/font/google`).
- No importar otras fuentes. No usar `font-mono` salvo para numeros de OT y codigos de placa.

#### Inline styles

Permitidos unicamente para:
1. `clip-path` (valores geometricos complejos no expresables en Tailwind).
2. El caso de select en cabecera oscura documentado arriba.
3. Anchos/alturas de graficas calculados dinamicamente en `performance-app.tsx`.

Para todo lo demas: clases Tailwind.
