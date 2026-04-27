@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
TITLE LUTO-VUE — Build Portable Release

REM ════════════════════════════════════════════════════════════════════
REM  LUTO-VUE  │  Build Portable Release
REM  ─────────────────────────────────────────────────────────────────
REM  Double-click this file to package LUTO-VUE into a portable folder
REM  that Windows users can run WITHOUT installing anything.
REM
REM  REQUIREMENTS (build machine only):
REM    • Node.js 18 or later  →  https://nodejs.org/en/download
REM    • Internet access (to download the portable node.exe)
REM ════════════════════════════════════════════════════════════════════

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        LUTO-VUE  –  Portable Release Builder     ║
echo  ╚══════════════════════════════════════════════════╝
echo.

REM ── 1. Check Node.js is installed ───────────────────────────────────
where node >nul 2>&1
IF ERRORLEVEL 1 (
    echo  [ERROR] Node.js was not found on this machine.
    echo.
    echo  Please install Node.js first:
    echo    https://nodejs.org/en/download
    echo.
    echo  After installing, re-run this script.
    echo.
    goto :FAIL
)

FOR /F "tokens=*" %%v IN ('node --version') DO SET NODE_VER=%%v
echo  [OK] Node.js found: !NODE_VER!

REM ── 2. Move into the Next.js app folder ─────────────────────────────
REM  This script lives at the repo root; the app is in luto2_ui/
SET SCRIPT_DIR=%~dp0
SET APP_DIR=%SCRIPT_DIR%luto2_ui

IF NOT EXIST "%APP_DIR%" (
    echo.
    echo  [ERROR] Could not find the luto2_ui folder at:
    echo    %APP_DIR%
    echo.
    echo  Make sure this script is in the LUTO-VUE root directory.
    goto :FAIL
)

cd /D "%APP_DIR%"
echo  [OK] Working directory: %CD%

REM ── 3. Install dependencies if node_modules is missing ──────────────
IF NOT EXIST "node_modules\" (
    echo.
    echo  [INFO] node_modules not found — running npm install...
    echo         This may take a few minutes on first run.
    echo.
    call npm install
    IF ERRORLEVEL 1 (
        echo.
        echo  [ERROR] npm install failed. Check your internet connection.
        goto :FAIL
    )
    echo  [OK] Dependencies installed.
)

REM ── 4. Run the portable build script ────────────────────────────────
echo.
echo  ─────────────────────────────────────────────────────
echo  Starting build process...
echo  (This will take several minutes — please be patient)
echo  ─────────────────────────────────────────────────────
echo.

node build-portable.js

IF ERRORLEVEL 1 (
    echo.
    echo  ─────────────────────────────────────────────────────
    echo  [ERROR] Build failed. See the messages above for details.
    echo  ─────────────────────────────────────────────────────
    goto :FAIL
)

REM ── 5. Success ───────────────────────────────────────────────────────
echo.
echo  ════════════════════════════════════════════════════════
echo   SUCCESS!  Your portable release is ready.
echo  ════════════════════════════════════════════════════════
echo.
echo   Location:  %APP_DIR%\portable-release\
echo.
echo   To distribute to a user:
echo     1. Copy the entire  portable-release\  folder to their PC.
echo     2. Tell them to double-click  Start_LUTO_VUE.bat  inside it.
echo     3. The dashboard will open at  http://localhost:3000
echo.
echo   No installation or admin rights needed on the target machine.
echo.
goto :END

:FAIL
echo.
echo  Press any key to close this window...
pause > nul
exit /b 1

:END
echo  Press any key to close this window...
pause > nul
ENDLOCAL
