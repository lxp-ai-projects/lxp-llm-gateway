$ErrorActionPreference = 'Stop'

$ports = 3001, 3002, 3003
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $ports } |
  Sort-Object LocalPort -Unique

if (-not $listeners) {
  Write-Host 'No dev ports are currently in use.'
  exit 0
}

Write-Host 'Stopping local dev listeners:'

foreach ($listener in $listeners) {
  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  $processName = if ($process) { $process.ProcessName } else { 'unknown' }

  Write-Host ("- port {0}: PID {1} ({2})" -f $listener.LocalPort, $listener.OwningProcess, $processName)

  if ($process) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
  }
}

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  $remainingListeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $ports }

  if (-not $remainingListeners) {
    break
  }

  Start-Sleep -Milliseconds 250
}

$stillBound = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $ports } |
  Sort-Object LocalPort -Unique

if ($stillBound) {
  Write-Error (
    'Some dev ports are still in use: ' +
    (($stillBound | ForEach-Object { $_.LocalPort }) -join ', ')
  )
}

Write-Host 'Dev ports 3001, 3002, and 3003 have been cleared.'
