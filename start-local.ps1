$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location -LiteralPath $projectRoot

if (Get-Command npm -ErrorAction SilentlyContinue) {
  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    npm ci
  }
  npm run dev
  exit $LASTEXITCODE
}

Write-Error "Node.js 22 or newer with npm is required."
