param(
  [int]$Port = 3000,
  [string]$HealthPath = "/.netlify/functions/runtime-health",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logPath = Join-Path $projectRoot "sandbox_local_server.log"
$errLogPath = Join-Path $projectRoot "sandbox_local_server.err.log"
$startupTimeoutSec = 30

Write-Host "[sandbox] project: $projectRoot"
Write-Host "[sandbox] target port: $Port"

function Stop-ListeningProcess {
  param([int]$TargetPort)
  try {
    $connections = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
  } catch {
    $connections = @()
  }
  $owningProcessIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($owningProcessId in $owningProcessIds) {
    if ($owningProcessId -and $owningProcessId -ne $PID) {
      try {
        Write-Host "[sandbox] stopping process PID=$owningProcessId on port $TargetPort"
        Stop-Process -Id $owningProcessId -Force -ErrorAction Stop
      } catch {
        Write-Warning "[sandbox] failed to stop PID=$owningProcessId : $($_.Exception.Message)"
      }
    }
  }
}

Stop-ListeningProcess -TargetPort $Port

if (-not $SkipBuild) {
  Write-Host "[sandbox] running build..."
  Push-Location $projectRoot
  try {
    $buildOk = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
      npm run build
      if ($LASTEXITCODE -eq 0) {
        $buildOk = $true
        break
      }
      Write-Warning "[sandbox] build attempt $attempt failed (exit $LASTEXITCODE). Retrying..."
      Start-Sleep -Milliseconds 700
    }
    if (-not $buildOk) {
      throw "build_failed_exit_code_$LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

if (Test-Path $logPath) {
  Remove-Item $logPath -Force
}
if (Test-Path $errLogPath) {
  Remove-Item $errLogPath -Force
}

$startCommand = "Set-Location '$projectRoot'; npm run start:local"
Write-Host "[sandbox] starting local server..."
$proc = Start-Process -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-Command", $startCommand) `
  -PassThru `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logPath `
  -RedirectStandardError $errLogPath

Write-Host "[sandbox] server PID: $($proc.Id)"
Write-Host "[sandbox] waiting for healthcheck..."

$healthUrl = "http://localhost:$Port$HealthPath"
$healthy = $false
for ($i = 0; $i -lt $startupTimeoutSec; $i++) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -Method GET -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $healthy = $true
      break
    }
  } catch {
    # keep retrying
  }
}

if (-not $healthy) {
  Write-Error "[sandbox] healthcheck failed at $healthUrl. Check log: $logPath"
  exit 1
}

Write-Host "[sandbox] healthcheck OK: $healthUrl"
Write-Host "[sandbox] open: http://localhost:$Port"
Write-Host "[sandbox] log: $logPath"
Write-Host "[sandbox] err log: $errLogPath"
