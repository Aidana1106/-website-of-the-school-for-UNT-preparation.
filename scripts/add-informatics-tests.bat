@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo ========================================
echo ДОБАВЛЕНИЕ ТЕСТОВ ПО ИНФОРМАТИКЕ
echo ========================================
echo.
echo Будет добавлено:
echo   - 20 тестов по Информатике
echo   - От учителя: Асанали (doshasoft@hotmail.com)
echo   - Каждый тест содержит 10 вопросов
echo   - Всего: 200 вопросов
echo.
pause
node scripts\add-informatics-tests.js
pause

