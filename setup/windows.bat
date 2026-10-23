@echo off
rem CourseMap — ดับเบิลคลิกเพื่อติดตั้ง (เรียก setup\windows.ps1)
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows.ps1"
pause
