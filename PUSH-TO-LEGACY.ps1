# Run this script from the extracted handoff ZIP on Legacy's Windows computer.
# It clones a fresh main branch, copies only source files, verifies the build,
# and asks for Git identity locally before pushing. It does not copy secrets.
$ErrorActionPreference = 'Stop'
$Source = $PSScriptRoot
$Remote = 'https://github.com/legacyrealestate/legacyos.git'
$ReviewedMain = '0e2bf135b157168339e7e729f296dde81c8469b6'
$Destination = Join-Path ([Environment]::GetFolderPath('Desktop')) ('LegacyOS-GitHub-Handoff-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

function Run([string]$Executable, [string[]]$Arguments) {
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Executable failed (exit code $LASTEXITCODE). Nothing was pushed."
  }
}

$Git = Get-Command git.exe -ErrorAction SilentlyContinue
$Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $Git) { throw 'Git for Windows is not on PATH. Install it, close PowerShell, open a new window, and rerun this script.' }
if (-not $Npm) { throw 'Node.js/npm is not on PATH. Install Node.js LTS, close PowerShell, open a new window, and rerun this script.' }
if (-not (Test-Path -LiteralPath (Join-Path $Source 'package.json'))) {
  throw 'Run the script from inside the extracted legacyos-main folder.'
}
if (Test-Path -LiteralPath $Destination) { throw "Destination already exists: $Destination" }

Write-Host 'Cloning Legacy GitHub main into a new Desktop folder...'
Run $Git.Source @('clone', '--branch', 'main', '--single-branch', $Remote, $Destination)
Set-Location -LiteralPath $Destination
$ActualRemote = (& $Git.Source remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $ActualRemote -ne $Remote) { throw 'Clone remote did not match the Legacy repository.' }
$ActualMain = (& $Git.Source rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $ActualMain -ne $ReviewedMain) {
  throw "GitHub main changed since this ZIP was reviewed ($ActualMain). Stop: do not overwrite newer work with an older ZIP. Ask for an updated handoff."
}

$SourceItems = @(
  'app', 'lib', 'public', 'supabase', 'tests', '.env.example', '.gitignore',
  'AGENTS.md', 'CLAUDE.md', 'DEPLOYMENT.md', 'README.md', 'HANDOFF-LEGACY.md',
  'PUSH-TO-LEGACY.ps1', 'eslint.config.mjs', 'next.config.ts',
  'package.json', 'package-lock.json', 'postcss.config.mjs', 'proxy.ts',
  'tsconfig.json', 'vercel.json'
)
foreach ($Name in $SourceItems) {
  $From = Join-Path $Source $Name
  $To = Join-Path $Destination $Name
  if (-not (Test-Path -LiteralPath $From)) { throw "ZIP is missing $Name" }
  if ((Get-Item -LiteralPath $From).PSIsContainer) {
    New-Item -ItemType Directory -Path $To -Force | Out-Null
    & robocopy.exe $From $To /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Could not safely copy $Name. Nothing was pushed." }
  } else {
    Copy-Item -LiteralPath $From -Destination $To -Force
  }
}

Write-Host 'Checking dependencies, tests, lint, and production build...'
Run $Npm.Source @('ci')
Run $Npm.Source @('test')
Run $Npm.Source @('run', 'lint')
Run $Npm.Source @('run', 'build')

Run $Git.Source @('add', '--', 'app', 'lib', 'public', 'supabase', 'tests', '.env.example', '.gitignore', 'AGENTS.md', 'CLAUDE.md', 'DEPLOYMENT.md', 'README.md', 'HANDOFF-LEGACY.md', 'PUSH-TO-LEGACY.ps1', 'eslint.config.mjs', 'next.config.ts', 'package.json', 'package-lock.json', 'postcss.config.mjs', 'proxy.ts', 'tsconfig.json', 'vercel.json')
& $Git.Source diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host 'GitHub main already contains this source; no push needed.'
  exit 0
}
if ($LASTEXITCODE -ne 1) { throw 'Could not inspect staged changes.' }

$Name = ([string](& $Git.Source config user.name)).Trim()
$Email = ([string](& $Git.Source config user.email)).Trim()
if (-not $Name) { $Name = Read-Host 'Your Git commit name (e.g. Legacy Real Estate)' }
if (-not $Email) { $Email = Read-Host 'Your GitHub verified email for commits' }
if (-not $Name -or $Email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
  throw 'A valid commit name and email are required. Nothing was pushed.'
}
Run $Git.Source @('config', '--local', 'user.name', $Name)
Run $Git.Source @('config', '--local', 'user.email', $Email)
Write-Host 'Staged change summary:'
Run $Git.Source @('diff', '--cached', '--stat')
$Confirmation = Read-Host 'Push these changes to legacyrealestate/legacyos main? Type PUSH to confirm'
if ($Confirmation -cne 'PUSH') { Write-Host "Stopped without pushing. Working copy: $Destination"; exit 0 }
Run $Git.Source @('commit', '-m', 'Fix Outlook lead intake and staff reply handoff')
Run $Git.Source @('push', 'origin', 'main')
Write-Host "Pushed successfully. Working copy: $Destination"
Write-Host 'Check Legacy Vercel Deployments for the new production build; finish HANDOFF-LEGACY.md.'
