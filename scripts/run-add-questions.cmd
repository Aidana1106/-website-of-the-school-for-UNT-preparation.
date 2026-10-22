@echo off
chcp 65001 >nul
cd /d "%~dp0.."
node scripts\add-ent-questions.js
pause

