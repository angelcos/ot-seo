# SEO OT

Version actual: `0.2.0`

Aplicacion local para el taller SEO con gestion de Ordenes de Trabajo (OT), carga de tiempos por mecanico y reportes operativos.

## Que incluye la version 0.2.0

- Alta y edicion completa de OT.
- Numero unico por OT con formato `OT-AAAA-000001`.
- Estados de OT y historial de trabajo (incluye estado **Anulada**).
- Registro de tiempos por OT con multiples entradas por mecanico y por dia.
- Horas reales y facturables por entrada de tiempo.
- Reportes por semana y mes con:
	- horas reales vs facturables,
	- utilizacion de capacidad por mecanico,
	- contexto por jornada comun (6h, 8h, etc.) en la grafica diaria.
- Catalogos de mecanicos y marcas.
- Validacion robusta de catalogos (duplicados case-insensitive, mensajes claros en conflicto).
- Marca en OT con combobox filtrable y restriccion a marcas activas del catalogo.
- PDF imprimible por OT.

## Estado actual consolidado (release 0.2.0)

- Vistas principales forzadas a dinamicas para evitar datos obsoletos:
	- `/`
	- `/configuracion`
- Validacion de marca en backend (POST/PATCH OT):
	- se normaliza por clave case-insensitive,
	- se rechaza marca no registrada o inactiva.
- `update-ot.bat` robustecido para operacion por doble clic:
	- modos `F` (full), `R` (recovery), `L` (limitado),
	- opcion `--force`,
	- health check real y recuperacion escalonada,
	- backup automatico con retencion.

## Stack

- Next.js 16 + TypeScript
- Prisma ORM
- SQLite local (`prisma/prisma/dev.db`) con `DATABASE_URL="file:./prisma/dev.db"`.
- pdf-lib para generar OT en PDF
- Zod para validaciones de API

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion rapida

```bash
npm ci
npm run db:generate
npm run db:push
```

## Ejecucion local

```bash
npm run dev
```

Abrir en navegador:

- http://localhost:3000

## Ejecucion en red local (LAN)

Para que otros equipos del taller entren por red interna:

```bash
npm run dev:lan
```

Acceso desde otros equipos:

- http://IP_DEL_PC_SERVIDOR:3000

## Modo produccion local

```bash
npm run build
npm run start:lan
```

## Calidad, lint y tests automaticos

- Lint recomendado para este proyecto: ESLint de Next.js + TypeScript con `eslint-config-next/core-web-vitals` y `eslint-config-next/typescript`.
- El lint de release ignora `tmp/**` para no mezclar utilitarios locales con codigo de producto.
- Comando de control de calidad previo a release:

```bash
npm run lint
npm run build
```

- Estado actual de tests automaticos:
	- No hay suite de tests unitarios/integracion automatizada en esta version `0.2.0`.
	- La validacion automatica de release se basa en lint + build + comprobaciones funcionales manuales.

- Recomendacion para siguiente iteracion:
	- incorporar una suite minima (por ejemplo, pruebas de APIs criticas y validaciones de formularios) antes de `0.2.1`.

## Documentacion de agentes IA

- Reglas generales de agentes: [AGENTS.md](AGENTS.md)
- Reglas para sesiones con Claude: [CLAUDE.md](CLAUDE.md)

## Endpoints principales

- `GET/POST /api/work-orders`
- `PATCH /api/work-orders/[id]`
- `GET/POST /api/work-orders/[id]/time-entries`
- `PATCH/DELETE /api/time-entries/[id]`
- `GET /api/reports?mode=week|month&ref=YYYY-MM-DD`
- `GET /api/work-orders/[id]/pdf`
- `GET/POST /api/mechanics`
- `GET/POST /api/brands`

## Pantallas principales

- `/`: operacion de OT y carga de tiempos.
- `/configuracion`: catalogos (mecanicos, marcas, capacidad diaria).
- `/reportes`: reportes semanales/mensuales.

## Despliegue en PC del taller (Windows + NSSM)

Guia completa:

- [INSTALACION_WINDOWS_NSSM.md](INSTALACION_WINDOWS_NSSM.md)

## Notas operativas
- Base de datos local en `prisma/prisma/dev.db`.
- URL correcta para Prisma en `.env`: `DATABASE_URL="file:./prisma/dev.db"`.
- Script de actualizacion: `update-ot.bat`.
- `update-ot.bat` crea backup automatico de la DB antes de actualizar en `tmp/db-backups/dev-YYYYMMDD-HHMMSS.db`.
- Para backup y ejecucion, el script usa como ruta canonica `prisma/prisma/dev.db`.
- No migra automaticamente rutas legacy de DB: usa solo la ruta canonica definida.
- El script conserva solo los ultimos 8 backups y elimina los mas antiguos automaticamente.
- Al finalizar, muestra en consola la ruta del ultimo backup generado.
- Al finalizar, informa tambien el estado final del servicio (`RUNNING` o `NO RUNNING`) si existe.
- Al finalizar, muestra tambien URLs clicables de acceso local y LAN.
- La consola queda abierta con mensaje de confirmacion para poder revisar el resultado del update.
- El update es inteligente: si no hay cambios (o son solo docs), evita parar servicio y omite tareas pesadas.
- Si el servicio `SEO-OT` existe pero esta parado, el script lo inicia al finalizar aunque no haya updates.
- Si el servicio figura `RUNNING` pero la web no responde, el script verifica salud HTTP en `http://localhost:3000/`, intenta un reinicio automatico y muestra diagnostico/logs si sigue fallando.
- Si el servicio `SEO-OT` existe, el script rehace automaticamente la configuracion clave de NSSM (Application, AppDirectory, AppParameters y logs) antes de validarlo.
- Si falta el build de produccion de Next (`.next/BUILD_ID`), el script ejecuta `npm run build` y vuelve a intentar arrancar el servicio.
- Si el build de produccion falla (por ejemplo, errores TypeScript), activa modo contingencia `dev:lan` para mantener la app operativa en taller.
- Si detecta `@prisma/client did not initialize yet` (o falta el cliente generado), ejecuta `npm run db:generate`, reinicia el servicio y revalida la salud.
- Si detecta errores de esquema Prisma (`P2021`, `P2022`, tabla/columna faltante), ejecuta `npm run db:push -- --accept-data-loss`, reinicia y vuelve a validar.
- El script lee `APP_HOSTNAME` y `APP_PORT` desde `.env`, detecta la IP local actual, sincroniza la entrada de `hosts` local y muestra URLs actualizadas.
- El script persiste en `.env` la IP detectada como `APP_HOST_IP` para mantener trazabilidad y reutilizarla en origenes de desarrollo.
- En desarrollo, `allowedDevOrigins` se construye dinamicamente con `localhost`, hostname configurado e IPs IPv4 de la maquina.
- `update-ot.bat` ejecuta `npm run db:push -- --accept-data-loss`.
- Aunque hay backup automatico, se recomienda conservar una copia externa antes de cambios grandes.




