# In khoi tao schema + user test A/A1 tren Railway MySQL (project da link bang railway link)
# Chay tu thu muc goc WEDTOPIKAI: .\topik-backend\topikai\scripts\init-railway-db.ps1

$ErrorActionPreference = "Stop"
$topikai = Split-Path $PSScriptRoot -Parent
$root = Resolve-Path (Join-Path $topikai "..\..")

Push-Location $root
try {
    $varsJson = railway variables --json | ConvertFrom-Json
    $hostName = $varsJson.RAILWAY_TCP_PROXY_DOMAIN
    $port = $varsJson.RAILWAY_TCP_PROXY_PORT
    $dbUser = $varsJson.MYSQLUSER
    $dbPassword = $varsJson.MYSQLPASSWORD
    $dbName = $varsJson.MYSQLDATABASE

    if (-not $hostName -or -not $port) {
        throw "Khong lay duoc TCP proxy tu Railway. Chay: railway link (chon project MySQL)."
    }

    $dbUrl = "jdbc:mysql://${hostName}:${port}/${dbName}?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=true&allowPublicKeyRetrieval=true"

    Write-Host "[init-railway-db] Khoi tao schema + seed A/A1 tren Railway ($hostName:$port/$dbName)..."
    Write-Host "[init-railway-db] Doi backend khoi dong (~40s)..."

    Push-Location $topikai
    $env:DB_URL = $dbUrl
    $env:DB_USER = $dbUser
    $env:DB_PASSWORD = $dbPassword
    $env:SEED_TEST_USERS = "true"
    $env:PORT = "8099"

    $proc = Start-Process -FilePath ".\mvnw.cmd" -ArgumentList "-q","spring-boot:run" -PassThru -NoNewWindow
    $deadline = (Get-Date).AddMinutes(3)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:8099/api/v1/health" -UseBasicParsing -TimeoutSec 3
            $ready = $true
            break
        } catch { }
        if ($proc.HasExited) { break }
    }

    if (-not $ready) {
        if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
        throw "Backend khong khoi dong duoc trong 3 phut."
    }

    Write-Host "[init-railway-db] Schema + user test da san sang."
} finally {
    Remove-Item Env:DB_URL, Env:DB_USER, Env:DB_PASSWORD, Env:SEED_TEST_USERS, Env:PORT -ErrorAction SilentlyContinue
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
    Pop-Location
}

Write-Host "[init-railway-db] Tiep theo: chay .\topik-backend\topikai\scripts\print-render-db-env.ps1 de cap nhat Render."
