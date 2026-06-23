# Nap user test tren Railway MySQL qua CLI (can railway link + MySQL dang chay)
# Chay tu WEDTOPIKAI: .\topik-backend\topikai\scripts\seed-railway-mysql.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$sqlFile = Join-Path $PSScriptRoot "seed-test-users.sql"

Push-Location $root
try {
    $varsJson = railway variables --json | ConvertFrom-Json
    $hostName = $varsJson.RAILWAY_TCP_PROXY_DOMAIN
    $port = $varsJson.RAILWAY_TCP_PROXY_PORT
    $dbUser = $varsJson.MYSQLUSER
    $dbPassword = $varsJson.MYSQLPASSWORD
    $dbName = $varsJson.MYSQLDATABASE

    $mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    if (-not (Test-Path $mysql)) {
        throw "Khong tim thay mysql.exe. Cai MySQL client hoac dung init-railway-db.ps1"
    }

    $sql = (Get-Content $sqlFile -Raw -Encoding UTF8) -replace 'USE topik_db;', "USE $dbName;"
    $env:MYSQL_PWD = $dbPassword
    $sql | & $mysql -h $hostName -P $port -u $dbUser $dbName
    if ($LASTEXITCODE -ne 0) { throw "MySQL seed failed (exit $LASTEXITCODE)" }

    & $mysql -h $hostName -P $port -u $dbUser $dbName -e "SELECT id, username, role, is_verified FROM users WHERE username IN ('A','A1');"
    Write-Host "[seed-railway-mysql] Xong."
} finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    Pop-Location
}
