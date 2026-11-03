@echo off
title Layam Studio - Django Backend Server
echo ============================================================
echo   Layam Studio - Starting Django Backend Server (Port 8000)
echo ============================================================
echo.
cd /d "E:\Smart_Studio_Website\backend"
if exist .\.venv\Scripts\activate.bat (
    call .\.venv\Scripts\activate.bat
    python manage.py runserver 127.0.0.1:8000
) else (
    echo [ERROR] Virtual environment not found at E:\Smart_Studio_Website\backend\.venv
    pause
)

