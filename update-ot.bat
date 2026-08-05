@echo off
setlocal enableextensions

REM Auto-elevate to Administrator when needed (required for service stop/start)
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Solicitando permisos de administrador...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

title SEO-OT - Actualizacion

set "SERVICE_NAME=SEO-OT"
set "PROJECT_DIR=%~dp0"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

echo ================================================
echo   SEO-OT - Script de actualizacion automatica
echo ================================================
echo Carpeta del proyecto: %PROJECT_DIR%
echo.

if not exist "%NPM_CMD%" (
  echo ERROR: No se encontro npm.cmd en "%NPM_CMD%"
  echo Reinstala Node.js LTS o ajusta la variable NPM_CMD en este script.
  goto :error
)

cd /d "%PROJECT_DIR%"
if %errorlevel% neq 0 (
  echo ERROR: No se pudo entrar al directorio del proyecto.
  goto :error
)

echo [1/6] Parando servicio %SERVICE_NAME%...
sc.exe query "%SERVICE_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
  nssm stop "%SERVICE_NAME%" >nul 2>&1
) else (
  echo Aviso: El servicio %SERVICE_NAME% no existe. Continuando...
)

echo [2/6] Descargando cambios del repositorio...
git pull --ff-only
if %errorlevel% neq 0 (
  echo ERROR: Fallo git pull.
  goto :error
)

echo [3/6] Instalando dependencias...
"%NPM_CMD%" ci
if %errorlevel% neq 0 (
  echo ERROR: Fallo npm ci.
  goto :error
)

echo [4/6] Aplicando cambios de base de datos...
"%NPM_CMD%" run db:push
if %errorlevel% neq 0 (
  echo ERROR: Fallo npm run db:push.
  goto :error
)

echo [5/6] Compilando aplicacion...
"%NPM_CMD%" run build
if %errorlevel% neq 0 (
  echo ERROR: Fallo npm run build.
  goto :error
)

echo [6/6] Iniciando servicio %SERVICE_NAME%...
sc.exe query "%SERVICE_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
  nssm start "%SERVICE_NAME%"
  if %errorlevel% neq 0 (
    echo ERROR: No se pudo iniciar el servicio %SERVICE_NAME%.
    goto :error
  )
) else (
  echo Aviso: El servicio %SERVICE_NAME% no existe.
  echo Inicia manualmente con: npm run start:lan
)

echo.
echo Actualizacion completada correctamente.
echo.
pause
exit /b 0

:error
echo.
echo La actualizacion termino con errores. Revisa los mensajes anteriores.
echo.
pause
exit /b 1
