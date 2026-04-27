@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
TITLE LUTO-VUE — Development Server

REM ════════════════════════════════════════════════════════════════════
REM  LUTO-VUE  │  Developer Launcher
REM  ─────────────────────────────────────────────────────────────────
REM  Starts both the FastAPI backend (port 8000) and the Next.js
REM  frontend (port 3000) in separate console windows.
REM
REM  REQUIREMENTS (one-time setup on this machine):
REM    • Node.js 18+  →  https://nodejs.org/en/download
REM    • Python 3.9+  →  https://www.python.org/downloads
REM
REM  DATA:
REM    Place LUTO2 model outputs in ./data/ before starting.
REM    Set LUTO2_DATA_ROOT environment variable to override path.
REM ════════════════════════════════════════════════════════════════════

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        LUTO-VUE  –  Development Launcher         ║
echo  ╚══════════════════════════════════════════════════╝
echo.

SET SCRIPT_DIR=%~dp0
REM Remove trailing backslash for cleaner path joins
SET SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
SET API_DIR=%SCRIPT_DIR%\luto2_api
SET UI_DIR=%SCRIPT_DIR%\luto2_ui

REM ── 1. Check Node.js ────────────────────────────────────────────────
where node >nul 2>&1
IF ERRORLEVEL 1 (
    echo  [ERROR] Node.js was not found on this machine.
    echo.
    echo  Install it from: https://nodejs.org/en/download
    echo  Then re-run this script.
    goto :FAIL
)
FOR /F "tokens=*" %%v IN ('node --version 2^>^&1') DO SET NODE_VER=%%v
echo  [OK] Node.js !NODE_VER!

REM ── 2. Check Python ─────────────────────────────────────────────────
where python >nul 2>&1
IF ERRORLEVEL 1 (
    echo  [ERROR] Python was not found on this machine.
    echo.
    echo  Install it from: https://www.python.org/downloads
    echo  Then re-run this script.
    goto :FAIL
)
FOR /F "tokens=*" %%v IN ('python --version 2^>^&1') DO SET PY_VER=%%v
echo  [OK] !PY_VER!

REM ── 3. Install API dependencies if missing ───────────────────────────
python -c "import uvicorn" >nul 2>&1
IF ERRORLEVEL 1 (
    echo.
    echo  [INFO] FastAPI dependencies not found.
    echo         Installing from luto2_api/pyproject.toml — please wait...
    pip install -e "%API_DIR%"
    IF ERRORLEVEL 1 (
        echo.
        echo  [ERROR] pip install failed.
        echo  Check your Python environment and internet connection.
        goto :FAIL
    )
    echo  [OK] API dependencies installed.
) ELSE (
    echo  [OK] FastAPI dependencies already installed.
)

REM ── 4. Install frontend dependencies if missing ──────────────────────
IF NOT EXIST "%UI_DIR%\node_modules\" (
    echo.
    echo  [INFO] Node modules not found — running npm install...
    echo         This may take a few minutes on first run.
    pushd "%UI_DIR%"
    call npm install
    SET NPM_ERR=!ERRORLEVEL!
    popd
    IF !NPM_ERR! NEQ 0 (
        echo.
        echo  [ERROR] npm install failed.
        goto :FAIL
    )
    echo  [OK] Frontend dependencies installed.
) ELSE (
    echo  [OK] Frontend node_modules already present.
)

REM ── 5. Launch FastAPI backend in a new window ────────────────────────
echo.
echo  [INFO] Starting FastAPI backend on http://localhost:8000 ...
pushd "%API_DIR%"
start "LUTO-VUE  |  API  (port 8000)" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
popd

REM Give the API a moment to bind before the browser hits it
timeout /t 3 /nobreak >nul

REM ── 6. Launch Next.js frontend in a new window ───────────────────────
echo  [INFO] Starting Next.js frontend on http://localhost:3000 ...
pushd "%UI_DIR%"
start "LUTO-VUE  |  UI  (port 3000)" cmd /k "npm run dev"
popd

REM ── 7. Done ──────────────────────────────────────────────────────────
echo.
echo  ════════════════════════════════════════════════════════
echo   Both servers are starting in separate console windows.
echo.
echo   Dashboard  →  http://localhost:3000
echo   API docs   →  http://localhost:8000/docs
echo.
echo   To stop: close the two console windows (or Ctrl+C in each).
echo  ════════════════════════════════════════════════════════
echo.
goto :END

:FAIL
echo.
echo  ─────────────────────────────────────────────────────────
echo  Startup failed. Review the error above and try again.
echo  ─────────────────────────────────────────────────────────
echo.
pause
exit /b 1

:END
echo  This window can be closed safely.
pause
ENDLOCAL
