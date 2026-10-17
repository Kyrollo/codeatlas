@echo off
title CodeAtlas - AST Symbol Graph RAG
cls
echo ========================================================
echo       CodeAtlas - AST Symbol Graph RAG & Code Search
echo ========================================================
echo.
echo [1/3] Checking dependencies...
python -c "import uvicorn, fastapi" 2>nul || pip install fastapi uvicorn
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo [2/3] Starting Backend API (Port 8004)...
start "CodeAtlas API (Port 8004)" cmd /k "cd /d %~dp0backend && python -m uvicorn src.codeatlas.main:app --port 8004 --reload"

echo [3/3] Starting Frontend UI (Port 3004)...
start "CodeAtlas UI (Port 3004)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:3004
echo.
echo CodeAtlas is running!
echo   Frontend : http://localhost:3004
echo   Backend  : http://localhost:8004/docs
echo.
echo Press any key to stop all CodeAtlas processes...
pause >nul
taskkill /fi "WINDOWTITLE eq CodeAtlas API*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq CodeAtlas UI*" /f >nul 2>&1
echo Done.
