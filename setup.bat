@echo off
echo ============================================
echo AI-Orchestrated Payroll System Setup
echo ============================================
echo.

echo [1/4] Building Backend API...
dotnet build
if errorlevel 1 (
    echo ERROR: Backend build failed. Please check .NET 9.0 SDK installation.
    pause
    exit /b 1
)
echo ✅ Backend build successful
echo.

echo [2/4] Installing Frontend Dependencies...
cd payroll-frontend
call npm install
if errorlevel 1 (
    echo ERROR: Frontend dependencies installation failed. Please check Node.js installation.
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed
echo.

echo [3/4] Building Frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)
echo ✅ Frontend build successful
cd ..
echo.

echo [4/4] Setup Complete! 
echo.
echo ============================================
echo READY TO RUN
echo ============================================
echo.
echo To start the system:
echo.
echo 1. Start Backend API:
echo    cd src\PayrollSystem.API\PayrollSystem.API
echo    dotnet run
echo.
echo 2. Start Frontend (in new terminal):
echo    cd payroll-frontend
echo    npm start
echo.
echo 3. Open browser:
echo    Frontend: http://localhost:4200
echo    API Docs: http://localhost:5163/swagger
echo.
echo ============================================
pause