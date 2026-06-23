@echo off
setlocal EnableDelayedExpansion
title TOPIK - Khoi dong ung dung

set "FRONTEND=%~dp0"
set "BACKEND=%~dp0..\topik-backend\topikai"

echo.
echo ============================================
echo   TOPIK APP - Khoi dong tu dong
echo ============================================
echo.
echo   Backend chay NEN — dong cua so nay sau khi start van OK.
echo   Tat backend: ..\topik-backend\topikai\stop-servers.cmd
echo.

if not exist "%BACKEND%\mvnw.cmd" (
  echo [LOI] Khong tim thay backend tai %BACKEND%
  pause
  exit /b 1
)

call "%BACKEND%\start-backend-background.cmd"
if errorlevel 1 (
  echo [LOI] Khong khoi dong duoc backend. Kiem tra MySQL va logs\backend.log
  pause
  exit /b 1
)

:: --- Frontend: chi khoi dong neu port 5173 chua co ---
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if !errorlevel! equ 0 (
  echo [OK] Frontend da dang chay tren port 5173.
  call "%~dp0wait-and-open-browser.cmd"
  goto done
)

echo [..] Dang khoi dong Frontend (cua so TOPIK Frontend)...
start "TOPIK Frontend" cmd /k "cd /d %FRONTEND% && call start-frontend.bat"

call "%~dp0wait-and-open-browser.cmd"
if errorlevel 1 (
  echo [LOI] Frontend khong len. Chay: cd topik-frontend ^&^& npm run dev
  pause
  exit /b 1
)

:done
echo.
echo Neu van loi dang nhap: doi 30-90s, kiem tra ..\topik-backend\topikai\logs\backend.log
echo.
pause
