@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Face Recognition Notes - Dev Runner
echo ============================================
echo.

:: -------------------------------------------
:: Check for Python virtual environment
:: -------------------------------------------
set "VENV_PYTHON="

if exist "backend\.venv\Scripts\python.exe" (
    set "VENV_PYTHON=backend\.venv\Scripts\python.exe"
    echo [OK] Found virtual environment at backend\.venv
) else if exist "backend\venv\Scripts\python.exe" (
    set "VENV_PYTHON=backend\venv\Scripts\python.exe"
    echo [OK] Found virtual environment at backend\venv
) else (
    echo [ERROR] Python virtual environment not found.
    echo.
    echo Expected location: backend\.venv\ or backend\venv\
    echo.
    echo To create one, run:
    echo   cd backend
    echo   python -m venv .venv
    echo   .venv\Scripts\activate
    echo   pip install -r requirements.txt
    exit /b 1
)

:: -------------------------------------------
:: Check for Node.js
:: -------------------------------------------
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)
echo [OK] Node.js found

:: -------------------------------------------
:: Check for frontend/node_modules
:: -------------------------------------------
if not exist "frontend\node_modules" (
    echo [ERROR] frontend\node_modules not found.
    echo.
    echo Please install frontend dependencies:
    echo   cd frontend
    echo   npm install
    exit /b 1
)
echo [OK] frontend\node_modules found

:: -------------------------------------------
:: Check port 5000 availability
:: -------------------------------------------
netstat -an | findstr ":5000 " | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo [ERROR] Port 5000 is already in use.
    echo.
    echo Please stop the process using port 5000 and try again.
    exit /b 1
)
echo [OK] Port 5000 is available

:: -------------------------------------------
:: Check port 5173 availability
:: -------------------------------------------
netstat -an | findstr ":5173 " | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo [ERROR] Port 5173 is already in use.
    echo.
    echo Please stop the process using port 5173 and try again.
    exit /b 1
)
echo [OK] Port 5173 is available

echo.
echo ============================================
echo   Starting services...
echo ============================================
echo.

:: -------------------------------------------
:: Start Flask backend as a background process
:: -------------------------------------------
echo [STARTING] Flask backend...
start "FaceRecBackend" /b %VENV_PYTHON% backend\run.py
set BACKEND_STARTED=1

:: Give the backend a moment to initialize
timeout /t 2 /nobreak > nul

echo [RUNNING] Backend running on http://localhost:5000

:: -------------------------------------------
:: Start Vite frontend as a background process
:: -------------------------------------------
echo [STARTING] Vite frontend...
start "FaceRecFrontend" /b cmd /c "cd frontend && npm run dev"
set FRONTEND_STARTED=1

:: Give the frontend a moment to initialize
timeout /t 2 /nobreak > nul

echo [RUNNING] Frontend running on http://localhost:5173

echo.
echo ============================================
echo   All services started successfully!
echo ============================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
echo   Press Ctrl+C to stop all services.
echo ============================================
echo.

:: -------------------------------------------
:: Wait loop - Ctrl+C will break out of this
:: When the user presses Ctrl+C, batch will prompt
:: "Terminate batch job (Y/N)?" - answering Y exits
:: and we clean up via the taskkill below.
:: -------------------------------------------
:wait_loop
timeout /t 2 /nobreak > nul
goto wait_loop

:: Note: When Ctrl+C is pressed in a batch file, Windows
:: terminates child processes started with "start /b" 
:: automatically. The cleanup below handles any stragglers.

:end
echo.
echo [STOPPING] Shutting down services...

:: Kill any process listening on port 5000 (backend)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a > nul 2>&1
)

:: Kill any process listening on port 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a > nul 2>&1
)

echo [STOPPED] All services terminated.
exit /b 0
