# ============================================================================
# OSINT MASTER - TEST & AUTO-INSTALL SYSTEM
# Tests everything and installs until all works
# ============================================================================

param(
    [switch]$InstallAll,
    [switch]$TestOnly,
    [int]$MaxRetries = 3
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "Continue"

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-Status($Message, $Color = "White") {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Test-Port($Port) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

function Invoke-API($Method, $Endpoint, $Body = $null) {
    try {
        $params = @{
            Uri = "http://localhost:3003$Endpoint"
            Method = $Method
            TimeoutSec = 10
            ErrorAction = "Stop"
        }
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# ============================================================================
# TESTS
# ============================================================================

$TestResults = @{
    BackendRunning = $false
    APIResponsive = $false
    ModulesLoad = $false
    CategoriesLoad = $false
    ToolsCatalog = $false
    CanInstall = $false
    CanExecute = $false
    FrontendAccessible = $false
}

$InstallStatus = @{
    Prerequisites = $false
    Essentials = $false
    AllTools = $false
}

# Test 1: Backend Port
Write-Status "TEST 1: Checking Backend (Port 3003)..." $Cyan
if (Test-Port 3003) {
    Write-Status "  ✓ Backend is running on port 3003" $Green
    $TestResults.BackendRunning = $true
} else {
    Write-Status "  ✗ Backend NOT running on port 3003" $Red
}

# Test 2: API Root
Write-Status "TEST 2: Testing API Root..." $Cyan
$result = Invoke-API "GET" "/"
if ($result.Success -and $result.Data.name -eq "OSINT Master API") {
    Write-Status "  ✓ API is responsive" $Green
    $TestResults.APIResponsive = $true
} else {
    Write-Status "  ✗ API not responsive: $($result.Error)" $Red
}

# Test 3: Modules Catalog
Write-Status "TEST 3: Testing Modules Catalog..." $Cyan
$result = Invoke-API "GET" "/api/modules/catalog"
if ($result.Success -and $result.Data.modules) {
    $count = $result.Data.modules.Count
    Write-Status "  ✓ Modules catalog loaded: $count modules" $Green
    $TestResults.ModulesLoad = $true
} else {
    Write-Status "  ✗ Failed to load modules: $($result.Error)" $Red
}

# Test 4: Categories
Write-Status "TEST 4: Testing Categories..." $Cyan
$result = Invoke-API "GET" "/api/modules/categories"
if ($result.Success -and $result.Data.categories) {
    $count = $result.Data.categories.Count
    Write-Status "  ✓ Categories loaded: $count categories" $Green
    $TestResults.CategoriesLoad = $true
} else {
    Write-Status "  ✗ Failed to load categories: $($result.Error)" $Red
}

# Test 5: Tools Catalog
Write-Status "TEST 5: Testing Tools Catalog..." $Cyan
$result = Invoke-API "GET" "/api/tools/catalog"
if ($result.Success -and $result.Data.tools) {
    $count = $result.Data.tools.Count
    Write-Status "  ✓ Tools catalog loaded: $count tools" $Green
    $TestResults.ToolsCatalog = $true
} else {
    Write-Status "  ✗ Failed to load tools catalog: $($result.Error)" $Red
}

# Test 6: Setup Status
Write-Status "TEST 6: Checking Setup Status..." $Cyan
$result = Invoke-API "GET" "/api/setup/status"
if ($result.Success) {
    $ready = $result.Data.ready
    $installed = $result.Data.prerequisites.installed -join ", "
    Write-Status "  Prerequisites: $installed" $Yellow
    if ($ready) {
        Write-Status "  ✓ System ready" $Green
        $InstallStatus.Prerequisites = $true
    } else {
        Write-Status "  ⚠ Missing prerequisites: $($result.Data.prerequisites.missing -join ', ')" $Yellow
    }
} else {
    Write-Status "  ✗ Failed to check setup status: $($result.Error)" $Red
}

# Test 7: Try Install Single Tool
Write-Status "TEST 7: Testing Tool Installation..." $Cyan
$result = Invoke-API "POST" "/api/tools/install/sherlock"
if ($result.Success) {
    Write-Status "  ✓ Installation endpoint works" $Green
    $TestResults.CanInstall = $true
} else {
    Write-Status "  ✗ Installation failed: $($result.Error)" $Red
}

# Test 8: Check Tool Status
Write-Status "TEST 8: Checking Tool Status..." $Cyan
Start-Sleep -Seconds 2
$result = Invoke-API "POST" "/api/tools/check/sherlock"
if ($result.Success) {
    $installed = $result.Data.installed
    Write-Status "  Sherlock installed: $installed" $(if($installed){$Green}else{$Yellow})
} else {
    Write-Status "  ⚠ Could not check status: $($result.Error)" $Yellow
}

# Test 9: Try Execute (if installed)
Write-Status "TEST 9: Testing Tool Execution..." $Cyan
$result = Invoke-API "POST" "/api/tools/execute/sherlock" @{target="testuser123"}
if ($result.Success) {
    Write-Status "  ✓ Execution endpoint works" $Green
    $TestResults.CanExecute = $true
} else {
    Write-Status "  ⚠ Execution test: $($result.Error)" $Yellow
}

# Test 10: Autonomous Search
Write-Status "TEST 10: Testing Autonomous Search..." $Cyan
$result = Invoke-API "POST" "/api/tools/autonomous" @{target="example.com"; targetType="domain"}
if ($result.Success) {
    Write-Status "  ✓ Autonomous search works" $Green
} else {
    Write-Status "  ⚠ Autonomous search: $($result.Error)" $Yellow
}

# Test 11: Frontend Port
Write-Status "TEST 11: Checking Frontend (Port 3001)..." $Cyan
if (Test-Port 3001) {
    Write-Status "  ✓ Frontend is accessible on port 3001" $Green
    $TestResults.FrontendAccessible = $true
} else {
    Write-Status "  ✗ Frontend NOT accessible on port 3001" $Red
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n========================================" -ForegroundColor $Cyan
Write-Host "           TEST SUMMARY" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan

$passed = ($TestResults.Values | Where-Object { $_ -eq $true }).Count
$total = $TestResults.Count

Write-Host "`nBackend Tests:" -ForegroundColor $Yellow
Write-Host "  Backend Running:     $($TestResults.BackendRunning)" $(if($TestResults.BackendRunning){$Green}else{$Red})
Write-Host "  API Responsive:      $($TestResults.APIResponsive)" $(if($TestResults.APIResponsive){$Green}else{$Red})
Write-Host "  Modules Load:        $($TestResults.ModulesLoad)" $(if($TestResults.ModulesLoad){$Green}else{$Red})
Write-Host "  Categories Load:     $($TestResults.CategoriesLoad)" $(if($TestResults.CategoriesLoad){$Green}else{$Red})
Write-Host "  Tools Catalog:       $($TestResults.ToolsCatalog)" $(if($TestResults.ToolsCatalog){$Green}else{$Red})

Write-Host "`nFunctionality Tests:" -ForegroundColor $Yellow
Write-Host "  Can Install:         $($TestResults.CanInstall)" $(if($TestResults.CanInstall){$Green}else{$Red})
Write-Host "  Can Execute:         $($TestResults.CanExecute)" $(if($TestResults.CanExecute){$Green}else{$Red})

Write-Host "`nFrontend Tests:" -ForegroundColor $Yellow
Write-Host "  Frontend Accessible: $($TestResults.FrontendAccessible)" $(if($TestResults.FrontendAccessible){$Green}else{$Red})

Write-Host "`n----------------------------------------" -ForegroundColor $Cyan
Write-Host "  PASSED: $passed / $total" -ForegroundColor $(if($passed -eq $total){$Green}else{$Yellow})
Write-Host "----------------------------------------" -ForegroundColor $Cyan

# ============================================================================
# AUTO-INSTALLATION
# ============================================================================

if (-not $TestOnly) {
    Write-Host "`n========================================" -ForegroundColor $Cyan
    Write-Host "        AUTO-INSTALLATION" -ForegroundColor $Cyan
    Write-Host "========================================" -ForegroundColor $Cyan

    # Install Prerequisites if needed
    if (-not $InstallStatus.Prerequisites) {
        Write-Status "Installing Prerequisites..." $Yellow
        $result = Invoke-API "POST" "/api/setup/prerequisites"
        if ($result.Success) {
            Write-Status "  ✓ Prerequisites installation started" $Green
            Write-Status "  Waiting 60 seconds..." $Yellow
            Start-Sleep -Seconds 60
        }
    }

    # Install Essentials
    if (-not $InstallStatus.Essentials) {
        Write-Status "Installing Essential Tools..." $Yellow
        $result = Invoke-API "POST" "/api/setup/essentials"
        if ($result.Success) {
            Write-Status "  ✓ Essentials installation complete" $Green
            Write-Status "  Installed: $($result.Data.successful)" $Green
            Write-Status "  Failed: $($result.Data.failed)" $(if($result.Data.failed -gt 0){$Red}else{$Green})
            $InstallStatus.Essentials = $true
        } else {
            Write-Status "  ✗ Essentials installation failed: $($result.Error)" $Red
        }
    }

    # Install All if requested
    if ($InstallAll) {
        Write-Status "Installing ALL Tools (this will take time)..." $Yellow
        $result = Invoke-API "POST" "/api/setup/all"
        if ($result.Success) {
            Write-Status "  ✓ Full installation started (Job: $($result.Data.jobId))" $Green
            Write-Status "  Check progress with: curl http://localhost:3003/api/setup/progress" $Cyan
        }
    }

    # Quick Start Install
    Write-Status "Running Quick Start..." $Yellow
    $result = Invoke-API "POST" "/api/modules/quickstart"
    if ($result.Success) {
        Write-Status "  ✓ Quick start complete" $Green
        Write-Status "  Installed: $($result.Data.successful) modules" $Green
    }
}

# ============================================================================
# FINAL STATUS
# ============================================================================

Write-Host "`n========================================" -ForegroundColor $Cyan
Write-Host "         FINAL STATUS" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan

$allWorking = $TestResults.BackendRunning -and 
              $TestResults.APIResponsive -and 
              $TestResults.ModulesLoad -and 
              $TestResults.CategoriesLoad -and
              $TestResults.FrontendAccessible

if ($allWorking) {
    Write-Host "`n  ✓✓✓ ALL SYSTEMS OPERATIONAL ✓✓✓" -ForegroundColor $Green
    Write-Host "`n  Access your OSINT Master at:" -ForegroundColor $Cyan
    Write-Host "  → http://localhost:3001" -ForegroundColor $Green
    Write-Host "  → API: http://localhost:3003" -ForegroundColor $Green
    exit 0
} else {
    Write-Host "`n  ⚠ SOME ISSUES DETECTED" -ForegroundColor $Yellow
    Write-Host "`n  To fix issues:" -ForegroundColor $Cyan
    Write-Host "  1. Ensure backend is running: cd backend && npx tsx src/server-minimal.ts" -ForegroundColor $White
    Write-Host "  2. Ensure frontend is running: npm run dev -- --port=3001" -ForegroundColor $White
    Write-Host "  3. Check ports: npx kill-port 3003 3001" -ForegroundColor $White
    Write-Host "  4. Re-run this script" -ForegroundColor $White
    exit 1
}
