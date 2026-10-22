@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo Создание админа...
node scripts\create-admin.js
pause

