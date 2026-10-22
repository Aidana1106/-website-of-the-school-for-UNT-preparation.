@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo ========================================
echo ДОБАВЛЕНИЕ ТЕСТОВ ПО МАТЕМАТИКЕ
echo ========================================
echo.
echo Будет добавлено:
echo   - 20 тестов по Математике
echo   - От учителя: Айдана (blymgordo@gmail.com)
echo   - Каждый тест содержит 10 вопросов
echo   - Всего: 200 вопросов
echo.
pause
node scripts\add-mathematics-tests.js
pause

