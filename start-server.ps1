# Запуск сервера ENT-Bilim
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath
Write-Host "Запуск сервера..." -ForegroundColor Green
node server.js

