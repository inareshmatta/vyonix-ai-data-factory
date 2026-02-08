@echo off
title Vyonix Studio Launcher

echo ==================================================
echo   Starting Vyonix Studio
echo ==================================================

cd apps\web

echo [1/3] Checking dependencies...
call npm install

echo [2/3] Starting Development Server...
echo The app will be available at http://localhost:3000
echo.

:: Start the dev server in background
start /b npm run dev

echo [3/3] Waiting for server to start...
timeout /t 10 /nobreak >nul

:: Open browser to the correct localhost URL (NOT a file path)
start "" "http://localhost:3000/landing-page/modern-landing.html"

echo.
echo Server is running. Press any key to stop...
pause >nul

:: Kill any node processes when done
taskkill /f /im node.exe >nul 2>&1
