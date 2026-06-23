# In gia tri DB_URL / DB_USER / DB_PASSWORD de dan vao Render Environment
# Chay tu WEDTOPIKAI: .\topik-backend\topikai\scripts\print-render-db-env.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Push-Location $root
try {
    $varsJson = railway variables --json | ConvertFrom-Json
    $hostName = $varsJson.RAILWAY_TCP_PROXY_DOMAIN
    $port = $varsJson.RAILWAY_TCP_PROXY_PORT
    $dbUser = $varsJson.MYSQLUSER
    $dbPassword = $varsJson.MYSQLPASSWORD
    $dbName = $varsJson.MYSQLDATABASE

    $dbUrl = "jdbc:mysql://${hostName}:${port}/${dbName}?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=true&allowPublicKeyRetrieval=true"

    Write-Host ""
    Write-Host "=== Dan vao Render -> topik-backend-1 -> Environment ==="
    Write-Host ""
    Write-Host "DB_URL=$dbUrl"
    Write-Host "DB_USER=$dbUser"
    Write-Host "DB_PASSWORD=$dbPassword"
    Write-Host ""
    Write-Host "Sau khi Save -> Manual Deploy backend."
    Write-Host ""
} finally {
    Pop-Location
}
