@echo off
title Annotate.ai Launcher

echo ==================================================
echo   Starting Annotate.ai Audio Studio
echo ==================================================

cd apps\web

echo [1/3] Checking dependencies...
call npm install

echo [2/3] Launching Browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000/audio

echo [3/3] Starting Development Server...
echo The app will be available at http://localhost:3000/audio
echo Press Ctrl+C to stop the server.
echo.

npm run dev
pause
