@echo off
echo [topikai] Dang giai phong port 8080-8085 (backend)...
for %%P in (8080 8081 8082 8083 8084 8085) do (
  for /f "tokens=5" %%i in ('netstat -ano 2^>nul ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo   - Port %%P PID %%i
    taskkill /F /PID %%i >nul 2>&1
  )
)
echo [topikai] Xong.
echo   Chay lai nen:  start-backend-background.cmd
echo   Chay hien cua so: run-backend.cmd
