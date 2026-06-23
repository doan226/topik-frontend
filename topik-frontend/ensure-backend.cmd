@echo off

setlocal EnableDelayedExpansion

set "BACKEND=%~dp0..\topik-backend\topikai"



for %%P in (8080 8081 8082 8083 8084 8085) do (

  call :healthOk %%P

  if !errorlevel! equ 0 exit /b 0

)



echo [topikai] Backend chua chay — dang khoi dong...

call "%BACKEND%\start-backend-background.cmd"

if errorlevel 1 (

  echo [LOI] Khong khoi dong duoc backend. Kiem tra MySQL va logs\backend.log

  exit /b 1

)

exit /b 0



:healthOk

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%~1/api/v1/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

exit /b %errorlevel%

