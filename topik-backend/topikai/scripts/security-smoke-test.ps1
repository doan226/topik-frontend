# Chay sau khi da cap nhat ADMIN_API_KEY tren Render Dashboard
# Tu WEDTOPIKAI: .\topik-backend\topikai\scripts\security-smoke-test.ps1

$ErrorActionPreference = "Stop"
$base = "https://topik-backend-1.onrender.com"
$pass = 0
$fail = 0

function Test-Case {
    param([string]$Name, [scriptblock]$Action)
    try {
        $ok = & $Action
        if ($ok) {
            Write-Host "[PASS] $Name"
            $script:pass++
        } else {
            Write-Host "[FAIL] $Name"
            $script:fail++
        }
    } catch {
        Write-Host "[FAIL] $Name - $($_.Exception.Message)"
        $script:fail++
    }
}

Test-Case "Health" {
    (Invoke-RestMethod "$base/api/v1/health").status -eq "ok"
}

Test-Case "Dashboard khong token -> 401" {
    try {
        Invoke-WebRequest "$base/api/v1/dashboard/1" -UseBasicParsing | Out-Null
        $false
    } catch {
        $_.Exception.Response.StatusCode.value__ -eq 401
    }
}

Test-Case "Login A tra token FREE" {
    $r = Invoke-RestMethod "$base/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"A","password":"1"}'
    $r.success -and $r.token -and $r.role -eq "FREE_USER"
}

Test-Case "Login A1 tra token PREMIUM" {
    $r = Invoke-RestMethod "$base/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"A1","password":"1"}'
    $r.success -and $r.token -and $r.role -eq "PREMIUM_USER"
}

Test-Case "Auth upgrade da xoa" {
    try {
        Invoke-WebRequest "$base/api/v1/auth/upgrade" -Method POST -UseBasicParsing | Out-Null
        $false
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        $code -eq 401 -or $code -eq 404
    }
}

Test-Case "Admin seed tu choi key sai" {
    try {
        Invoke-WebRequest "$base/api/v1/admin/seed-test-users" -Method POST -Headers @{"X-Admin-Key"="wrong-key"} -UseBasicParsing | Out-Null
        $false
    } catch {
        $_.Exception.Response.StatusCode.value__ -eq 401
    }
}

Write-Host ""
Write-Host "Ket qua: $pass pass, $fail fail"
if ($fail -gt 0) { exit 1 }
