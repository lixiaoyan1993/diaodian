$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ClientDir = Join-Path $RepoRoot "client"
$AdminDir = Join-Path $RepoRoot "admin"

Write-Host "==> Starting H5 frontend and admin" -ForegroundColor Cyan
Write-Host "Client entry will be printed by uni/vite. Admin is available through /admin/ on the client dev server." -ForegroundColor DarkGray

$admin = $null
$adminPort = Get-NetTCPConnection -LocalPort 3777 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($adminPort) {
  Write-Host "==> Admin port 3777 is already in use; reusing it for /admin proxy." -ForegroundColor Yellow
} else {
  $admin = Start-Process -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0") `
    -WorkingDirectory $AdminDir `
    -NoNewWindow `
    -PassThru
}

try {
  Push-Location $ClientDir
  npm run dev:h5 -- --host 0.0.0.0
} finally {
  Pop-Location
  if ($admin -and -not $admin.HasExited) {
    Stop-Process -Id $admin.Id -Force
  }
}
