$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$bundledNode = Join-Path $runtimeRoot "node\bin"
$bundledPnpm = Join-Path $runtimeRoot "bin\fallback\pnpm.cmd"

Set-Location -LiteralPath $projectRoot

if (Test-Path -LiteralPath $bundledPnpm) {
  $env:PATH = "$bundledNode;$env:PATH"
  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    & $bundledPnpm install
  }
  & $bundledPnpm run dev
  exit $LASTEXITCODE
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
    npm install
  }
  npm run dev
  exit $LASTEXITCODE
}

Write-Error "Node.js is required. Install Node.js 22 or run this project from Codex."
