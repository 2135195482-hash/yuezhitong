param(
  [Parameter(Mandatory = $true)]
  [string] $EnvId,

  [string] $CloudPath = "/"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$OutDir = Join-Path $Root "out"
$Index = Join-Path $OutDir "index.html"

if (-not (Test-Path -LiteralPath $Index)) {
  throw "Static output not found. Run npm.cmd run build before deploying, or use the already verified out/ directory."
}

$npx = Get-Command npx.cmd -ErrorAction Stop
& $npx.Source -p "@cloudbase/cli" tcb hosting deploy $OutDir $CloudPath --env-id $EnvId
