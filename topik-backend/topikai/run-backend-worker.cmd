@echo off
setlocal
cd /d "%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"

if exist "%~dp0.env.backend" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0.env.backend") do (
    if not "%%A"=="" set "%%A=%%B"
  )
)

if not exist "%~dp0logs" mkdir "%~dp0logs"

set "PORT=%PORT%"
call mvnw.cmd spring-boot:run >> "%~dp0logs\backend.log" 2>&1
