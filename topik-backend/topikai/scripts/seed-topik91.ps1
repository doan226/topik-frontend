# Import de TOPIK II ky 91 tu topik-frontend/data/topik2-91-bank.json vao MySQL
param(
    [string] $BankPath = "$PSScriptRoot\..\..\..\topik-frontend\data\topik2-91-bank.json"
)

$ErrorActionPreference = "Stop"
$backendRoot = Resolve-Path "$PSScriptRoot\.."

if (-not (Test-Path $BankPath)) {
    Write-Error "Khong tim thay $BankPath"
}

Write-Host "[seed-topik91] Bank: $BankPath"
Write-Host "[seed-topik91] Chay import (seed.topik91=true)..."

Push-Location $backendRoot
try {
    & .\mvnw.cmd -q -DskipTests spring-boot:run `
        "-Dspring-boot.run.jvmArguments=-Dseed.topik91=true -Dtopik91.bank.path=$BankPath" `
        "-Dspring-boot.run.arguments=--spring.main.web-application-type=none"
    if ($LASTEXITCODE -ne 0) {
        throw "Maven seed failed with exit code $LASTEXITCODE"
    }
    Write-Host "[seed-topik91] Hoan tat."
}
finally {
    Pop-Location
}
