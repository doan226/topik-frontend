@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

call "%~dp0scripts\resolve-frontend-env.cmd"

:: Already running?
for %%P in (8080 8081 8082 8083 8084 8085) do (
  call :healthOk %%P
  if !errorlevel! equ 0 (
    echo [topikai] Backend da chay: http://localhost:%%P
    echo VITE_API_PORT=%%P> "%FRONTEND_ENV%"
    exit /b 0
  )
)

set "PORT="
for %%P in (8080 8081 8082 8083 8084 8085) do (
  if not defined PORT (
    call :portBusy %%P
    if errorlevel 1 set "PORT=%%P"
  )
)

if not defined PORT (
  echo [topikai] Loi: khong con port trong 8080-8085. Chay: stop-servers.cmd
  exit /b 1
)

if not exist "%~dp0logs" mkdir "%~dp0logs"

echo VITE_API_PORT=!PORT!> "%FRONTEND_ENV%"
echo [topikai] Khoi dong backend port !PORT! ...
echo [topikai] Log: %~dp0logs\backend.log

:: Launch minimized window (reliable hon Start-Process .cmd hidden)
start "TOPIK-Backend-!PORT!" /MIN cmd /c "%~dp0run-backend-worker.cmd" !PORT!

echo [topikai] Doi backend san sang (toi da 90 giay)...
call "%~dp0scripts\wait-backend-health.cmd" !PORT!
if errorlevel 1 (
  echo [LOI] Backend khong len — xem logs\backend.log
  if exist "%~dp0logs\backend.log" type "%~dp0logs\backend.log" | more +0
  exit /b 1
)

echo [topikai] Backend san sang: http://localhost:!PORT!/api/v1/health
exit /b 0

:healthOk
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%~1/api/v1/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b %errorlevel%

:portBusy
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>&1
exit /b %errorlevel%
