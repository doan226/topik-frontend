@echo off
setlocal EnableDelayedExpansion
set "URL=http://localhost:5173"
set "MAX=30"
set "N=0"

echo Dang doi frontend san sang tai %URL% ...

:loop
set /a N+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2).StatusCode | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if !errorlevel! equ 0 goto ready
if !N! geq %MAX% (
  echo [LOI] Frontend chua san sang sau %MAX% giay.
  echo Hay kiem tra cua so "TOPIK Frontend" co loi khong.
  exit /b 1
)
ping 127.0.0.1 -n 2 >nul
goto loop

:ready
echo Frontend OK — mo trinh duyet...
start "" "%URL%"
exit /b 0
