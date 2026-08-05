# Instalacion local en Windows + NSSM (SEO-OT)

Guia completa para instalar la aplicacion en un PC del taller (Windows), dejarla accesible por LAN y ejecutarla como servicio para que no dependa de una ventana de consola.

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

Funcion:

1. Se autoeleva a admin.
2. Para servicio `SEO-OT`.
3. `git pull --ff-only`
4. `npm ci`
5. `npm run db:push`
6. `npm run build`
7. Arranca `SEO-OT`.

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
