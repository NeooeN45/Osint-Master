# OSINT Master - Test & Fix System
param([switch]$Install, [int]$MaxRetries = 5)

function Test-Port($Port) {
    try {
        $result = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $result.TcpTestSucceeded
    } catch { return $false }
}

function Invoke-API($Method, $Endpoint, $Body = $null) {
    try {
        $params = @{ Uri = "http://localhost:3003$Endpoint"; Method = $Method; TimeoutSec = 10; ErrorAction = "Stop" }
        if ($Body) { $params.Body = ($Body | ConvertTo-Json); $params.ContentType = "application/json" }
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Write-Status($Message, $Color) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

$retry = 0
$allGood = $false

while (-not $allGood -and $retry -lt $MaxRetries) {
    $retry++
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "     TEST ITERATION $retry / $MaxRetries" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $tests = @{}

    # Test Backend
    Write-Status "Testing Backend (3003)..." "Yellow"
    $tests.Backend = Test-Port 3003
    Write-Status "  Backend: $($tests.Backend)" $(if($tests.Backend){"Green"}else{"Red"})

    if (-not $tests.Backend) {
        Write-Status "Starting Backend..." "Yellow"
        Start-Process powershell -ArgumentList "-Command", "cd '$PSScriptRoot\backend'; npx tsx src/server-minimal.ts" -WindowStyle Minimized
        Start-Sleep -Seconds 5
    }

    # Test Frontend
    Write-Status "Testing Frontend (3001)..." "Yellow"
    $tests.Frontend = Test-Port 3001
    Write-Status "  Frontend: $($tests.Frontend)" $(if($tests.Frontend){"Green"}else{"Red"})

    if (-not $tests.Frontend) {
        Write-Status "Starting Frontend..." "Yellow"
        Start-Process powershell -ArgumentList "-Command", "cd '$PSScriptRoot'; npm run dev -- --port=3001" -WindowStyle Minimized
        Start-Sleep -Seconds 5
    }

    # Test API
    Write-Status "Testing API..." "Yellow"
    $result = Invoke-API "GET" "/"
    $tests.API = $result.Success
    Write-Status "  API: $($tests.API)" $(if($tests.API){"Green"}else{"Red"})

    # Test Modules
    Write-Status "Testing Modules..." "Yellow"
    $result = Invoke-API "GET" "/api/modules/catalog"
    $tests.Modules = $result.Success -and $result.Data.modules.Count -gt 0
    Write-Status "  Modules ($($result.Data.modules.Count)): $($tests.Modules)" $(if($tests.Modules){"Green"}else{"Red"})

    # Test Categories
    Write-Status "Testing Categories..." "Yellow"
    $result = Invoke-API "GET" "/api/modules/categories"
    $tests.Categories = $result.Success -and $result.Data.categories.Count -gt 0
    Write-Status "  Categories ($($result.Data.categories.Count)): $($tests.Categories)" $(if($tests.Categories){"Green"}else{"Red"})

    # Test Tools Catalog
    Write-Status "Testing Tools Catalog..." "Yellow"
    $result = Invoke-API "GET" "/api/tools/catalog"
    $tests.Tools = $result.Success -and $result.Data.tools.Count -gt 0
    Write-Status "  Tools ($($result.Data.tools.Count)): $($tests.Tools)" $(if($tests.Tools){"Green"}else{"Red"})

    # Auto-install if requested
    if ($Install -and $tests.API) {
        Write-Status "Running Quick Start Install..." "Yellow"
        $result = Invoke-API "POST" "/api/modules/quickstart"
        if ($result.Success) {
            Write-Status "  Installed: $($result.Data.successful) modules" "Green"
        }

        Write-Status "Checking Setup Status..." "Yellow"
        $result = Invoke-API "GET" "/api/setup/status"
        if ($result.Success -and -not $result.Data.ready) {
            Write-Status "Installing Prerequisites..." "Yellow"
            Invoke-API "POST" "/api/setup/prerequisites" | Out-Null
            Start-Sleep -Seconds 10
        }
    }

    # Check if all good
    $allGood = $tests.Backend -and $tests.Frontend -and $tests.API -and $tests.Modules -and $tests.Categories -and $tests.Tools

    if ($allGood) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "     ✓✓✓ ALL SYSTEMS WORKING! ✓✓✓" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Access: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "API: http://localhost:3003" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Status "Some tests failed. Waiting 10s before retry..." "Yellow"
        Start-Sleep -Seconds 10
    }
}

Write-Host "`n========================================" -ForegroundColor Red
Write-Host "     MAX RETRIES REACHED" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
exit 1
