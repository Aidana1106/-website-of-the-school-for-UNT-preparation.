@echo off
cd /d "%~dp0.."
node scripts\migrate-ent-subject.js
pause

