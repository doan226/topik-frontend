@echo off
cd /d "%~dp0"
title TOPIK Frontend

call "%~dp0ensure-backend.cmd"
if errorlevel 1 exit /b 1

if not exist "node_modules\vite\bin\vite.js" (
  echo Dang cai npm packages...
  call npm.cmd install
  if errorlevel 1 exit /b 1
)

echo.
echo ============================================
echo   TOPIK Frontend: http://localhost:5173
echo   Backend: tu dong chay nen (neu chua co)
echo   Tat backend: ..\topik-backend\topikai\stop-servers.cmd
echo ============================================
echo.

node "node_modules\vite\bin\vite.js" --host
