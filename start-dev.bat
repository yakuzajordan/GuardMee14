@echo off
set PATH=C:\Program Files\nodejs;%PATH%

if not exist "node_modules\" (
    echo Installation des dependances frontend...
    call npm install
)

if not exist "backend\node_modules\" (
    echo Installation des dependances backend...
    call npm install --prefix backend
)

echo.
echo ==============================================
echo   Demarrage de GuardMee (Frontend + Backend)
echo ==============================================
echo.
start "GuardMee API" cmd /k "cd /d %~dp0backend && npm run dev"
call npm run dev
