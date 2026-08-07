# Restart the Vite dev server + ngrok tunnel with one command.
#   powershell -ExecutionPolicy Bypass -File scripts/dev-tunnel.ps1
# or:  npm run tunnel
#
# Stops any running Vite/ngrok, then relaunches both in their own windows.

$ErrorActionPreference = 'SilentlyContinue'

$Port   = 5173
$Domain = 'obsessive-starship-matter.ngrok-free.dev'
$Root   = Split-Path -Parent $PSScriptRoot

Write-Host '==> Stopping existing Vite + ngrok...' -ForegroundColor Cyan

# Kill the Vite dev server (node process whose command line mentions vite).
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*vite*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host "    stopped vite (pid $($_.ProcessId))" }

# Kill any ngrok tunnels.
Get-Process ngrok | ForEach-Object { Stop-Process -Id $_.Id -Force; Write-Host "    stopped ngrok (pid $($_.Id))" }

Start-Sleep -Seconds 1

Write-Host '==> Starting Vite dev server...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command', "Set-Location '$Root'; npm run dev"
) -WindowStyle Normal

# Wait for the dev server to be listening before opening the tunnel.
Write-Host "    waiting for http://127.0.0.1:$Port ..." -NoNewline
for ($i = 0; $i -lt 30; $i++) {
  if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { break }
  Start-Sleep -Milliseconds 500
  Write-Host '.' -NoNewline
}
Write-Host ' up.'

Write-Host '==> Starting ngrok tunnel...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command', "ngrok http --url=https://$Domain $Port"
) -WindowStyle Normal

Write-Host ''
Write-Host '  Live URL : ' -NoNewline; Write-Host "https://$Domain" -ForegroundColor Green
Write-Host '  Admin    : ' -NoNewline; Write-Host "https://$Domain/admin" -ForegroundColor Green
Write-Host '  Inspector: http://127.0.0.1:4040'
Write-Host ''
Write-Host '  (Two new windows opened — Vite and ngrok. Close them to stop.)' -ForegroundColor DarkGray
