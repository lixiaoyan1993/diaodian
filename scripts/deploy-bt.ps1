param(
  [string]$HostName = "127.0.0.1",

  [string]$User = "root",

  [string]$RemoteRoot = "/www/wwwroot/diaodian",

  [string]$ApiBaseUrl = "",

  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($HostName)) {
  $HostName = Read-Host "Server IP"
}
if ([string]::IsNullOrWhiteSpace($User)) {
  $User = Read-Host "SSH user"
}

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command: $Name. Please install it or add it to PATH."
  }
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ClientDir = Join-Path $RepoRoot "client"
$AdminDir = Join-Path $RepoRoot "admin"
$ServerDir = Join-Path $RepoRoot "server"
$PackageDir = Join-Path $RepoRoot ".deploy"
$H5BuildDir = Join-Path $ClientDir "dist\build\h5"
$AdminBuildDir = Join-Path $AdminDir "dist"
$ServerPackageDir = Join-Path $PackageDir "server"
$H5Archive = Join-Path $PackageDir "h5.tar.gz"
$ServerArchive = Join-Path $PackageDir "server.tar.gz"
$Remote = "$User@$HostName"

Require-Command ssh
Require-Command scp
Require-Command tar
Require-Command npm

Step "Preparing package folder"
if (Test-Path $PackageDir) {
  Remove-Item -LiteralPath $PackageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $PackageDir | Out-Null

if (-not $SkipBuild) {
  Step "Building H5 frontend"
  Push-Location $ClientDir
  try {
    $env:VITE_API_BASE_URL = $ApiBaseUrl
    npm run build:h5
  } finally {
    Remove-Item Env:\VITE_API_BASE_URL -ErrorAction SilentlyContinue
    Pop-Location
  }

  Step "Building admin frontend"
  Push-Location $AdminDir
  try {
    npm install
    npm run build
  } finally {
    Pop-Location
  }

  Step "Merging admin frontend into H5 package"
  $AdminTargetDir = Join-Path $H5BuildDir "admin"
  if (Test-Path $AdminTargetDir) {
    Remove-Item -LiteralPath $AdminTargetDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $AdminTargetDir | Out-Null
  Copy-Item -Path (Join-Path $AdminBuildDir "*") -Destination $AdminTargetDir -Recurse -Force

  Step "Building Node API"
  Push-Location $ServerDir
  try {
    npm install
    npm run build
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $H5BuildDir)) {
  throw "H5 build folder not found: $H5BuildDir"
}
if (-not (Test-Path (Join-Path $ServerDir "dist\app.js"))) {
  throw "Server build not found. Run npm run build in server first."
}

Step "Packing H5 frontend"
Push-Location $H5BuildDir
try {
  tar -czf $H5Archive .
} finally {
  Pop-Location
}

Step "Packing Node API"
New-Item -ItemType Directory -Path $ServerPackageDir | Out-Null
Copy-Item -Path (Join-Path $ServerDir "dist") -Destination (Join-Path $ServerPackageDir "dist") -Recurse
Copy-Item -Path (Join-Path $ServerDir "package.json") -Destination $ServerPackageDir
Copy-Item -Path (Join-Path $ServerDir "package-lock.json") -Destination $ServerPackageDir
Copy-Item -Path (Join-Path $ServerDir "prisma") -Destination (Join-Path $ServerPackageDir "prisma") -Recurse

$EnvExample = "DATABASE_URL=mysql://diaodian:YOUR_DB_PASSWORD@127.0.0.1:3306/diaodian`nJWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_STRING`nPORT=3721`n"
Set-Content -Path (Join-Path $ServerPackageDir ".env.example") -Value $EnvExample -Encoding UTF8

Push-Location $ServerPackageDir
try {
  tar -czf $ServerArchive .
} finally {
  Pop-Location
}

Step "Creating remote folders"
ssh $Remote "mkdir -p '$RemoteRoot/h5' '$RemoteRoot/server' '$RemoteRoot/packages'"

Step "Uploading archives"
scp $H5Archive "${Remote}:$RemoteRoot/packages/h5.tar.gz"
scp $ServerArchive "${Remote}:$RemoteRoot/packages/server.tar.gz"

Step "Extracting and installing on server"
$RemoteDeployFile = Join-Path $PackageDir "remote-deploy.sh"
$RemoteDeployLines = @(
  "set -e",
  "cd '$RemoteRoot'",
  "rm -rf h5/*",
  "tar -xzf packages/h5.tar.gz -C h5",
  "rm -rf server/dist server/prisma server/package.json server/package-lock.json server/.env.example",
  "tar -xzf packages/server.tar.gz -C server",
  "cd server",
  "npm install --omit=dev",
  "if [ ! -f .env ]; then",
  "  cp .env.example .env",
  "  echo 'Created server/.env from .env.example. Please edit database password and JWT_SECRET in BaoTa.'",
  "fi",
  "echo 'Upload complete.'"
)
Set-Content -Path $RemoteDeployFile -Value $RemoteDeployLines -Encoding ASCII
scp $RemoteDeployFile "${Remote}:$RemoteRoot/packages/remote-deploy.sh"
ssh $Remote "bash '$RemoteRoot/packages/remote-deploy.sh'"

Step "Done"
Write-Host "Frontend root: $RemoteRoot/h5" -ForegroundColor Green
Write-Host "Node API root: $RemoteRoot/server" -ForegroundColor Green
Write-Host "BaoTa Node project start file: $RemoteRoot/server/dist/app.js" -ForegroundColor Green
Write-Host "BaoTa Node project port: 3721" -ForegroundColor Green
