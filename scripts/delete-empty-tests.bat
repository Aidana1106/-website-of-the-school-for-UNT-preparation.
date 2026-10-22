@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo ========================================
echo УДАЛЕНИЕ ТЕСТОВ БЕЗ ВОПРОСОВ
echo ========================================
echo.
echo Этот скрипт найдет и удалит все тесты,
echo у которых нет вопросов.
echo.
pause
node scripts\delete-empty-tests.js
pause

