$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ClientDir = Join-Path $RepoRoot "client"
$AdminDir = Join-Path $RepoRoot "admin"
$H5BuildDir = Join-Path $ClientDir "dist\build\h5"
$AdminBuildDir = Join-Path $AdminDir "dist"
$AdminTargetDir = Join-Path $H5BuildDir "admin"
$UnifiedBuildDir = Join-Path $RepoRoot "dist\web"

function Assert-ChildPath($Path, $Parent, $Name) {
  $resolvedParent = [System.IO.Path]::GetFullPath($Parent)
  $resolvedPath = [System.IO.Path]::GetFullPath($Path)
  if (-not $resolvedPath.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "$Name is outside repository: $resolvedPath"
  }
}

Write-Host "==> Building H5 frontend" -ForegroundColor Cyan
Push-Location $ClientDir
try {
  npm run build:h5
} finally {
  Pop-Location
}

Write-Host "==> Building admin frontend" -ForegroundColor Cyan
Push-Location $AdminDir
try {
  npm run build
} finally {
  Pop-Location
}

if (-not (Test-Path $H5BuildDir)) {
  throw "H5 build folder not found: $H5BuildDir"
}
if (-not (Test-Path $AdminBuildDir)) {
  throw "Admin build folder not found: $AdminBuildDir"
}

Write-Host "==> Merging admin into H5 /admin" -ForegroundColor Cyan
Assert-ChildPath $AdminTargetDir $H5BuildDir "Admin target"
if (Test-Path $AdminTargetDir) {
  Remove-Item -LiteralPath $AdminTargetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $AdminTargetDir | Out-Null
Copy-Item -Path (Join-Path $AdminBuildDir "*") -Destination $AdminTargetDir -Recurse -Force

Write-Host "==> Creating unified web package" -ForegroundColor Cyan
Assert-ChildPath $UnifiedBuildDir $RepoRoot "Unified build folder"
if (Test-Path $UnifiedBuildDir) {
  Remove-Item -LiteralPath $UnifiedBuildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $UnifiedBuildDir | Out-Null
Copy-Item -Path (Join-Path $H5BuildDir "*") -Destination $UnifiedBuildDir -Recurse -Force

Write-Host "Done: $UnifiedBuildDir" -ForegroundColor Green
Write-Host "Client entry: $UnifiedBuildDir\index.html" -ForegroundColor Green
Write-Host "Admin entry: $UnifiedBuildDir\admin\index.html" -ForegroundColor Green
