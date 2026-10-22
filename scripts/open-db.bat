@echo off
echo Открытие базы данных...
cd /d "%~dp0.."
node scripts\view-db.js
pause

