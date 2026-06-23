# Seed user A/A1 tren database production (Render) — Cach 2
# 1) Copy file nay thanh .env.render va dien ADMIN_API_KEY tu Render
# 2) Chay: .\seed-production-via-api.ps1

param(
    [string]$AdminKey,
    [string]$ApiBase = "https://topik-backend-1.onrender.com"
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot "..\.env.render"

if (-not $AdminKey -and (Test-Path $envFile)) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $pair = $_ -split '=', 2
        if ($pair.Length -eq 2 -and $pair[0].Trim() -eq 'ADMIN_API_KEY') {
            $AdminKey = $pair[1].Trim().Trim('"')
        }
    }
}

if (-not $AdminKey) {
    Write-Host ""
    Write-Host "Thieu ADMIN_API_KEY."
    Write-Host "1. Render -> topik-backend-1 -> Environment -> copy ADMIN_API_KEY"
    Write-Host "2. Tao file: topik-backend\topikai\.env.render"
    Write-Host "   ADMIN_API_KEY=gia-tri-cua-ban"
    Write-Host "3. Chay lai script nay"
    Write-Host ""
    Write-Host "Hoac: .\seed-production-via-api.ps1 -AdminKey `"gia-tri`""
    exit 1
}

$uri = "$ApiBase/api/v1/admin/seed-test-users"
Write-Host "[seed-production-via-api] POST $uri"

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers @{ "X-Admin-Key" = $AdminKey }
    $response | ConvertTo-Json -Depth 5
    Write-Host ""
    Write-Host "[seed-production-via-api] Xong. Thu dang nhap:"
    Write-Host "  A  / 1  (FREE)"
    Write-Host "  A1 / 1  (PREMIUM)"
    Write-Host "  https://topik-frontend-red.vercel.app"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "[seed-production-via-api] Loi HTTP $status"
    if ($status -eq 401) {
        Write-Host "Sai ADMIN_API_KEY. Lay lai tu Render -> Environment."
    } elseif ($status -eq 404) {
        Write-Host "API chua deploy. Doi Render deploy xong roi chay lai."
    }
    throw
}
