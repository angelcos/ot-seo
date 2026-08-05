# SEO OT

Aplicacion local para el taller SEO que permite:

- Crear Ordenes de Trabajo (OT) desde un formulario.
- Generar numero unico por OT con formato `OT-AAAA-000001`.
- Listar todas las OT registradas.
- Abrir y descargar el PDF imprimible de cada OT.

## Stack

- Next.js 16 + TypeScript
- Prisma ORM
- SQLite local (`prisma/dev.db`)
- pdf-lib para generar OT en PDF

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

```bash
npm install
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

Luego acceder desde otro equipo con:

- http://IP_DEL_PC_SERVIDOR:3000

Ejemplo:

- http://192.168.1.20:3000

## Modo produccion local

```bash
npm run build
npm run start:lan
```

## Estructura importante

- `prisma/schema.prisma`: modelo de datos de OT
- `src/app/api/work-orders/route.ts`: API de listado y creacion
- `src/app/api/work-orders/[id]/pdf/route.ts`: API de PDF por OT
- `src/components/work-orders-app.tsx`: formulario + tabla historial

## Notas

- Base de datos local en `prisma/dev.db`.
- Logo usado para PDF: `public/seo-logo.jpg`.
- Plantilla OT usada por el PDF: `public/ot-seo-clean.png`.

## Publicar en GitHub (repositorio publico)

Antes del primer push:

- Mantener `tmp/`, `prisma/prisma/dev.db`, `.env` y `.next/` fuera del repositorio (ya estan ignorados).
- Revisar que no haya datos reales de clientes en archivos sueltos del proyecto.

Pasos sugeridos:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## Usar cuenta personal y de empresa en el mismo equipo

Si ya tienes cuenta de empresa configurada, puedes usar una identidad distinta solo para este proyecto.

Configurar identidad local (solo en esta carpeta):

```bash
git config user.name "Tu Nombre Personal"
git config user.email "tu_correo_personal@ejemplo.com"
```

Comprobar identidad activa en este proyecto:

```bash
git config user.name
git config user.email
```

Opcional recomendado para no mezclar credenciales SSH:

- Crear dos claves SSH (empresa y personal).
- Definir alias en `~/.ssh/config` (por ejemplo `github-work` y `github-personal`).
- En este proyecto usar remote con alias personal:

```bash
git remote set-url origin git@github-personal:TU_USUARIO/TU_REPO.git
```
