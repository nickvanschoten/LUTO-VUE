@echo off
setlocal

echo ==============================================
echo LUTO2 Dual-Stack Dashboard Launcher
echo ==============================================

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please download and install Python from: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please download and install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Python and Node.js are installed.

:: Install Phase - UI
echo Installing frontend dependencies...
cd luto2_ui
if not exist "node_modules\" (
    call npm install
) else (
    echo node_modules folder exists, skipping npm install.
)
cd ..

:: Install Phase - API
echo Installing backend dependencies...
cd luto2_api
call pip install -r requirements.txt
cd ..

:: Cleanup Phase - UI Cache
echo Cleaning up Next.js cache...
if exist "luto2_ui\.next\cache" (
    rmdir /s /q "luto2_ui\.next\cache"
    echo [OK] Next.js cache removed successfully.
)

:: Launch Phase (Concurrent)
echo Starting FastAPI Backend (Port 8000)...
start "LUTO2 FastAPI Server" cmd /k "cd luto2_api && uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting Next.js Frontend (Port 3000)...
start "LUTO2 Next.js Server" cmd /k "cd luto2_ui && npm run dev"

:: Wait a brief moment for servers to spin up
timeout /t 5 >nul

:: Browser Launch
echo Opening Dashboard in your default browser...
start http://localhost:3000

echo Both servers are running in separate windows. Close this window when you're done, but remember to close the server windows to stop the servers!
pause
