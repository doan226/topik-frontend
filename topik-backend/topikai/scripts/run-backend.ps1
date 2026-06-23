# Chay backend: tu dong tim port trong 8080-8082
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$envFile = Join-Path $PSScriptRoot "..\.env.backend"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $pair = $_ -split '=', 2
        if ($pair.Length -eq 2) {
            $name = $pair[0].Trim()
            $value = $pair[1].Trim().Trim('"')
            Set-Item -Path "Env:$name" -Value $value
        }
    }
    Write-Host "[topikai] Loaded env from .env.backend"
}

$port = 8080
foreach ($candidate in 8080, 8081, 8082) {
    $inUse = Get-NetTCPConnection -LocalPort $candidate -State Listen -ErrorAction SilentlyContinue
    if (-not $inUse) { $port = $candidate; break }
    if ($candidate -eq 8082) {
        Write-Host "[topikai] Loi: 8080-8082 deu bi chiem. Dung run-backend.cmd hoac dat PORT=8083"
        exit 1
    }
}
$env:PORT = "$port"

$frontendRoot = Join-Path $PSScriptRoot "..\..\..\topik-frontend"
if (-not (Test-Path $frontendRoot)) {
    Write-Host "[topikai] Canh bao: khong tim thay topik-frontend tai $frontendRoot"
} else {
    $frontendEnv = Join-Path $frontendRoot ".env.development.local"
    "VITE_API_PORT=$port" | Set-Content -Path $frontendEnv -Encoding utf8
    Write-Host "[topikai] Da ghi $frontendEnv -> VITE_API_PORT=$port"
}

Write-Host "[topikai] Backend: http://localhost:$port"

& .\mvnw.cmd spring-boot:run
