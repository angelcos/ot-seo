@echo off
setlocal enableextensions enabledelayedexpansion

set "ARG_ELEVATED=0"
set "ARG_FULL=0"
set "ARG_LIMITED=0"
set "ARG_FORCE=0"
:parse_args
if "%~1"=="" goto :args_done
if /I "%~1"=="--elevated" set "ARG_ELEVATED=1"
if /I "%~1"=="--full" set "ARG_FULL=1"
if /I "%~1"=="--limited" set "ARG_LIMITED=1"
if /I "%~1"=="--force" set "ARG_FORCE=1"
shift
goto :parse_args
:args_done

set "SCRIPT_FILE=%~f0"
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "ELEVATION_WRAPPER=%TEMP%\ot-seo-elevated-%RANDOM%-%RANDOM%.cmd"

set "GIT_CMD=git"
set "GIT_ARGS=-c safe.directory=%SCRIPT_DIR%"
set "GIT_ERR_FILE=%TEMP%\ot-seo-git-error-%RANDOM%-%RANDOM%.txt"

REM Modo por defecto: limitado. Puede cambiarse con prompt inicial o argumentos.
set "LIMITED_MODE=1"
set "RELAUNCHED=0"
call :prepare_execution_mode
if "%RELAUNCHED%"=="1" (
  echo.
  echo Se abrio una nueva ventana con permisos de administrador.
  echo Sigue el progreso en esa ventana.
  echo.
  echo Presiona cualquier tecla para cerrar esta ventana...
  pause >nul
  exit /b 0
)

title SEO-OT - Actualizacion

set "SERVICE_NAME=SEO-OT"
set "PROJECT_DIR=%SCRIPT_DIR%"
set "ENV_FILE=%PROJECT_DIR%\.env"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
set "SERVICE_APP=%NPM_CMD%"
set "SERVICE_APP_DIR=%PROJECT_DIR%"
set "SERVICE_APP_ARGS=run start:lan"
set "SERVICE_APP_ARGS_FALLBACK=run dev:lan"
set "APP_PORT=3000"
set "APP_HOSTNAME=seo-ot"
set "APP_HOST_IP=127.0.0.1"
set "DATABASE_URL_FROM_ENV="
set "HAS_LAN_IP=0"
set "APP_HEALTH_URL="
set "HEALTH_RETRIES=3"
set "HEALTH_DELAY_SECONDS=2"
set "HEALTH_GRACE_RETRIES=4"
set "HEALTH_OK=0"
set "HEALTH_STATUS=NO_HTTP"
set "HEALTH_RESTARTED=0"
set "BUILD_RECOVERED=0"
set "DEV_FALLBACK_ACTIVE=0"
set "PRISMA_RECOVERED=0"
set "DB_SCHEMA_RECOVERED=0"
set "DB_URL_NORMALIZED=0"
set "SERVICE_OUT_LOG=%PROJECT_DIR%\logs\service-out.log"
set "SERVICE_ERR_LOG=%PROJECT_DIR%\logs\service-err.log"
set "NEXT_BUILD_ID=%PROJECT_DIR%\.next\BUILD_ID"
set "NEXT_PRERENDER_MANIFEST=%PROJECT_DIR%\.next\prerender-manifest.json"
set "PRISMA_CLIENT_READY=%PROJECT_DIR%\node_modules\.prisma\client\index.js"
set "DB_FILE_PRIMARY=%PROJECT_DIR%\prisma\prisma\dev.db"
set "DB_FILE_FALLBACK=%PROJECT_DIR%\prisma\dev.db"
set "DB_FILE="
set "DATABASE_URL_EFFECTIVE=file:./prisma/dev.db"
set "BACKUP_DIR=%PROJECT_DIR%\tmp\db-backups"
set "BACKUP_KEEP=8"
set "LAST_BACKUP="
set "DB_BACKUP_DONE=0"
set "NEED_INSTALL=0"
set "NEED_DB=0"
set "NEED_BUILD=0"
set "NEED_PRISMA_GENERATE=0"
set "FORCE_RUNTIME=0"
set "HAS_RUNTIME_WORK=0"
set "OLD_HEAD="
set "NEW_HEAD="
set "TMP_CHANGED=%TEMP%\ot-seo-changed-%RANDOM%-%RANDOM%.txt"
set "TMP_HEAD=%TEMP%\ot-seo-head-%RANDOM%-%RANDOM%.txt"
set "SERVICE_EXISTS=0"
set "SERVICE_RUNNING=0"
set "EFFECTIVE_MODE=LIMITADO"

call :load_runtime_config_from_env
call :detect_primary_ipv4
call :persist_detected_ip_to_env
call :sync_local_hosts_entry
set "APP_HEALTH_URL=http://localhost:%APP_PORT%/api/health"

if "%LIMITED_MODE%"=="0" set "EFFECTIVE_MODE=FULL"
if "%LIMITED_MODE%"=="0" if "%ARG_FORCE%"=="1" set "EFFECTIVE_MODE=FULL-FORCE"

echo ================================================
echo   SEO-OT - Script de actualizacion automatica
echo ================================================
if "%LIMITED_MODE%"=="1" (
  echo Modo: SIN ADMIN - limitado
) else (
  echo Modo: ADMIN
)
echo Carpeta del proyecto: %PROJECT_DIR%
echo Host configurado: %APP_HOSTNAME%
echo IP local detectada: %APP_HOST_IP%
if /I "%APP_HOST_IP%"=="127.0.0.1" (
  echo Aviso: No se detecto una IP LAN privada valida. Se usara loopback local.
  echo Aviso: Verifica conexion de red activa Ethernet o Wi-Fi si necesitas acceso desde otros equipos.
)
echo Puerto configurado: %APP_PORT%
if "%ARG_FORCE%"=="1" echo Modo forzado activo: SI ^(--force^)
echo Modo efectivo: %EFFECTIVE_MODE%
if "%LIMITED_MODE%"=="1" (
  echo Aviso: Se omitira la gestion del servicio NSSM y la edicion de hosts.
)
echo.

if not exist "%NPM_CMD%" (
  echo ERROR: No se encontro npm.cmd en "%NPM_CMD%"
  echo Reinstala Node.js LTS o ajusta la variable NPM_CMD en este script.
  goto :error
)

where git >nul 2>&1
if %errorlevel% neq 0 (
  if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
  ) else if exist "C:\Program Files\Git\bin\git.exe" (
    set "GIT_CMD=C:\Program Files\Git\bin\git.exe"
  ) else (
    echo ERROR: No se encontro Git en PATH ni en rutas comunes.
    echo Instala Git for Windows o agrega git.exe al PATH del sistema.
    goto :error
  )
)

cd /d "%PROJECT_DIR%"
if %errorlevel% neq 0 (
  echo ERROR: No se pudo entrar al directorio del proyecto.
  goto :error
)

call :ensure_canonical_database_file

set "DATABASE_URL=%DATABASE_URL_EFFECTIVE%"
call :normalize_database_url

if not exist "%PROJECT_DIR%\.git" (
  echo ERROR: No existe la carpeta .git en el proyecto.
  echo Ruta detectada: %PROJECT_DIR%
  goto :error
)

if "%LIMITED_MODE%"=="0" (
  sc.exe query "%SERVICE_NAME%" >nul 2>&1
  if %errorlevel% equ 0 (
    set "SERVICE_EXISTS=1"
    call :ensure_service_configuration
    sc.exe query "%SERVICE_NAME%" | findstr /I "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 set "SERVICE_RUNNING=1"
  )
) else (
  echo Aviso: Sin permisos admin, se omite deteccion/control del servicio %SERVICE_NAME%.
)

"%GIT_CMD%" %GIT_ARGS% -C "%PROJECT_DIR%" rev-parse --show-toplevel >nul 2>"%GIT_ERR_FILE%"
if %errorlevel% neq 0 (
  echo ERROR: Git no pudo validar el repositorio del proyecto.
  echo Ruta detectada: %PROJECT_DIR%
  if exist "%GIT_ERR_FILE%" type "%GIT_ERR_FILE%"
  echo Verifica que exista la carpeta .git y que Git tenga acceso a esta ruta.
  goto :error
)
if exist "%GIT_ERR_FILE%" del /q "%GIT_ERR_FILE%" >nul 2>&1

"%GIT_CMD%" %GIT_ARGS% -C "%PROJECT_DIR%" rev-parse --verify HEAD > "%TMP_HEAD%" 2>nul
if %errorlevel% equ 0 (
  set /p OLD_HEAD=<"%TMP_HEAD%"
) else (
  set "OLD_HEAD=EMPTY"
)
if exist "%TMP_HEAD%" del /q "%TMP_HEAD%" >nul 2>&1

echo [1/9] Descargando cambios del repositorio...
"%GIT_CMD%" %GIT_ARGS% -C "%PROJECT_DIR%" pull --ff-only
if %errorlevel% neq 0 (
  echo ERROR: Fallo git pull.
  goto :error
)

"%GIT_CMD%" %GIT_ARGS% -C "%PROJECT_DIR%" rev-parse --verify HEAD > "%TMP_HEAD%" 2>"%GIT_ERR_FILE%"
if %errorlevel% equ 0 (
  set /p NEW_HEAD=<"%TMP_HEAD%"
)
if exist "%TMP_HEAD%" del /q "%TMP_HEAD%" >nul 2>&1
if not defined NEW_HEAD (
  echo ERROR: No se pudo resolver el commit actual tras git pull.
  if exist "%GIT_ERR_FILE%" type "%GIT_ERR_FILE%"
  goto :error
)
if exist "%GIT_ERR_FILE%" del /q "%GIT_ERR_FILE%" >nul 2>&1

if /I "%OLD_HEAD%"=="%NEW_HEAD%" (
  if "%ARG_FORCE%"=="1" (
    echo No hay cambios nuevos en git, pero --force esta activo.
    set "FORCE_RUNTIME=1"
  ) else (
    echo No hay cambios nuevos. El sistema ya estaba actualizado.
    goto :no_changes
  )
)

if "%FORCE_RUNTIME%"=="0" (
  if /I "%OLD_HEAD%"=="EMPTY" (
    "%GIT_CMD%" %GIT_ARGS% -C "%PROJECT_DIR%" ls-files > "%TMP_CHANGED%"
  ) else (
    "%GIT_CMD%" %GIT_ARGS% -C "%PROJECT_DIR%" diff --name-only "%OLD_HEAD%" "%NEW_HEAD%" > "%TMP_CHANGED%"
  )

  findstr /I /R /C:"^package.json$" /C:"^package-lock.json$" "%TMP_CHANGED%" >nul
  if !errorlevel! equ 0 set "NEED_INSTALL=1"

  findstr /I /R /C:"^prisma/schema.prisma$" /C:"^prisma/migrations/" /C:"^prisma/prisma/" "%TMP_CHANGED%" >nul
  if !errorlevel! equ 0 set "NEED_DB=1"

  findstr /I /R /C:"^src/" /C:"^public/" /C:"^next.config.ts$" /C:"^tsconfig.json$" /C:"^postcss.config.mjs$" /C:"^eslint.config.mjs$" /C:"^package.json$" /C:"^package-lock.json$" "%TMP_CHANGED%" >nul
  if !errorlevel! equ 0 set "NEED_BUILD=1"
)

if "%ARG_FORCE%"=="1" (
  set "NEED_DB=1"
  set "NEED_BUILD=1"
  set "NEED_PRISMA_GENERATE=1"
  echo Modo forzado: se ejecutaran db:generate, db:push y build aunque no haya cambios detectados.
)

if exist "%TMP_CHANGED%" del /q "%TMP_CHANGED%" >nul 2>&1

if "%NEED_INSTALL%"=="1" set "NEED_BUILD=1"
if "%NEED_DB%"=="1" (
  set "NEED_BUILD=1"
  set "NEED_PRISMA_GENERATE=1"
)

set "HAS_RUNTIME_WORK=0"
if "%NEED_INSTALL%"=="1" set "HAS_RUNTIME_WORK=1"
if "%NEED_DB%"=="1" set "HAS_RUNTIME_WORK=1"
if "%NEED_BUILD%"=="1" set "HAS_RUNTIME_WORK=1"

if "%HAS_RUNTIME_WORK%"=="0" (
  echo Cambios detectados, pero sin impacto en runtime; por ejemplo, solo documentacion.
  echo No se reinicia servicio ni se ejecutan tareas pesadas.
  goto :no_runtime_changes
)

echo [2/9] Parando servicio %SERVICE_NAME%...
if "%LIMITED_MODE%"=="1" (
  echo Omitido: sin permisos admin para detener servicios.
) else if "%SERVICE_EXISTS%"=="1" (
  nssm stop "%SERVICE_NAME%" >nul 2>&1
  call :wait_for_service_stop
  set "SERVICE_RUNNING=0"
) else (
  echo Aviso: El servicio %SERVICE_NAME% no existe.
  echo Se continuara sin control automatico del servicio.
)

echo [3/9] Copia de seguridad de base de datos...
if "%NEED_DB%"=="1" (
  if defined DB_FILE (
    if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%" >nul 2>&1
    for /f %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Date).ToString('yyyyMMdd-HHmmss')"') do set "TS=%%I"
    set "BACKUP_FILE=%BACKUP_DIR%\dev-%TS%.db"
    copy /Y "%DB_FILE%" "%BACKUP_FILE%" >nul
    if %errorlevel% neq 0 (
      echo ERROR: No se pudo crear la copia de seguridad de la base de datos.
      goto :error
    )
    set "LAST_BACKUP=%BACKUP_FILE%"
    echo Backup creado: %BACKUP_FILE%

    for /f "delims=" %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$files = @(Get-ChildItem -Path '%BACKUP_DIR%' -Filter 'dev-*.db' -ErrorAction SilentlyContinue); if($files.Count -gt 0){ $files = @(Sort-Object -Property LastWriteTime -Descending -InputObject $files) }; if($files.Count -gt %BACKUP_KEEP%){ $toDelete = @(); for($idx=%BACKUP_KEEP%; $idx -lt $files.Count; $idx++){ $toDelete += $files[$idx] }; foreach($f in $toDelete){ Remove-Item -LiteralPath $f.FullName -Force -ErrorAction SilentlyContinue }; 'Backups antiguos eliminados: ' + $toDelete.Count } else { 'Backups dentro del limite: ' + $files.Count }"') do echo %%I
  ) else (
    echo ERROR: Hay cambios de esquema, pero no se encontro la DB para backup:
    echo   - %DB_FILE_PRIMARY%
    echo   - %DB_FILE_FALLBACK%
    goto :error
  )
) else (
  echo Sin cambios de esquema. Se omite backup de DB.
)

echo [4/9] Dependencias (npm ci)...
if "%NEED_INSTALL%"=="1" (
  call "%NPM_CMD%" ci
  if %errorlevel% neq 0 (
    echo ERROR: Fallo npm ci.
    goto :error
  )
) else (
  echo Sin cambios en package.json/package-lock.json. Se omite npm ci.
)

echo [5/9] Prisma Client (db:generate)...
if "%NEED_PRISMA_GENERATE%"=="1" (
  call :normalize_database_url
  call "%NPM_CMD%" run db:generate
  if %errorlevel% neq 0 (
    echo ERROR: Fallo npm run db:generate.
    goto :error
  )
) else (
  echo Sin cambios de esquema. Se omite db:generate.
)

echo [6/9] Base de datos (db:push)...
if "%NEED_DB%"=="1" (
  call :normalize_database_url
  call "%NPM_CMD%" run db:push -- --accept-data-loss
  if %errorlevel% neq 0 (
    echo ERROR: Fallo npm run db:push.
    goto :error
  )
) else (
  echo Sin cambios de esquema. Se omite db:push.
)

echo [7/9] Compilacion (build)...
if "%NEED_BUILD%"=="1" (
  call :normalize_database_url
  call "%NPM_CMD%" run build
  if %errorlevel% neq 0 (
    echo ERROR: Fallo npm run build.
    goto :error
  )
) else (
  echo Sin cambios de codigo/build. Se omite compilacion.
)

echo [8/9] Iniciando servicio %SERVICE_NAME%...
if "%LIMITED_MODE%"=="1" (
  echo Omitido: sin permisos admin para iniciar servicios.
  echo Inicia manualmente con: npm run start:lan
) else if "%SERVICE_EXISTS%"=="1" (
  nssm start "%SERVICE_NAME%"
  if errorlevel 1 (
    call :wait_for_service_running
    call :refresh_service_running_state
    if "!SERVICE_RUNNING!"=="1" (
      echo Aviso: nssm devolvio codigo de error, pero el servicio quedo RUNNING.
    ) else (
      call :verify_service_health
      if "!HEALTH_OK!"=="1" (
        set "SERVICE_RUNNING=1"
        echo Aviso: no se pudo confirmar estado RUNNING por servicio, pero la app responde OK.
      ) else (
        echo ERROR: No se pudo iniciar el servicio %SERVICE_NAME%.
        goto :error
      )
    )
  ) else (
    call :wait_for_service_running
  )
  set "SERVICE_RUNNING=1"
) else (
  echo Aviso: El servicio %SERVICE_NAME% no existe.
  echo Inicia manualmente con: npm run start:lan
)

echo [9/9] Resumen de actualizacion inteligente...
echo NEED_INSTALL=%NEED_INSTALL% NEED_PRISMA_GENERATE=%NEED_PRISMA_GENERATE% NEED_DB=%NEED_DB% NEED_BUILD=%NEED_BUILD%

goto :done

:no_changes
echo No se realizaron cambios.
goto :done

:no_runtime_changes
echo Actualizacion de repositorio aplicada sin tareas de runtime.
goto :done

:done

call :refresh_service_running_state

if "%LIMITED_MODE%"=="1" (
  echo.
  echo Verificando salud HTTP en modo limitado...
  call :verify_service_health
  if "!HEALTH_OK!"=="0" call :verify_service_health_grace
  if "!HEALTH_OK!"=="0" call :attempt_runtime_recovery
  if "!HEALTH_OK!"=="0" (
    echo ERROR: No se pudo validar/recuperar salud en %APP_HEALTH_URL% desde modo limitado.
    goto :error
  )
)

if "%SERVICE_EXISTS%"=="1" if "%SERVICE_RUNNING%"=="0" (
  echo.
  echo Verificando servicio %SERVICE_NAME%: estaba parado, se iniciara ahora...
  nssm start "%SERVICE_NAME%"
  if errorlevel 1 (
    call :wait_for_service_running
    call :refresh_service_running_state
    if "!SERVICE_RUNNING!"=="1" (
      echo Aviso: nssm devolvio codigo de error, pero el servicio quedo RUNNING.
    ) else (
      call :verify_service_health
      if "!HEALTH_OK!"=="1" (
        set "SERVICE_RUNNING=1"
        echo Aviso: no se pudo confirmar estado RUNNING por servicio, pero la app responde OK.
      ) else (
        echo ERROR: No se pudo iniciar el servicio %SERVICE_NAME% al finalizar.
        goto :error
      )
    )
  ) else (
    call :wait_for_service_running
    set "SERVICE_RUNNING=1"
  )
)

if "%SERVICE_EXISTS%"=="1" if "%SERVICE_RUNNING%"=="1" (
  call :verify_service_health
  if "!HEALTH_OK!"=="0" call :verify_service_health_grace
  if "!HEALTH_OK!"=="0" call :attempt_runtime_recovery
  if "!HEALTH_OK!"=="0" if "!HEALTH_RESTARTED!"=="0" (
    echo.
    echo La app no responde aunque el servicio figure RUNNING. Se intentara un reinicio automatico...
    nssm restart "%SERVICE_NAME%"
    if %errorlevel% neq 0 (
      echo ERROR: No se pudo reiniciar automaticamente el servicio %SERVICE_NAME%.
      goto :error
    )
    set "HEALTH_RESTARTED=1"
    call :verify_service_health
  )
  if "!HEALTH_OK!"=="0" (
    echo.
    echo ERROR: El servicio esta RUNNING pero la app no responde en %APP_HEALTH_URL%
    call :show_runtime_diagnostics
    goto :error
  )
)

echo.
echo Actualizacion completada correctamente.
if defined LAST_BACKUP echo Ultimo backup generado: %LAST_BACKUP%
if "%SERVICE_EXISTS%"=="1" (
  sc.exe query "%SERVICE_NAME%" | findstr /I "RUNNING" >nul 2>&1
  if %errorlevel% equ 0 (
    echo Estado final del servicio %SERVICE_NAME%: RUNNING
  ) else (
    echo Estado final del servicio %SERVICE_NAME%: NO RUNNING
  )
)
if "%DEV_FALLBACK_ACTIVE%"=="1" (
  echo Modo de servicio activo: DEV - run dev:lan
  echo Aviso: corrige errores TypeScript y vuelve a ejecutar update-ot.bat para regresar a modo produccion.
)
echo URLs de acceso:
echo   Local: http://localhost:%APP_PORT%/
echo   IP:    http://%APP_HOST_IP%:%APP_PORT%/
echo   LAN:   http://%APP_HOSTNAME%:%APP_PORT%/
if "%SERVICE_EXISTS%"=="1" if "%SERVICE_RUNNING%"=="1" if "%HEALTH_OK%"=="1" (
  echo Servicio verificado OK. La app responde correctamente.
)
echo.
echo Presiona cualquier tecla para finalizar...
pause >nul
exit /b 0

:load_runtime_config_from_env
if not exist "%ENV_FILE%" goto :eof
for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  set "cfgKey=%%A"
  set "cfgVal=%%~B"
  if /I "!cfgKey!"=="APP_HOSTNAME" (
    if defined cfgVal if not "!cfgVal!"=="" set "APP_HOSTNAME=!cfgVal!"
  )
  if /I "!cfgKey!"=="APP_PORT" (
    if defined cfgVal if not "!cfgVal!"=="" set "APP_PORT=!cfgVal!"
  )
  if /I "!cfgKey!"=="DATABASE_URL" (
    if defined cfgVal if not "!cfgVal!"=="" set "DATABASE_URL_FROM_ENV=!cfgVal!"
  )
)
goto :eof

:ensure_canonical_database_file
set "DB_FILE=%DB_FILE_PRIMARY%"
set "DATABASE_URL_EFFECTIVE=file:./prisma/dev.db"

if not exist "%PROJECT_DIR%\prisma\prisma" mkdir "%PROJECT_DIR%\prisma\prisma" >nul 2>&1
if not exist "%DB_FILE_PRIMARY%" (
  echo Aviso: No existe la DB canonica esperada en prisma/prisma/dev.db.
  echo Aviso: Coloca tu backup en esa ruta antes de ejecutar recuperaciones.
)
goto :eof

:detect_primary_ipv4
set "APP_HOST_IP="
set "HAS_LAN_IP=0"
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /R /C:"IPv4[^:]*:"') do (
  if not defined APP_HOST_IP (
    set "ipCandidate=%%I"
    set "ipCandidate=!ipCandidate: =!"
    call :maybe_set_private_ip "!ipCandidate!"
  )
)
set "APP_HOST_IP=%APP_HOST_IP: =%"
if defined APP_HOST_IP if not "%APP_HOST_IP%"=="" set "HAS_LAN_IP=1"
if not defined APP_HOST_IP set "APP_HOST_IP=127.0.0.1"
if "%APP_HOST_IP%"=="" set "APP_HOST_IP=127.0.0.1"
goto :eof

:maybe_set_private_ip
set "candidate=%~1"
if "%candidate%"=="" goto :eof

echo %candidate%| findstr /R /C:"^10\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if %errorlevel% equ 0 (
  set "APP_HOST_IP=%candidate%"
  set "HAS_LAN_IP=1"
  goto :eof
)

echo %candidate%| findstr /R /C:"^192\.168\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if %errorlevel% equ 0 (
  set "APP_HOST_IP=%candidate%"
  set "HAS_LAN_IP=1"
  goto :eof
)

for /f "tokens=1-4 delims=." %%A in ("%candidate%") do (
  if "%%A"=="172" (
    if %%B geq 16 if %%B leq 31 (
      set "APP_HOST_IP=%candidate%"
      set "HAS_LAN_IP=1"
      goto :eof
    )
  )
)
goto :eof

:prepare_execution_mode
if "%ARG_FORCE%"=="1" set "ARG_FULL=1"

if "%ARG_LIMITED%"=="1" (
  if "%ARG_FORCE%"=="1" (
    echo Aviso: --force requiere modo administrador. Se desactiva por usar --limited.
    set "ARG_FORCE=0"
  )
  set "LIMITED_MODE=1"
  goto :eof
)

if "%ARG_FULL%"=="1" (
  call :try_activate_full_mode
  goto :eof
)

if "%ARG_ELEVATED%"=="0" (
  echo.
  echo Selecciona el modo de ejecucion:
  echo   [F] FULL ^(admin^): actualizacion inteligente segun cambios detectados.
  echo   [R] FORCE ^(admin^): igual que FULL, pero fuerza db:generate + db:push + build.
  echo   [L] LIMITADO ^(sin admin^): no controla NSSM ni hosts; util para diagnostico rapido.
  choice /C FRL /N /M "Elige [F=Full / R=Force / L=Limitado]: "
  if errorlevel 3 (
    set "LIMITED_MODE=1"
    goto :eof
  )
  if errorlevel 2 (
    set "ARG_FORCE=1"
    set "ARG_FULL=1"
    call :try_activate_full_mode
    goto :eof
  )
  set "ARG_FULL=1"
  call :try_activate_full_mode
)
goto :eof

:try_activate_full_mode
net session >nul 2>&1
if %errorlevel% equ 0 (
  set "LIMITED_MODE=0"
  goto :eof
)

if "%ARG_ELEVATED%"=="1" (
  echo.
  echo Aviso: no se pudo confirmar permisos de administrador en esta ventana.
  echo Se continuara en modo SIN permisos.
  set "LIMITED_MODE=1"
  goto :eof
)

echo.
echo Solicitando permisos de administrador para modo FULL...
> "%ELEVATION_WRAPPER%" echo @echo off
>> "%ELEVATION_WRAPPER%" echo cd /d "%SCRIPT_DIR%"
>> "%ELEVATION_WRAPPER%" echo set "WRAPPER_ELEVATED=1"
if "%ARG_FORCE%"=="1" (
>> "%ELEVATION_WRAPPER%" echo call "%SCRIPT_FILE%" --elevated --full --force
) else (
>> "%ELEVATION_WRAPPER%" echo call "%SCRIPT_FILE%" --elevated --full
)
>> "%ELEVATION_WRAPPER%" echo set "WRAPPER_EXIT=%%errorlevel%%"
>> "%ELEVATION_WRAPPER%" echo echo.
>> "%ELEVATION_WRAPPER%" echo echo Ejecucion elevada finalizada con codigo %%WRAPPER_EXIT%%.
>> "%ELEVATION_WRAPPER%" echo echo Pulsa una tecla para cerrar esta ventana...
>> "%ELEVATION_WRAPPER%" echo pause ^>nul
>> "%ELEVATION_WRAPPER%" echo exit /b %%WRAPPER_EXIT%%
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/k','""%ELEVATION_WRAPPER%""' -WorkingDirectory '%SCRIPT_DIR%' -Verb RunAs"
if %errorlevel% neq 0 (
  echo Aviso: elevacion cancelada o no disponible. Se continuara en modo SIN permisos.
  set "LIMITED_MODE=1"
  goto :eof
)
set "RELAUNCHED=1"
goto :eof

:persist_detected_ip_to_env
if "%HAS_LAN_IP%"=="0" goto :eof
if "%APP_HOST_IP%"=="" goto :eof
if "%APP_HOST_IP%"=="127.0.0.1" goto :eof
if not exist "%ENV_FILE%" goto :eof
powershell -NoProfile -ExecutionPolicy Bypass -Command "$envPath = '%ENV_FILE%'; $ip = '%APP_HOST_IP%'; $lines = Get-Content -Path $envPath -ErrorAction SilentlyContinue; if(-not $lines){ $lines = @() }; $hasKey = $false; $updated = foreach($line in $lines){ if($line -match '^[\s#]*APP_HOST_IP\s*='){ $hasKey = $true; 'APP_HOST_IP="' + $ip + '"' } else { $line } }; if(-not $hasKey){ $updated += 'APP_HOST_IP="' + $ip + '"' }; $updated | Set-Content -Path $envPath -Encoding UTF8"
goto :eof

:sync_local_hosts_entry
if "%LIMITED_MODE%"=="1" goto :eof
if "%APP_HOSTNAME%"=="" goto :eof
if /I "%APP_HOSTNAME%"=="localhost" goto :eof
set "HOSTS_STATUS=OK"
for /f "delims=" %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$hosts = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'; $hn = '%APP_HOSTNAME%'; $ip = '%APP_HOST_IP%'; if(-not $hn){ 'OK'; exit 0 }; try { $lines = @(); if(Test-Path $hosts){ $lines = Get-Content -Path $hosts -ErrorAction Stop }; $escaped = [regex]::Escape($hn); $filtered = @($lines | Where-Object { $_ -notmatch ('^\s*\d{1,3}(\.\d{1,3}){3}\s+' + $escaped + '(\s|$)') }); $out = @($filtered + ($ip + ' ' + $hn)); $out | Set-Content -Path $hosts -Encoding UTF8 -ErrorAction Stop; 'OK' } catch { 'WARN_HOSTS_WRITE' }"') do set "HOSTS_STATUS=%%I"
if /I "%HOSTS_STATUS%"=="WARN_HOSTS_WRITE" echo Aviso: No se pudo actualizar hosts automaticamente.
ipconfig /flushdns >nul 2>&1
goto :eof

:verify_service_health
set "HEALTH_OK=0"
for /l %%N in (1,1,%HEALTH_RETRIES%) do (
  call :verify_service_health_once %%N %HEALTH_RETRIES%
  if "!HEALTH_OK!"=="1" goto :eof
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds %HEALTH_DELAY_SECONDS%" >nul 2>&1
)
goto :eof

:verify_service_health_grace
if "%HEALTH_OK%"=="1" goto :eof
echo Servicio detectado sin respuesta inmediata. Esperando ventana de gracia antes de recuperar...
for /l %%N in (1,1,%HEALTH_GRACE_RETRIES%) do (
  call :verify_service_health_once %%N %HEALTH_GRACE_RETRIES%
  if "!HEALTH_OK!"=="1" goto :eof
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds %HEALTH_DELAY_SECONDS%" >nul 2>&1
)
goto :eof

:verify_service_health_once
set "HEALTH_OK=0"
set "HEALTH_STATUS=NO_HTTP"
set "HEALTH_RESULT=BAD"
set "HEALTH_ATTEMPT=%~1"
set "HEALTH_TOTAL=%~2"
for /f "tokens=1,2 delims=|" %%A in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='%APP_HEALTH_URL%'; try { $r = Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 5 -MaximumRedirection 0; $code = [int]$r.StatusCode; if($code -ge 200 -and $code -lt 300){ Write-Output ('OK|' + $code) } else { Write-Output ('BAD|' + $code) } } catch { if($_.Exception.Response){ Write-Output ('BAD|' + [int]$_.Exception.Response.StatusCode) } else { Write-Output 'BAD|NO_HTTP' } }"') do (
  set "HEALTH_RESULT=%%A"
  set "HEALTH_STATUS=%%B"
)
if /I "!HEALTH_RESULT!"=="OK" (
  set "HEALTH_OK=1"
  echo Salud HTTP verificada en intento !HEALTH_ATTEMPT!: %APP_HEALTH_URL% ^(HTTP !HEALTH_STATUS!^)
  goto :eof
)
netstat -ano | findstr /R /C:":%APP_PORT% .*LISTENING" >nul 2>&1
if !errorlevel! equ 0 (
  echo Puerto %APP_PORT% en escucha, esperando respuesta HTTP... intento !HEALTH_ATTEMPT!/!HEALTH_TOTAL! ^(HTTP !HEALTH_STATUS!^)
) else (
  echo Puerto %APP_PORT% aun no esta en escucha... intento !HEALTH_ATTEMPT!/!HEALTH_TOTAL! ^(HTTP !HEALTH_STATUS!^)
)
goto :eof

:attempt_runtime_recovery
if "!HEALTH_OK!"=="1" goto :eof
if "!DB_SCHEMA_RECOVERED!"=="0" call :maybe_recover_database_schema
if "!HEALTH_OK!"=="0" if "!PRISMA_RECOVERED!"=="0" call :maybe_recover_prisma_client
if "!HEALTH_OK!"=="0" if "!BUILD_RECOVERED!"=="0" call :maybe_recover_missing_build
goto :eof

:refresh_service_running_state
if "%SERVICE_EXISTS%"=="0" goto :eof
set "SERVICE_RUNNING=0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $s = (Get-Service -Name '%SERVICE_NAME%' -ErrorAction Stop).Status; if($s -eq 'Running'){ exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 set "SERVICE_RUNNING=1"
goto :eof

:wait_for_service_running
if "%SERVICE_EXISTS%"=="0" goto :eof
for /l %%N in (1,1,20) do (
  call :refresh_service_running_state
  if "!SERVICE_RUNNING!"=="1" goto :eof
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1" >nul 2>&1
)
goto :eof

:maybe_recover_missing_build
call :has_valid_next_build
if "%VALID_BUILD%"=="1" goto :eof
echo.
echo Build de produccion incompleto o ausente. Se ejecutara npm run build para recuperar el servicio...
call :normalize_database_url
call "%NPM_CMD%" run build
if %errorlevel% neq 0 (
  echo ERROR: Fallo npm run build durante la recuperacion automatica.
  call :switch_service_to_dev_fallback
  goto :eof
)
set "BUILD_RECOVERED=1"
if "%LIMITED_MODE%"=="0" (
  echo Build generado correctamente. Reiniciando servicio %SERVICE_NAME%...
  nssm restart "%SERVICE_NAME%"
  if %errorlevel% neq 0 (
    echo ERROR: No se pudo reiniciar el servicio %SERVICE_NAME% tras generar el build.
    goto :eof
  )
  set "HEALTH_RESTARTED=1"
) else (
  echo Build generado correctamente en modo limitado. Verificando salud sin reinicio de servicio NSSM...
)
call :verify_service_health
goto :eof

:maybe_recover_prisma_client
if "%PRISMA_RECOVERED%"=="1" goto :eof
set "NEED_PRISMA_RECOVERY=0"
if not exist "%PRISMA_CLIENT_READY%" set "NEED_PRISMA_RECOVERY=1"
if exist "%SERVICE_ERR_LOG%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$tail = Get-Content -Path '%SERVICE_ERR_LOG%' -Tail 120 -ErrorAction SilentlyContinue; if(($tail -join [Environment]::NewLine) -match '@prisma/client did not initialize yet'){ exit 0 } else { exit 1 }" >nul 2>&1
  if %errorlevel% equ 0 set "NEED_PRISMA_RECOVERY=1"
)
if "%NEED_PRISMA_RECOVERY%"=="0" goto :eof
echo.
echo Detectado problema de Prisma Client. Ejecutando npm run db:generate...
if "%LIMITED_MODE%"=="0" if "%SERVICE_EXISTS%"=="1" (
  nssm stop "%SERVICE_NAME%" >nul 2>&1
  call :wait_for_service_stop
)
set "PRISMA_GENERATE_OK=0"
for /l %%N in (1,1,3) do (
  call "%NPM_CMD%" run db:generate
  if !errorlevel! equ 0 (
    set "PRISMA_GENERATE_OK=1"
    goto :prisma_generate_done
  )
  echo Aviso: db:generate fallo en intento %%N/3. Reintentando...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2" >nul 2>&1
)
:prisma_generate_done
if "%PRISMA_GENERATE_OK%"=="0" (
  echo ERROR: Fallo npm run db:generate durante la recuperacion automatica.
  goto :eof
)
set "PRISMA_RECOVERED=1"
if "%LIMITED_MODE%"=="0" (
  echo Prisma Client generado. Reiniciando servicio %SERVICE_NAME%...
  nssm restart "%SERVICE_NAME%"
  if %errorlevel% neq 0 (
    echo ERROR: No se pudo reiniciar el servicio %SERVICE_NAME% tras generar Prisma Client.
    goto :eof
  )
  set "HEALTH_RESTARTED=1"
) else (
  echo Prisma Client generado en modo limitado. Verificando salud sin reinicio de servicio NSSM...
)
call :verify_service_health
goto :eof

:switch_service_to_dev_fallback
if "%DEV_FALLBACK_ACTIVE%"=="1" goto :eof
echo.
echo Activando modo contingencia: servicio en dev (run dev:lan)...
nssm set "%SERVICE_NAME%" AppParameters "%SERVICE_APP_ARGS_FALLBACK%" >nul 2>&1
nssm restart "%SERVICE_NAME%"
if %errorlevel% neq 0 (
  echo ERROR: No se pudo activar el modo contingencia dev:lan.
  goto :eof
)
set "DEV_FALLBACK_ACTIVE=1"
set "HEALTH_RESTARTED=1"
call :verify_service_health
goto :eof

:maybe_recover_database_schema
if "%DB_SCHEMA_RECOVERED%"=="1" goto :eof
set "NEED_DB_SCHEMA_RECOVERY=0"
if exist "%SERVICE_ERR_LOG%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$tail = Get-Content -Path '%SERVICE_ERR_LOG%' -Tail 160 -ErrorAction SilentlyContinue; $txt = ($tail -join [Environment]::NewLine); if($txt -match 'code: ''P2021''|code: ''P2022''|The table `main.WorkTimeEntry` does not exist|The column `main.Mechanic.dailyCapacityHours` does not exist'){ exit 0 } else { exit 1 }" >nul 2>&1
  if %errorlevel% equ 0 set "NEED_DB_SCHEMA_RECOVERY=1"
)
if "%NEED_DB_SCHEMA_RECOVERY%"=="0" if exist "%SERVICE_OUT_LOG%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$tail = Get-Content -Path '%SERVICE_OUT_LOG%' -Tail 160 -ErrorAction SilentlyContinue; $txt = ($tail -join [Environment]::NewLine); if($txt -match 'code: ''P2021''|code: ''P2022''|The table `main.WorkTimeEntry` does not exist|The column `main.Mechanic.dailyCapacityHours` does not exist'){ exit 0 } else { exit 1 }" >nul 2>&1
  if %errorlevel% equ 0 set "NEED_DB_SCHEMA_RECOVERY=1"
)
if "%NEED_DB_SCHEMA_RECOVERY%"=="0" goto :eof

echo.
echo Detectado desfase de esquema DB (P2021/P2022 o tabla/columna faltante). Ejecutando db:push...
call :backup_database_once
call :normalize_database_url
call "%NPM_CMD%" run db:push -- --accept-data-loss
if %errorlevel% neq 0 (
  echo ERROR: Fallo npm run db:push durante la recuperacion automatica de esquema.
  goto :eof
)
set "DB_SCHEMA_RECOVERED=1"
if "%LIMITED_MODE%"=="0" (
  echo Esquema DB actualizado. Reiniciando servicio %SERVICE_NAME%...
  nssm restart "%SERVICE_NAME%"
  if %errorlevel% neq 0 (
    echo ERROR: No se pudo reiniciar el servicio %SERVICE_NAME% tras db:push.
    goto :eof
  )
  set "HEALTH_RESTARTED=1"
) else (
  echo Esquema DB actualizado en modo limitado. Verificando salud sin reinicio de servicio NSSM...
)
call :verify_service_health
goto :eof

:show_runtime_diagnostics
echo Diagnostico rapido:
echo   URL esperada: %APP_HEALTH_URL%
echo   Puerto esperado: %APP_PORT%
call :has_valid_next_build
if "%VALID_BUILD%"=="1" (
  echo   Build detectado: COMPLETO
) else (
  echo   Build detectado: INCOMPLETO O AUSENTE
  if not exist "%NEXT_BUILD_ID%" echo     Falta: %NEXT_BUILD_ID%
  if not exist "%NEXT_PRERENDER_MANIFEST%" echo     Falta: %NEXT_PRERENDER_MANIFEST%
)
if exist "%PRISMA_CLIENT_READY%" (
  echo   Prisma Client generado: SI
) else (
  echo   Prisma Client generado: NO
)
sc.exe query "%SERVICE_NAME%"
echo.
echo Configuracion NSSM:
nssm get "%SERVICE_NAME%" Application 2>nul
nssm get "%SERVICE_NAME%" AppDirectory 2>nul
nssm get "%SERVICE_NAME%" AppParameters 2>nul
nssm get "%SERVICE_NAME%" AppStdout 2>nul
nssm get "%SERVICE_NAME%" AppStderr 2>nul
echo.
echo Estado del puerto:
netstat -ano | findstr /R /C:":%APP_PORT% "
if exist "%SERVICE_ERR_LOG%" (
  echo.
  echo Ultimas lineas de %SERVICE_ERR_LOG%:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%SERVICE_ERR_LOG%' -Tail 30" 2>nul
)
if exist "%SERVICE_OUT_LOG%" (
  echo.
  echo Ultimas lineas de %SERVICE_OUT_LOG%:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%SERVICE_OUT_LOG%' -Tail 30" 2>nul
)
goto :eof

:ensure_service_configuration
echo Verificando configuracion del servicio %SERVICE_NAME%...
nssm set "%SERVICE_NAME%" Application "%SERVICE_APP%" >nul 2>&1
nssm set "%SERVICE_NAME%" AppDirectory "%SERVICE_APP_DIR%" >nul 2>&1
nssm set "%SERVICE_NAME%" AppParameters "%SERVICE_APP_ARGS%" >nul 2>&1
nssm set "%SERVICE_NAME%" AppEnvironmentExtra "DATABASE_URL=%DATABASE_URL_EFFECTIVE%" >nul 2>&1
if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs" >nul 2>&1
nssm set "%SERVICE_NAME%" AppStdout "%SERVICE_OUT_LOG%" >nul 2>&1
nssm set "%SERVICE_NAME%" AppStderr "%SERVICE_ERR_LOG%" >nul 2>&1
nssm set "%SERVICE_NAME%" AppRotateFiles 1 >nul 2>&1
nssm set "%SERVICE_NAME%" AppRotateOnline 1 >nul 2>&1
nssm set "%SERVICE_NAME%" AppRotateBytes 10485760 >nul 2>&1
goto :eof

:has_valid_next_build
set "VALID_BUILD=1"
if not exist "%NEXT_BUILD_ID%" set "VALID_BUILD=0"
if not exist "%NEXT_PRERENDER_MANIFEST%" set "VALID_BUILD=0"
goto :eof

:normalize_database_url
if not exist "%ENV_FILE%" (
  > "%ENV_FILE%" echo DATABASE_URL="%DATABASE_URL_EFFECTIVE%"
  >> "%ENV_FILE%" echo APP_HOSTNAME="%APP_HOSTNAME%"
  >> "%ENV_FILE%" echo APP_PORT="%APP_PORT%"
  echo Aviso: Se creo .env base con DATABASE_URL para SQLite.
  goto :eof
)

set "TMP_DBURL_PS=%TEMP%\ot-seo-dburl-dedupe-%RANDOM%-%RANDOM%.ps1"
> "%TMP_DBURL_PS%" echo $p = '%ENV_FILE%'
>> "%TMP_DBURL_PS%" echo $db = '%DATABASE_URL_EFFECTIVE%'
>> "%TMP_DBURL_PS%" echo $lines = @()
>> "%TMP_DBURL_PS%" echo if(Test-Path $p^) { $lines = Get-Content -Path $p -ErrorAction SilentlyContinue }
>> "%TMP_DBURL_PS%" echo if($null -eq $lines^) { $lines = @() }
>> "%TMP_DBURL_PS%" echo $filtered = @()
>> "%TMP_DBURL_PS%" echo foreach($line in $lines^) {
>> "%TMP_DBURL_PS%" echo ^  if($line -notmatch '^[\s#]*DATABASE_URL\s*='^) { $filtered += $line }
>> "%TMP_DBURL_PS%" echo }
>> "%TMP_DBURL_PS%" echo $out = @('DATABASE_URL="' + $db + '"') + $filtered
>> "%TMP_DBURL_PS%" echo Set-Content -Path $p -Value $out -Encoding UTF8 -ErrorAction Stop
powershell -NoProfile -ExecutionPolicy Bypass -File "%TMP_DBURL_PS%" >nul 2>&1
if exist "%TMP_DBURL_PS%" del /q "%TMP_DBURL_PS%" >nul 2>&1
if %errorlevel% neq 0 (
  echo Aviso: No se pudo normalizar DATABASE_URL automaticamente.
  goto :eof
)
goto :eof

:wait_for_service_stop
if "%SERVICE_EXISTS%"=="0" goto :eof
for /l %%N in (1,1,12) do (
  sc.exe query "%SERVICE_NAME%" | findstr /I "STOPPED" >nul 2>&1
  if !errorlevel! equ 0 goto :eof
  nssm stop "%SERVICE_NAME%" >nul 2>&1
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1" >nul 2>&1
)
goto :eof

:backup_database_once
if "%DB_BACKUP_DONE%"=="1" goto :eof
if not defined DB_FILE goto :eof
if not exist "%DB_FILE%" goto :eof
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%" >nul 2>&1
for /f %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Date).ToString('yyyyMMdd-HHmmss')"') do set "TS=%%I"
set "BACKUP_FILE=%BACKUP_DIR%\recovery-%TS%.db"
copy /Y "%DB_FILE%" "%BACKUP_FILE%" >nul
if %errorlevel% neq 0 goto :eof
set "LAST_BACKUP=%BACKUP_FILE%"
set "DB_BACKUP_DONE=1"
echo Backup de recuperacion creado: %BACKUP_FILE%
goto :eof

:error
echo.
echo La actualizacion termino con errores. Revisa los mensajes anteriores.
echo.
echo Presiona cualquier tecla para finalizar...
pause >nul
exit /b 1
