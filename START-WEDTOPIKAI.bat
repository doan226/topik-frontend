@echo off
setlocal EnableDelayedExpansion
title TOPIK - Khoi dong ung dung

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%topik-frontend"
set "BACKEND=%ROOT%topik-backend\topikai"

echo.
echo ============================================
echo   WED TOPIK AI - Khoi dong local
echo ============================================
echo.

if not exist "%BACKEND%\mvnw.cmd" (
  echo [LOI] Khong tim thay backend tai %BACKEND%
  pause
  exit /b 1
)

echo [1/2] Khoi dong Backend...
call "%BACKEND%\start-backend-background.cmd"
if errorlevel 1 (
  echo [LOI] Backend khong len. Kiem tra MySQL va logs\backend.log
  pause
  exit /b 1
)

netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if !errorlevel! equ 0 (
  echo [OK] Frontend da chay tren port 5173.
  call "%FRONTEND%\wait-and-open-browser.cmd"
  goto done
)

echo [2/2] Khoi dong Frontend (cua so TOPIK Frontend)...
start "TOPIK Frontend" cmd /k "cd /d %FRONTEND% && call start-frontend.bat"

call "%FRONTEND%\wait-and-open-browser.cmd"
if errorlevel 1 (
  echo [LOI] Frontend khong len tren port 5173.
  echo Thu chay thu cong: cd topik-frontend ^&^& npm run dev
  pause
  exit /b 1
)

:done
echo.
echo Backend: http://localhost:8080/api/v1/health
echo Frontend: http://localhost:5173
echo.
echo Luu y: Giu cua so "TOPIK Frontend" mo (co the thu nho).
echo Tat backend: STOP-BACKEND.bat
echo.
pause
