# Instalacion local en Windows + NSSM (SEO-OT)

Version objetivo de esta guia: `0.3.0`

Guia completa para instalar la aplicacion en un PC del taller (Windows), dejarla accesible por LAN y ejecutarla como servicio para que no dependa de una ventana de consola.

Esta version incorpora Centro de Analisis (rendimiento, historico por vehiculo/mecanico), Registro Express sin OT, diseno industrial corporativo y optimizaciones de carga.

## 1) Requisitos previos

- Windows 10/11
- Acceso con usuario administrador
- Conexion a internet para descargar dependencias

## 2) Instalar herramientas base

Abrir **PowerShell como Administrador**.

### 2.1 Instalar Git

```powershell
winget install --id Git.Git -e --source winget
```

### 2.2 Instalar Node.js LTS (incluye npm)

```powershell
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

Cerrar y abrir de nuevo la terminal.

### 2.3 Verificar instalacion

```powershell
git --version
node -v
npm -v
```

## 3) Si PowerShell bloquea npm (ExecutionPolicy)

Si aparece error de scripts no habilitados:

### Opcion temporal (solo sesion actual)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm -v
```

### Opcion persistente (usuario actual)

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
npm -v
```

### Alternativa sin cambiar politica

```powershell
npm.cmd -v
```

## 4) Clonar proyecto en el servidor

```powershell
cd C:\
git clone https://github.com/TU_USUARIO/TU_REPO.git ot-seo
cd C:\ot-seo
```

## 5) Configurar entorno y dependencias

```powershell
copy .env.example .env
npm ci
npm run db:generate
npm run db:push
npm run build
```

Nota:

- Si actualizas desde una version previa con cambios estructurales de datos, usa `update-ot.bat` para aplicar el flujo oficial de actualizacion.

## 6) Levantar en LAN (prueba manual)

```powershell
npm run start:lan
```

Probar en el mismo equipo:

- http://localhost:3000

Probar desde otro equipo:

- http://IP_DEL_SERVIDOR:3000

## 7) Abrir puerto 3000 en Firewall

```powershell
netsh advfirewall firewall add rule name="SEO-OT 3000" dir=in action=allow protocol=TCP localport=3000
```

## 8) Configurar hostname local (ejemplo: seo-ot)

> Esto hay que hacerlo en cada equipo cliente que quiera resolver el nombre, salvo que tengas DNS local.

En PowerShell (Administrador):

```powershell
$hosts = "$env:SystemRoot\System32\drivers\etc\hosts"
if (-not (Select-String -Path $hosts -Pattern "^\s*192\.168\.0\.31\s+seo-ot(\s|$)" -Quiet)) {
  Add-Content -Path $hosts -Value "`r`n192.168.0.31 seo-ot"
}
ipconfig /flushdns
ping seo-ot
```

Acceso esperado:

- http://seo-ot:3000

## 9) Instalar NSSM para ejecutar como servicio

## 9.1 Instalar NSSM

Con Chocolatey (si esta instalado):

```powershell
choco install nssm -y
```

Si no usas choco:

1. Descargar desde https://nssm.cc/download
2. Descomprimir
3. Copiar `nssm.exe` (x64) a `C:\Windows\System32\nssm.exe`

Verificar:

```powershell
nssm version
```

## 9.2 Crear servicio SEO-OT

```powershell
nssm install SEO-OT
```

En la ventana de NSSM:

- Path: `C:\Program Files\nodejs\npm.cmd`
- Startup directory: `C:\ot-seo`
- Arguments: `run start:lan`

## 9.3 Configurar inicio automatico

```powershell
nssm set SEO-OT Start SERVICE_AUTO_START
```

## 9.4 Configurar logs del servicio

```powershell
mkdir C:\ot-seo\logs
nssm set SEO-OT AppStdout C:\ot-seo\logs\service-out.log
nssm set SEO-OT AppStderr C:\ot-seo\logs\service-err.log
nssm set SEO-OT AppRotateFiles 1
nssm set SEO-OT AppRotateOnline 1
nssm set SEO-OT AppRotateBytes 10485760
```

## 9.5 Reinicio automatico si falla

> En PowerShell usar `sc.exe` (no `sc`) para evitar conflictos con alias.

```powershell
sc.exe failure SEO-OT reset= 86400 actions= restart/5000/restart/5000/restart/5000
sc.exe qfailure SEO-OT
```

## 9.6 Iniciar y validar servicio

```powershell
nssm start SEO-OT
sc.exe query SEO-OT
Get-Service SEO-OT
```

## 10) Actualizaciones por doble clic

Se creo el script:

- `update-ot.bat`

### 10.1 Prerequisitos para que funcione el doble clic

Validar esto antes de ejecutar el update en taller:

1. Proyecto instalado en `C:\ot-seo` (o en la carpeta donde vive `update-ot.bat`).
2. Git instalado y disponible en PATH (`git --version`).
3. Node.js LTS instalado con npm en `C:\Program Files\nodejs\npm.cmd`.
4. PowerShell disponible (el script lo usa para elevacion, timestamp y retencion de backups).
5. Conexion a internet para `git pull` y `npm ci`.
6. Archivo `.env` presente con `DATABASE_URL="file:./prisma/dev.db"`.
7. Permisos de escritura sobre `prisma\` y `tmp\db-backups\`.
8. Si se usa servicio Windows: NSSM instalado y servicio llamado exactamente `SEO-OT`.
9. Opcional recomendado en `.env`: `APP_HOSTNAME` y `APP_PORT` para personalizar hostname/puerto.

Checklist rapido sugerido:

```powershell
cd C:\ot-seo
git --version
node -v
npm -v
Test-Path "C:\Program Files\nodejs\npm.cmd"
Test-Path ".\update-ot.bat"
Test-Path ".\.env"
Test-Path ".\prisma\prisma\dev.db"
sc.exe query SEO-OT
```

Interpretacion rapida:

- Si `sc.exe query SEO-OT` responde servicio inexistente, el update sigue funcionando igual, pero al final no podra reiniciar ese servicio automaticamente.
- Si falta `.env` o `prisma\prisma\dev.db`, hay que corregirlo antes del update para no perder el flujo esperado.

### 10.2 Modos de ejecucion recomendados

- Doble clic (interactivo): menu con opciones `F` (Full), `R` (Recovery), `L` (Limitado).
- Desde terminal, modo limitado:

```powershell
.\update-ot.bat --limited
```

- Desde terminal, modo full forzado (rehace tareas pesadas aunque no haya cambios git):

```powershell
.\update-ot.bat --force
```

Funcion:

1. Se autoeleva a admin.
2. `git pull --ff-only`.
3. Compara commit anterior vs nuevo y detecta cambios por tipo.
4. Si no hay cambios, finaliza sin parar servicio.
5. Si hay solo cambios sin impacto runtime (ej. documentacion), no para servicio ni ejecuta tareas pesadas.
6. Si hay cambios de runtime:
  - para servicio `SEO-OT`,
  - ejecuta solo lo necesario (`npm ci`, `db:push`, `build`) segun archivos cambiados,
  - vuelve a iniciar el servicio.
7. Si hay cambios de esquema Prisma, crea backup automatico en `tmp/db-backups/dev-YYYYMMDD-HHMMSS.db` y aplica retencion de ultimos 8.
8. Si el servicio existe pero estaba parado, lo inicia al finalizar aunque no haya updates.
9. Verifica salud real de la web en `http://localhost:3000/`; si el servicio esta `RUNNING` pero la web no responde, intenta un reinicio automatico.
10. Si el servicio existe, rehace automaticamente la configuracion clave de NSSM (`Application`, `AppDirectory`, `AppParameters`, logs) para alinearla con `C:\ot-seo`.
11. Si falta el build de produccion (`.next\BUILD_ID`), ejecuta `npm run build` y vuelve a intentar levantar el servicio.
12. Si el build falla (p. ej. errores TypeScript), activa modo contingencia `dev:lan` para mantener el servicio disponible mientras se corrige el codigo.
13. Si detecta error de Prisma Client no inicializado, ejecuta `npm run db:generate`, reinicia y vuelve a validar la app.
14. Si detecta desfase de esquema DB (`P2021`, `P2022`, tabla/columna faltante), ejecuta `npm run db:push -- --accept-data-loss`, reinicia y vuelve a validar la app.
15. Informa en consola resumen de decisiones, la ruta del ultimo backup si aplica, el estado final del servicio, diagnostico rapido si falla y URLs de acceso local/LAN.
16. Lee `APP_HOSTNAME`/`APP_PORT` desde `.env`, detecta IP local actual, guarda `APP_HOST_IP` en `.env` y actualiza automaticamente la entrada local de `hosts` para ese hostname.

Notas importantes del backup automatico:

- El script usa como DB canonica `prisma/prisma/dev.db`.
- No migra automaticamente rutas legacy de DB: usa solo la ruta canonica definida.
- Si no encuentra la DB en esas rutas, informa aviso y continua el update.
- Si detecta cambios de esquema y no encuentra DB para backup, corta el update por seguridad.
- Al finalizar (ok o error), la consola muestra `Presiona cualquier tecla para finalizar...` para que puedas revisar el resultado.

Recomendacion critica antes de ejecutar el update:

- Verificar que se genero correctamente el backup automatico al iniciar el proceso.
- Para cambios mayores, conservar tambien una copia externa de `C:\ot-seo\prisma\dev.db`.

Uso:

1. Doble clic en `C:\ot-seo\update-ot.bat`
2. Aceptar UAC
3. Esperar finalizacion

## 11) Operacion diaria (comandos utiles)

### Estado

```powershell
sc.exe query SEO-OT
Get-Service SEO-OT
```

### Reiniciar servicio

```powershell
nssm restart SEO-OT
```

### Parar servicio

```powershell
nssm stop SEO-OT
```

### Ver logs

```powershell
Get-Content C:\ot-seo\logs\service-out.log -Tail 100
Get-Content C:\ot-seo\logs\service-err.log -Tail 100
```

## 12) Troubleshooting rapido

- `npm` no se reconoce: reinstalar Node LTS o usar `npm.cmd`.
- Error ExecutionPolicy: usar `Set-ExecutionPolicy -Scope Process Bypass`.
- `sc` falla en PowerShell: usar `sc.exe`.
- No abre desde otro PC: revisar firewall, IP y que el servicio este `RUNNING`.
- Nombre `seo-ot` no resuelve: revisar `hosts` en el cliente y ejecutar `ipconfig /flushdns`.
- Si `db:push` marca cambios destructivos: confirmar respaldo de `dev.db` y repetir actualizacion con `update-ot.bat`.
