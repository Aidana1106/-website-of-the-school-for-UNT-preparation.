@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo ОБНОВЛЕНИЕ ЕНТ ТЕСТА НА КАЗАХСКИЙ
echo ========================================
echo.
node update-ent-test-kz.js
pause

