# Upsert toan bo question-bank.json vao MySQL
param(
    [string] $BaseUrl = "http://localhost:8080",
    [string] $AdminKey = "dev-admin-key",
    [string] $JsonPath = "$PSScriptRoot\..\src\main\resources\question-bank.json"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $JsonPath)) {
    Write-Error "Khong tim thay $JsonPath. Chay export tu frontend truoc."
}
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes((Get-Content $JsonPath -Raw -Encoding UTF8))
$headers = @{
    "X-Admin-Key" = $AdminKey
    "Content-Type" = "application/json; charset=utf-8"
}
$resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/admin/questions/upsert" -Headers $headers -Body $bodyBytes
Write-Host "[upsert] inserted=$($resp.inserted) updated=$($resp.updated) total=$($resp.total)"
