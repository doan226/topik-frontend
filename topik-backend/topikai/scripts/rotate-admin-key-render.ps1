# Xoay ADMIN_API_KEY tren Render (can RENDER_API_KEY hoac render login)
# Chay: .\rotate-admin-key-render.ps1

$ErrorActionPreference = "Stop"
$renderCli = "$env:LOCALAPPDATA\render-cli\cli_v1.1.0.exe"
$newKeyFile = Join-Path $PSScriptRoot "..\.env.render.new"
$envRender = Join-Path $PSScriptRoot "..\.env.render"

if (-not (Test-Path $newKeyFile)) {
    throw "Thieu file .env.render.new"
}

$newKey = (Get-Content $newKeyFile | Where-Object { $_ -match '^ADMIN_API_KEY=' }) -replace '^ADMIN_API_KEY=', ''
$newKey = $newKey.Trim().Trim('"')
if (-not $newKey) { throw "ADMIN_API_KEY trong .env.render.new rong" }

Write-Host ""
Write-Host "=== KEY MOI (dan vao Render neu CLI khong tu cap nhat duoc) ==="
Write-Host "ADMIN_API_KEY=$newKey"
Write-Host ""

$serviceId = $null
if (Test-Path $renderCli) {
    try {
        $services = & $renderCli services list -o json 2>&1 | Out-String
        if ($services -match '"name"\s*:\s*"topik-backend-1"') {
            if ($services -match '"id"\s*:\s*"(srv-[^"]+)"[^}]*"name"\s*:\s*"topik-backend-1"') {
                $serviceId = $Matches[1]
            }
        }
        if (-not $serviceId -and $services -match 'srv-[a-z0-9]+') {
            $all = [regex]::Matches($services, 'srv-[a-z0-9]+') | ForEach-Object { $_.Value }
            if ($all.Count -eq 1) { $serviceId = $all[0] }
        }
    } catch { }
}

if ($env:RENDER_API_KEY -and $serviceId) {
    Write-Host "[rotate] Cap nhat qua Render API (service $serviceId)..."
    $headers = @{
        Authorization = "Bearer $($env:RENDER_API_KEY)"
        "Content-Type" = "application/json"
    }
    $body = @{ value = $newKey } | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/env-vars/ADMIN_API_KEY" -Method PUT -Headers $headers -Body $body
    Write-Host "[rotate] Da cap nhat ADMIN_API_KEY. Doi deploy (~2 phut)..."
} elseif (Test-Path $renderCli) {
    Write-Host "[rotate] Thu cap nhat bang Render CLI..."
    try {
        & $renderCli services update topik-backend-1 --env-var "ADMIN_API_KEY=$newKey" -o text 2>&1
        Write-Host "[rotate] CLI cap nhat xong. Doi deploy (~2 phut)..."
    } catch {
        Write-Host "[rotate] CLI chua dang nhap. Lam thu cong:"
        Write-Host "  1. https://dashboard.render.com -> topik-backend-1 -> Environment"
        Write-Host "  2. Sua ADMIN_API_KEY = key o tren"
        Write-Host "  3. Save -> Manual Deploy"
        Write-Host "  Hoac: render login  roi chay lai script nay"
    }
} else {
    Write-Host "[rotate] Lam thu cong tren Render Dashboard (xem key o tren)."
}

Copy-Item $newKeyFile $envRender -Force
Write-Host "[rotate] Da ghi .env.render local."

Write-Host ""
Write-Host "Sau khi Render deploy xong, chay:"
Write-Host "  .\security-smoke-test.ps1"
Write-Host "  .\seed-production-via-api.ps1"
