@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
TITLE LUTO-VUE — Development Server

REM ════════════════════════════════════════════════════════════════════
REM  LUTO-VUE  │  Developer Launcher
REM  ─────────────────────────────────────────────────────────────────
REM  Starts both the FastAPI backend (port 8000) and
REM  the Next.js frontend (port 3000) for local development.
REM
REM  REQUIREMENTS:
REM    • Node.js 18+    →  https://nodejs.org/en/download
REM    • Python 3.9+    →  https://www.python.org/downloads
REM    • pip install -e luto2_api   (first run only)
REM ════════════════════════════════════════════════════════════════════

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        LUTO-VUE  –  Development Launcher         ║
echo  ╚══════════════════════════════════════════════════╝
echo.

SET SCRIPT_DIR=%~dp0
SET API_DIR=%SCRIPT_DIR%luto2_api
SET UI_DIR=%SCRIPT_DIR%luto2_ui

REM ── Check Node.js ────────────────────────────────────────────────────
where node >nul 2>&1
IF ERRORLEVEL 1 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    goto :FAIL
)
FOR /F "tokens=*" %%v IN ('node --version') DO SET NODE_VER=%%v
echo  [OK] Node.js: !NODE_VER!

REM ── Check Python ─────────────────────────────────────────────────────
where python >nul 2>&1
IF ERRORLEVEL 1 (
    echo  [ERROR] Python not found. Install from https://www.python.org
    goto :FAIL
)
FOR /F "tokens=*" %%v IN ('python --version') DO SET PY_VER=%%v
echo  [OK] !PY_VER!

REM ── Check uvicorn is available ────────────────────────────────────────
python -c "import uvicorn" >nul 2>&1
IF ERRORLEVEL 1 (
    echo.
    echo  [INFO] uvicorn not found — installing API dependencies...
    pip install -e "%API_DIR%" --quiet
    IF ERRORLEVEL 1 (
        echo  [ERROR] pip install failed. Check your Python environment.
        goto :FAIL
    )
    echo  [OK] API dependencies installed.
)

REM ── Check Next.js node_modules ───────────────────────────────────────
IF NOT EXIST "%UI_DIR%\node_modules\" (
    echo.
    echo  [INFO] node_modules missing — running npm install...
    pushd "%UI_DIR%"
    call npm install --silent
    popd
    IF ERRORLEVEL 1 (
        echo  [ERROR] npm install failed.
        goto :FAIL
    )
    echo  [OK] UI dependencies installed.
)

REM ── Launch FastAPI backend in a new window ────────────────────────────
echo.
echo  [INFO] Starting FastAPI backend on http://localhost:8000 ...
start "LUTO-VUE API (port 8000)" cmd /k "cd /D "%API_DIR%" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM Give the API a moment to bind before the UI tries to fetch
timeout /t 3 /nobreak > nul

REM ── Launch Next.js frontend in a new window ───────────────────────────
echo  [INFO] Starting Next.js frontend on http://localhost:3000 ...
start "LUTO-VUE UI (port 3000)" cmd /k "cd /D "%UI_DIR%" && npm run dev"

REM ── Done ─────────────────────────────────────────────────────────────
echo.
echo  ════════════════════════════════════════════════════════
echo   Both servers are starting in separate windows.
echo.
echo   Frontend  →  http://localhost:3000
echo   API docs  →  http://localhost:8000/docs
echo.
echo   Close those windows (or press Ctrl+C in each) to stop.
echo  ════════════════════════════════════════════════════════
echo.
goto :END

:FAIL
echo.
echo  Press any key to close...
pause > nul
exit /b 1

:END
echo  This window can be closed safely.
pause > nul
ENDLOCAL
