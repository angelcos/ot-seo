# SEO OT

Version actual: `0.3.0`

Aplicacion local para el taller SEO con gestion de Ordenes de Trabajo (OT), carga de tiempos por mecanico, Registro Express sin OT y Centro de Analisis operativo.

## Que incluye la version 0.3.0

### Gestion de OT
- Alta, edicion y baja completa de OT.
- Numero unico por OT con formato `OT-AAAA-000001`.
- Estados: Pendiente, En curso, Terminada, Anulada.
- Registro de tiempos por OT: multiples entradas por mecanico y por dia, con horas reales y facturables.
- PDF imprimible por OT.
- Historial de OT con ventana de 6 meses por defecto; boton para cargar historial completo.
- Filtro por mecanico en historial.
- Filtro por matricula en historial (`?plate=XXXX` via URL o desde el Centro de Analisis).

### Registro Express
- Modal global en la pagina principal para registrar horas sin necesitar OT (modelo `QuickEntry`).
- Campos: placa, mecanico, fecha, horas reales, horas facturables, notas.

### Centro de Analisis (`/analisis`)
- **Rendimiento**: grafica diaria de horas reales vs facturables por mecanico (semana/mes), con navegacion temporal y contexto de jornada.
- **Vehiculos**: busqueda por matricula con listado de OT y registros express, estadisticas de visitas y horas. Ventana de 12 meses por defecto con carga completa opcional. Boton "Ver registros" enlaza al historial raiz con filtro de placa activo.
- **Mecanicos**: estadisticas por nombre: OT asignadas, completadas, vehiculos unicos, distribucion por marca y horas totales. Enlace directo al historial raiz filtrado por mecanico.

### Catalogos y configuracion (`/configuracion`)
- Mecanicos: nombre, capacidad diaria en horas, activar/desactivar/eliminar.
- Marcas: catalogo con activar/desactivar/eliminar.
- Validacion de marca en OT (backend rechaza marcas no registradas o inactivas).

### Diseno
- Sistema de diseno industrial corporativo: rojo `#B81318` / carbon `#33353A`, sin border-radius, angulos rectos, cortes diagonales con `clip-path`.
- Tipografia Inter. Header 3-paneles. Pestanas tipo paralelogramo.

## Estado actual consolidado (release 0.3.0)

- Vista `/analisis` reemplaza a `/reportes` (eliminada).
- Endpoint `/api/performance` reemplaza a `/api/reports`.
- Modelo `QuickEntry` en schema Prisma (requiere `db:push` al actualizar desde 0.2.0).
- Queries de analisis optimizadas: `aggregate()` para sumas, `distinct` para OTs unicas por mecanico.
- Vistas principales forzadas a dinamicas para evitar datos obsoletos.
- `update-ot.bat` robustecido: modos `F`/`R`/`L`, `--force`, health check, recuperacion escalonada, backup automatico.

## Stack

- Next.js 16 + TypeScript
- Prisma ORM 6.13.0
- SQLite local (`prisma/prisma/dev.db`) con `DATABASE_URL="file:./prisma/dev.db"`.
- pdf-lib para generar OT en PDF.

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion rapida

```bash
npm ci
npm run db:generate
npm run db:push
```

> Si actualizas desde 0.2.0: `db:push` es necesario para crear el modelo `QuickEntry`.

## Ejecucion local

```bash
npm run dev
```

Abrir en navegador: http://localhost:3000

## Ejecucion en red local (LAN)

```bash
npm run dev:lan
```

Acceso desde otros equipos: http://IP_DEL_PC_SERVIDOR:3000

## Modo produccion local

```bash
npm run build
npm run start:lan
```

## Calidad

```bash
npm run lint
npm run build
```

- No hay suite de tests automaticos en esta version. La validacion de release se basa en lint + build + comprobaciones funcionales manuales.

## Documentacion de agentes IA

- [AGENTS.md](AGENTS.md) — reglas generales de agentes.
- [CLAUDE.md](CLAUDE.md) — reglas para sesiones con Claude.

## Endpoints principales

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET/POST | `/api/work-orders` | Listado y alta de OT |
| PATCH | `/api/work-orders/[id]` | Edicion de OT |
| GET | `/api/work-orders/[id]/pdf` | PDF imprimible |
| GET/POST | `/api/work-orders/[id]/time-entries` | Tiempos por OT |
| PATCH/DELETE | `/api/time-entries/[id]` | Edicion/baja de entrada de tiempo |
| GET/POST | `/api/quick-entries` | Registro Express sin OT |
| GET | `/api/performance?mode=week\|month&ref=` | Rendimiento por periodo |
| GET | `/api/analisis/vehiculo?plate=&all=` | Historico por matricula |
| GET | `/api/analisis/mecanico?name=` | Estadisticas por mecanico |
| GET/POST | `/api/mechanics` | Catalogo de mecanicos |
| GET/POST | `/api/brands` | Catalogo de marcas |
| GET | `/api/health` | Estado de la app y la DB |

## Pantallas principales

| Ruta | Descripcion |
|------|-------------|
| `/` | Historial y gestion de OT, Registro Express |
| `/analisis` | Centro de Analisis (Rendimiento, Vehiculos, Mecanicos) |
| `/configuracion` | Catalogos de mecanicos y marcas |

## Despliegue en PC del taller (Windows + NSSM)

Guia completa: [INSTALACION_WINDOWS_NSSM.md](INSTALACION_WINDOWS_NSSM.md)

## Notas operativas

- Base de datos local en `prisma/prisma/dev.db`.
- URL correcta para Prisma en `.env`: `DATABASE_URL="file:./prisma/dev.db"`.
- Script de actualizacion: `update-ot.bat` (doble clic, soporte `--force`).
- Backup automatico de DB antes de cada update con retencion de 8 copias.
- El script detecta la IP local, sincroniza `hosts` y muestra URLs actualizadas al finalizar.

