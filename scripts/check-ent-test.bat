@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo ========================================
echo ПРОВЕРКА ЕНТ ТЕСТА
echo ========================================
echo.
node scripts\check-ent-test.js
pause

