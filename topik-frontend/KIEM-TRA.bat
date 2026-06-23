@echo off
setlocal EnableDelayedExpansion
title TOPIK - Kiem tra trang thai
echo.
echo === KIEM TRA TOPIK APP ===
echo.

set "OK=1"

where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js chua cai hoac chua co trong PATH
  set "OK=0"
) else (
  for /f "delims=" %%v in ('node -v') do echo [OK] Node.js %%v
)

netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [X] Frontend CHUA chay — port 5173 trong
  echo     Chay: .\start-frontend.bat
  set "OK=0"
) else (
  echo [OK] Frontend dang chay — http://localhost:5173
)

netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul 2>&1
if errorlevel 1 (
  echo [X] Backend CHUA chay tren port 8080
  echo     Chay: cd topikai ^&^& .\run-backend.cmd
  set "OK=0"
) else (
  echo [OK] Backend dang chay — http://localhost:8080
)

if exist "C:\topik-frontend\.env.development.local" (
  echo.
  echo File .env.development.local:
  type "C:\topik-frontend\.env.development.local"
)

echo.
if "!OK!"=="1" (
  echo === TAT CA OK — mo http://localhost:5173 ===
  start http://localhost:5173
) else (
  echo === CO LOI — chay: cmd /c go   (tu PowerShell) ===
)
echo.
if /i "%~1"=="--no-pause" exit /b 0
pause
