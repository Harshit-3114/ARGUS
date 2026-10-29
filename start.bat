@echo off
setlocal
title ARGUS Launcher
cd /d "%~dp0"

rem ------------------------------------------------------------------
rem  ARGUS start file: bootstraps the venv, installs dependencies
rem  once, starts the Flask server in a visible console window and
rem  opens the browser. Close the server window to stop the system.
rem ------------------------------------------------------------------

if not exist ".venv\Scripts\python.exe" (
    echo [argus] Creating virtual environment .venv ...
    python -m venv .venv || goto :error
)

if not exist ".venv\.installed" (
    echo [argus] Installing dependencies - this can take a few minutes...
    ".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
    ".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt || goto :error
    type nul > ".venv\.installed"
)

echo [argus] Server starting on http://127.0.0.1:5000 ...
start "ARGUS Server" cmd /c "title ARGUS Server && .venv\Scripts\python.exe app.py"

rem give the dev server a moment, then open the UI
timeout /t 5 /nobreak >nul
start http://127.0.0.1:5000
echo [argus] Browser opened. Close the "ARGUS Server" window to stop.
echo [argus] Admin dashboard: http://127.0.0.1:5000/admin  (default PIN: admin123)
exit /b 0

:error
echo [argus] Setup failed. See the messages above.
pause
exit /b 1
