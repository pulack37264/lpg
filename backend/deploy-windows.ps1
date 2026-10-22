<#
Deploy LPG Delivery Shop on Windows Server.
Run this script from the backend folder: .\deploy-windows.ps1
#>

param(
    [string]$EnvFile = '.\.env'
)

function Write-Notice($message) {
    Write-Host $message -ForegroundColor Cyan
}

function Write-ErrorAndExit($message) {
    Write-Host $message -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-ErrorAndExit 'Node.js is not installed or not on PATH. Install Node.js 20+ from https://nodejs.org/'
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-ErrorAndExit 'npm is not installed. Ensure Node.js installation includes npm.'
}

if (-not (Test-Path $EnvFile)) {
    Write-ErrorAndExit "Missing environment file: $EnvFile. Copy .env.example to .env and update it."
}

Write-Notice 'Installing backend dependencies...'
npm install

Write-Notice 'Starting LPG Delivery Shop...'
Write-Notice 'Press Ctrl+C to stop the server.'
npm start
