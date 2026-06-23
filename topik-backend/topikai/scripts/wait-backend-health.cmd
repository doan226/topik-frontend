@echo off
setlocal EnableDelayedExpansion
set "TARGET=%~1"
set "MAX=90"

for /L %%N in (1,1,%MAX%) do (
  if defined TARGET (
    call :healthOk !TARGET!
    if !errorlevel! equ 0 (
      echo [topikai] Health OK port !TARGET! ^(%%N s^)
      endlocal & exit /b 0
    )
  ) else (
    for %%P in (8080 8081 8082 8083 8084 8085) do (
      call :healthOk %%P
      if !errorlevel! equ 0 (
        echo [topikai] Health OK port %%P ^(%%N s^)
        endlocal & exit /b 0
      )
    )
  )
  ping 127.0.0.1 -n 2 >nul
)

echo [topikai] Health timeout sau %MAX% giay
endlocal & exit /b 1

:healthOk
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%~1/api/v1/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b %errorlevel%
