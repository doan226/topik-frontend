# TOPIK AI — smoke verification after master plan implementation
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path "$root\topik-backend\topikai\pom.xml")) {
    $root = "c:\WEDTOPIKAI"
}

Write-Host "=== Backend unit tests ===" -ForegroundColor Cyan
Push-Location "$root\topik-backend\topikai"
& .\mvnw.cmd -q test
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "=== Frontend build ===" -ForegroundColor Cyan
Push-Location "$root\topik-frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "=== File checks ===" -ForegroundColor Cyan
$required = @(
    "topik-frontend\docs\IMPLEMENTATION-HANDOFF.md",
    "topik-frontend\src\hooks\useEntitlements.js",
    "topik-frontend\src\components\PricingPage.jsx",
    "topik-frontend\src\components\Topik1Hub.tsx",
    "topik-backend\topikai\src\main\java\com\topik\topikai\service\EntitlementService.java",
    "topik-backend\topikai\src\main\java\com\topik\topikai\service\PreGradingValidator.java",
    "topik-backend\topikai\src\main\java\com\topik\topikai\service\SkuPaymentService.java"
)
foreach ($f in $required) {
    $p = Join-Path $root $f
    if (-not (Test-Path $p)) { throw "Missing: $f" }
    Write-Host "  OK $f"
}

$topik1Banks = Get-ChildItem "$root\topik-frontend\data\topik1-*-bank.json"
Write-Host "  OK topik1 banks: $($topik1Banks.Count) files"

Write-Host "`nAll automated checks passed." -ForegroundColor Green
