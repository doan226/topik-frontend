<#
.SYNOPSIS
  Load test cho API cham diem /api/v1/topik/submit (kiem tra throttle Semaphore + timeout).

.DESCRIPTION
  Ban N request DONG THOI vao /api/v1/topik/submit roi tong hop ket qua:
    - graded  : cham thanh cong (co total_score, khong apiError)
    - busy    : bi throttle ("dang ban") hoac apiError (khong bi tru luot)
    - quota   : het luot (quotaExceeded)
    - http5xx : loi server / treo
  Muc tieu xac minh: KHONG co 5xx/treo, nguoi vuot tran nhan "busy", do duoc muc
  GEMINI_MAX_CONCURRENT phu hop voi RPM cua key Gemini.

  Chay duoc tren PowerShell 5.1 va 7+ (dung runspace pool).

.PARAMETER BaseUrl
  Goc backend, vd https://topik-backend-1.onrender.com hoac http://localhost:8080

.PARAMETER Token
  1 JWT Bearer token (dung chung cho moi request). Bi rate-limit per-user 30/60p,
  nen de test that su nhieu nguoi hay dung -TokenFile.

.PARAMETER TokenFile
  Duong dan file text, moi dong 1 JWT token (mo phong nhieu user khac nhau).

.PARAMETER Concurrency
  So request dong thoi (mac dinh 100).

.PARAMETER BodyFile
  File JSON body (mac dinh scripts/test-submit-q51.json).

.EXAMPLE
  .\load-test-grading.ps1 -BaseUrl http://localhost:8080 -Token "eyJ..." -Concurrency 100

.EXAMPLE
  .\load-test-grading.ps1 -BaseUrl https://topik-backend-1.onrender.com -TokenFile .\tokens.txt -Concurrency 100
#>
param(
    [Parameter(Mandatory = $true)][string]$BaseUrl,
    [string]$Token,
    [string]$TokenFile,
    [int]$Concurrency = 100,
    [string]$BodyFile
)

$ErrorActionPreference = "Stop"

if (-not $Token -and -not $TokenFile) {
    throw "Can cung cap -Token hoac -TokenFile."
}

if (-not $BodyFile) {
    $BodyFile = Join-Path $PSScriptRoot "test-submit-q51.json"
}
if (-not (Test-Path $BodyFile)) {
    throw "Khong tim thay body file: $BodyFile"
}
$body = Get-Content -Raw -Path $BodyFile

$tokens = @()
if ($TokenFile) {
    if (-not (Test-Path $TokenFile)) { throw "Khong tim thay TokenFile: $TokenFile" }
    $tokens = Get-Content -Path $TokenFile | Where-Object { $_.Trim() -ne "" }
    if ($tokens.Count -eq 0) { throw "TokenFile rong." }
} else {
    $tokens = @($Token)
}

$url = "$($BaseUrl.TrimEnd('/'))/api/v1/topik/submit"
Write-Host "Target : $url"
Write-Host "Tokens : $($tokens.Count)"
Write-Host "Concurrency: $Concurrency"
Write-Host "Bat dau ban request..." -ForegroundColor Cyan

# Worker: 1 request, tra ve object ket qua (chay trong runspace rieng)
$worker = {
    param($url, $token, $body, $index)

    $result = [ordered]@{
        index     = $index
        httpStatus = 0
        category  = "unknown"
        totalScore = $null
        elapsedMs = 0
        error     = $null
    }
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
        $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 120
        $result.httpStatus = [int]$resp.StatusCode

        $raw = $resp.Content
        # Body co the la chuoi JSON hoac chuoi-trong-chuoi -> chuan hoa
        try {
            $data = $raw | ConvertFrom-Json
            if ($data -is [string]) { $data = $data | ConvertFrom-Json }
        } catch {
            $data = $null
        }

        if ($data -and $data.quotaExceeded) {
            $result.category = "quota"
        } elseif ($data -and $data.apiError) {
            $result.category = "busy"   # gom throttle "dang ban" + loi ket noi AI
        } elseif ($data -and ($null -ne $data.total_score)) {
            $result.category = "graded"
            $result.totalScore = $data.total_score
        } else {
            $result.category = "other2xx"
        }
    } catch {
        $resp = $_.Exception.Response
        if ($resp -and $resp.StatusCode) {
            $code = [int]$resp.StatusCode.value__
            $result.httpStatus = $code
            if ($code -eq 429) { $result.category = "http429" }
            elseif ($code -ge 500) { $result.category = "http5xx" }
            elseif ($code -eq 401 -or $code -eq 403) { $result.category = "auth" }
            else { $result.category = "http4xx" }
        } else {
            $result.category = "neterror"
            $result.error = $_.Exception.Message
        }
    } finally {
        $sw.Stop()
        $result.elapsedMs = [int]$sw.Elapsed.TotalMilliseconds
    }
    [pscustomobject]$result
}

$pool = [runspacefactory]::CreateRunspacePool(1, $Concurrency)
$pool.Open()
$jobs = @()

for ($i = 0; $i -lt $Concurrency; $i++) {
    $token = $tokens[$i % $tokens.Count]
    $ps = [powershell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($worker).AddArgument($url).AddArgument($token).AddArgument($body).AddArgument($i)
    $jobs += [pscustomobject]@{ PS = $ps; Handle = $ps.BeginInvoke() }
}

$results = @()
foreach ($job in $jobs) {
    try {
        $results += $job.PS.EndInvoke($job.Handle)
    } catch {
        $results += [pscustomobject]@{ index = -1; httpStatus = 0; category = "invokeError"; totalScore = $null; elapsedMs = 0; error = $_.Exception.Message }
    } finally {
        $job.PS.Dispose()
    }
}
$pool.Close()
$pool.Dispose()

Write-Host ""
Write-Host "===== KET QUA ($($results.Count) request) =====" -ForegroundColor Cyan
$results | Group-Object category | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("{0,-12} : {1}" -f $_.Name, $_.Count)
}

$lat = $results | Where-Object { $_.elapsedMs -gt 0 } | Select-Object -ExpandProperty elapsedMs
if ($lat.Count -gt 0) {
    $sorted = $lat | Sort-Object
    $p95 = $sorted[[math]::Floor($sorted.Count * 0.95)]
    Write-Host ""
    Write-Host ("Latency ms  -> min={0} avg={1} p95={2} max={3}" -f `
        ($lat | Measure-Object -Minimum).Minimum, `
        [int]($lat | Measure-Object -Average).Average, `
        $p95, `
        ($lat | Measure-Object -Maximum).Maximum)
}

$bad = ($results | Where-Object { $_.category -in @("http5xx","neterror","invokeError") }).Count
Write-Host ""
if ($bad -eq 0) {
    Write-Host "PASS: Khong co 5xx/treo/loi mang. He thong chiu tai on dinh." -ForegroundColor Green
} else {
    Write-Host "CANH BAO: Co $bad request 5xx/treo/loi mang -> can xem lai (giam GEMINI_MAX_CONCURRENT hoac kiem tra DB pool)." -ForegroundColor Yellow
}
Write-Host "Goi y: tang GEMINI_MAX_CONCURRENT neu 'busy' qua nhieu va Gemini con quota; giam neu xuat hien http429 nhieu."
