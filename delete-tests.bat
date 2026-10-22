@echo off
chcp 65001 >nul
cd /d "%~dp0"
node delete-tests.js
pause






