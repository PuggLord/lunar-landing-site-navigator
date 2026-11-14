# Prints deck/index.html to deck/Lunar-Landing-Site-Navigator.pdf, one slide per page.
#
# SI disclosure: this script was written with an AI coding tool (Claude Code,
# Anthropic) during the 2026 NASA Space Apps Challenge, Nov 14-15, 2026,
# directed and reviewed by team Ksig UNT. See SI_USE.md.
#
# Needs a Chromium browser. Pass its path if it is not Brave, Chrome or Edge
# in the usual place:
#
#     powershell -File tools/build_deck_pdf.ps1 [-Browser path\to\browser.exe]
param([string]$Browser = '')

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $Browser) {
  $Browser = @(
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $Browser) { throw 'No Chromium browser found. Pass -Browser.' }

$out = Join-Path $root 'deck\Lunar-Landing-Site-Navigator.pdf'
$url = 'file:///' + ((Join-Path $root 'deck\index.html') -replace '\\', '/')
$profile = Join-Path ([IO.Path]::GetTempPath()) 'llsn-deck-profile'
if (Test-Path $out) { Remove-Item $out }

$flags = @('--headless=new', '--no-first-run', "--user-data-dir=$profile",
  '--no-pdf-header-footer', "--print-to-pdf=$out", $url)
$p = Start-Process -FilePath $Browser -ArgumentList $flags -PassThru -WindowStyle Hidden
if (-not $p.WaitForExit(60000)) { $p.Kill(); throw 'The browser did not finish in 60 seconds.' }
if (-not (Test-Path $out)) { throw 'No PDF was written.' }
"wrote $out ($([Math]::Round((Get-Item $out).Length / 1MB, 1)) MB)"
