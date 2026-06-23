@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "PORT="
for %%P in (8080 8081 8082 8083 8084 8085) do (
  if not defined PORT (
    call :portBusy %%P
    if errorlevel 1 set "PORT=%%P"
  )
)

if not defined PORT (
  echo [topikai] Loi: khong con port trong 8080-8085.
  echo Chay truoc: .\stop-servers.cmd
  exit /b 1
)

call "%~dp0scripts\resolve-frontend-env.cmd"
echo VITE_API_PORT=!PORT!> "%FRONTEND_ENV%"

if exist "%~dp0.env.backend" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0.env.backend") do (
    if not "%%A"=="" set "%%A=%%B"
  )
  echo [topikai] Loaded .env.backend
)

echo.
echo ============================================
echo   TOPIK Backend: http://localhost:!PORT!
echo   (PowerShell: .\run-backend.cmd)
echo ============================================
echo.

set "PORT=!PORT!"
call mvnw.cmd spring-boot:run
exit /b %errorlevel%

:portBusy
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>&1
exit /b %errorlevel%
