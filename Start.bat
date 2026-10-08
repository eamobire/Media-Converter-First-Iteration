@echo off
title Media Converter
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install it from https://nodejs.org/ then try again.
  pause
  exit /b 1
)

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo WARNING: FFmpeg was not found on PATH.
  echo Install with: winget install ffmpeg
  echo Then close this window and run Start.bat again.
  echo.
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
  echo.
)

echo Starting Media Converter at http://localhost:3000
echo Keep this window open while using the app. Press Ctrl+C to stop.
echo.

start "" "http://localhost:3000"
call npm run dev

pause
