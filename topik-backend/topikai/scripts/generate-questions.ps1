# Sinh de TOPIK II writing bang Gemini (can GEMINI_API_KEY)
# Vi du: .\scripts\generate-questions.ps1 -TopikSessions 38,39,40,60,66,76,84
param(
    [int[]] $TopikSessions = @(38, 39, 40, 60, 66, 76, 84),
    [string] $BaseUrl = "http://localhost:8080",
    [string] $AdminKey = "dev-admin-key"
)

$ErrorActionPreference = "Stop"
$headers = @{ "X-Admin-Key" = $AdminKey }

foreach ($topik in $TopikSessions) {
    Write-Host "[generate] Kỳ $topik ..."
    try {
        $uri = "$BaseUrl/api/v1/admin/questions/generate?topik=$topik"
        $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers
        Write-Host "  OK: $($resp.count) cau"
    } catch {
        Write-Warning "  Loi kỳ $topik : $_"
    }
    Start-Sleep -Seconds 2
}

Write-Host "[generate] Xong. Chay export tu frontend neu can cap nhat question-bank.json."
