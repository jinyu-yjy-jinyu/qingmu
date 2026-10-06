<#
.SYNOPSIS
  Remove every installed copy of 轻幕 so a fresh install starts clean.

.DESCRIPTION
  历史原因:项目曾同时分发 NSIS 与 WiX(MSI) 两种安装包。二者通过不同机制登记
  卸载项,彼此不可见,导致系统里出现多个「轻幕」,新包装不上旧版。

  本脚本枚举注册表中所有卸载项,逐个静默卸载,并做兜底清理,保证系统内
  只剩一个「轻幕」(或完全没有)。

  用法:
    powershell -ExecutionPolicy Bypass -File scripts\uninstall-all.ps1
    powershell -ExecutionPolicy Bypass -File scripts\uninstall-all.ps1 -DryRun
#>
[CmdletBinding()]
param([switch]$DryRun)

$ErrorActionPreference = 'Continue'
$appName = '轻幕'
$exeName = 'lightcurtain.exe'
$uninstallRoots = @(
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)

function Write-Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "    [ok]   $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "    [warn] $m" -ForegroundColor Yellow }

# ---- 1. Collect uninstall entries -------------------------------------
Write-Step "Scanning installed copies of '$appName'"
$entries = @()
foreach ($root in $uninstallRoots) {
  Get-ItemProperty $root -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*$appName*" } |
    ForEach-Object { $entries += $_ }
}

if ($entries.Count -eq 0) {
  Write-Ok "No installed copy found — nothing to do."
  exit 0
}

Write-Host "    found $($entries.Count) installed copy/copies:" -ForegroundColor DarkGray
foreach ($e in $entries) {
  Write-Host "      - $($e.DisplayVersion)  [$($e.PSChildName)]" -ForegroundColor DarkGray
}

if ($DryRun) {
  Write-Step "Dry run — no changes made."
  exit 0
}

# ---- 2. Uninstall each ------------------------------------------------
foreach ($e in $entries) {
  $cmd = $e.UninstallString
  if (-not $cmd) {
    Write-Warn "no UninstallString for [$($e.PSChildName)] — removing registry key only"
    Remove-Item -LiteralPath $e.PSPath -Recurse -Force -ErrorAction SilentlyContinue
    continue
  }

  Write-Step "Uninstalling $($e.DisplayVersion) [$($e.PSChildName)]"

  if ($cmd -match 'MsiExec\.exe') {
    # MSI: /x quietly, /qn no UI. Guard against self-invocation.
    $productCode = $e.PSChildName
    if ($productCode -notmatch '^\{[0-9A-Fa-f-]+\}$') { continue }
    $args = "/x $productCode /qn /norestart"
    Write-Host "    msiexec $args"
    $p = Start-Process -FilePath 'msiexec.exe' -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
    if ($p.ExitCode -eq 0) { Write-Ok "msiexec exit 0" }
    elseif ($p.ExitCode -eq 1605) { Write-Ok "not installed (1605) — already gone" }
    else { Write-Warn "msiexec exit $($p.ExitCode)" }
  }
  else {
    # NSIS / Inno: "<path>" /S  (or /VERYSILENT)
    $path = [regex]::Match($cmd, '^"([^"]+)"').Groups[1].Value
    if (-not $path) { $path = [regex]::Match($cmd, '^(\S+)').Groups[1].Value }
    if (-not $path -or -not (Test-Path -LiteralPath $path)) {
      Write-Warn "uninstaller not found: $path — removing registry key only"
      Remove-Item -LiteralPath $e.PSPath -Recurse -Force -ErrorAction SilentlyContinue
      continue
    }
    $p = Start-Process -FilePath $path -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
    Start-Sleep -Milliseconds 500
    if ($p.ExitCode -eq 0) { Write-Ok "uninstaller exit 0" } else { Write-Warn "uninstaller exit $($p.ExitCode)" }
  }
}

# ---- 3. Fallback: residual keys / dirs --------------------------------
Start-Sleep -Seconds 1
Write-Step 'Cleaning leftovers'

foreach ($root in $uninstallRoots) {
  Get-ItemProperty $root -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*$appName*" } |
    ForEach-Object {
      Write-Warn "residual entry $($_.PSChildName) — removing"
      Remove-Item -LiteralPath $_.PSPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$leftoverDirs = @(
  (Join-Path $env:LOCALAPPDATA $appName),
  (Join-Path $env:APPDATA $appName),
  (Join-Path $env:LOCALAPPDATA "$appName.exe")
)
foreach ($d in $leftoverDirs) {
  if (Test-Path -LiteralPath $d) {
    Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $d) { Write-Warn "could not remove $d" } else { Write-Ok "removed $d" }
  }
}

# ---- 4. Verify --------------------------------------------------------
Write-Step 'Verifying'
$remaining = @()
foreach ($root in $uninstallRoots) {
  Get-ItemProperty $root -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "*$appName*" } |
    ForEach-Object { $remaining += $_ }
}

if ($remaining.Count -eq 0) {
  Write-Ok "Clean — no '$appName' entry left in the registry."
  exit 0
}

Write-Warn "$($remaining.Count) entr(y/ies) still present:"
foreach ($r in $remaining) { Write-Host "      - $($r.DisplayVersion) [$($r.PSChildName)]" -ForegroundColor DarkGray }
exit 1
