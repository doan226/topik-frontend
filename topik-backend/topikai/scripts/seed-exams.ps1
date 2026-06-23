# Import de TOPIK II tu topik-frontend/data/topik2-*-bank.json vao MySQL.
#   .\seed-exams.ps1                 -> nap toan bo ky
#   .\seed-exams.ps1 -Only topik2-60 -> chi nap 1 ky (thu nghiem)
param(
    [string] $Only = ""
)

$ErrorActionPreference = "Stop"
$backendRoot = Resolve-Path "$PSScriptRoot\.."

$onlyArg = ""
if ($Only -ne "") {
    $onlyArg = "-Dseed.only=$Only"
    Write-Host "[seed-exams] Chi nap ky: $Only"
} else {
    Write-Host "[seed-exams] Nap toan bo ky"
}

Push-Location $backendRoot
try {
    & .\mvnw.cmd -q -DskipTests spring-boot:run `
        "-Dspring-boot.run.jvmArguments=-Dseed.exams=true $onlyArg" `
        "-Dspring-boot.run.arguments=--spring.main.web-application-type=none"
    if ($LASTEXITCODE -ne 0) {
        throw "Maven seed failed with exit code $LASTEXITCODE"
    }
    Write-Host "[seed-exams] Hoan tat."
}
finally {
    Pop-Location
}
