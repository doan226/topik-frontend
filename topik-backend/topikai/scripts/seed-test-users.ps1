# Nap user test A (FREE) va A1 (PREMIUM) — mat khau: 1
# Chay: .\seed-test-users.ps1

$ErrorActionPreference = "Stop"
$sqlFile = Join-Path $PSScriptRoot "seed-test-users.sql"
$envFile = Join-Path $PSScriptRoot "..\.env.backend"

$dbUser = "root"
$dbPassword = ""
$dbName = "topik_db"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $pair = $_ -split '=', 2
        if ($pair.Length -eq 2) {
            $name = $pair[0].Trim()
            $value = $pair[1].Trim().Trim('"')
            switch ($name) {
                "DB_USER" { $dbUser = $value }
                "DB_PASSWORD" { $dbPassword = $value }
                "DB_URL" {
                    if ($value -match "/([^/?]+)(\?|$)") { $dbName = $Matches[1] }
                }
            }
        }
    }
    Write-Host "[seed-test-users] Doc .env.backend (db=$dbName, user=$dbUser)"
}

$mysql = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysql) {
    $defaultMysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    if (Test-Path $defaultMysql) {
        $mysql = @{ Source = $defaultMysql }
    }
}
if (-not $mysql) {
    Write-Host "[seed-test-users] Khong tim thay mysql CLI."
    Write-Host "Mo file SQL va chay trong MySQL Workbench:"
    Write-Host "  $sqlFile"
    Write-Host ""
    Write-Host "Hoac bat SEED_TEST_USERS=true trong .env.backend roi chay backend."
    exit 1
}

$sql = Get-Content $sqlFile -Raw -Encoding UTF8
$mysqlExe = if ($mysql.Source) { $mysql.Source } else { "mysql" }
if ($dbPassword) {
    $env:MYSQL_PWD = $dbPassword
    $sql | & $mysqlExe -u $dbUser $dbName
} else {
    $sql | & $mysqlExe -u $dbUser -p $dbName
}

if ($LASTEXITCODE -ne 0) {
    throw "MySQL seed failed (exit $LASTEXITCODE)"
}

Write-Host "[seed-test-users] Xong."
Write-Host "  A  / 1  -> FREE_USER"
Write-Host "  A1 / 1  -> PREMIUM_USER"
