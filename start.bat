@echo off
echo.
echo ============================================
echo   FREE Agent - Quick Start
echo ============================================
echo.
echo   1. Browser mode  (Frontend + API)
echo   2. Electron mode (Desktop App)
echo   3. Full mode     (Frontend + API + LLM)
echo.
set /p choice=Choose (1/2/3, default=3): 

if "%choice%"=="1" goto browser
if "%choice%"=="2" goto electron

:full
echo.
echo [START] Full mode: Frontend + API + LLM
echo.
cd /d "%~dp0frontend"
call npm run dev
goto end

:browser
echo.
echo [START] Browser mode: Frontend + API
echo.
cd /d "%~dp0frontend"
call npx concurrently --names "API,UI" --prefix-colors "blue,green" "npm run dev:server" "npm run dev:renderer"
goto end

:electron
echo.
echo [START] Electron desktop mode
echo.
cd /d "%~dp0frontend"
call npm run electron:dev
goto end

:end
pause
