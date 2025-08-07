#!/bin/bash

echo "============================================"
echo "AI-Orchestrated Payroll System Setup"
echo "============================================"
echo ""

echo "[1/4] Building Backend API..."
dotnet build
if [ $? -ne 0 ]; then
    echo "ERROR: Backend build failed. Please check .NET 9.0 SDK installation."
    exit 1
fi
echo "✅ Backend build successful"
echo ""

echo "[2/4] Installing Frontend Dependencies..."
cd payroll-frontend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend dependencies installation failed. Please check Node.js installation."
    exit 1
fi
echo "✅ Frontend dependencies installed"
echo ""

echo "[3/4] Building Frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend build failed."
    exit 1
fi
echo "✅ Frontend build successful"
cd ..
echo ""

echo "[4/4] Setup Complete!"
echo ""
echo "============================================"
echo "READY TO RUN"
echo "============================================"
echo ""
echo "To start the system:"
echo ""
echo "1. Start Backend API:"
echo "   cd src/PayrollSystem.API/PayrollSystem.API"
echo "   dotnet run"
echo ""
echo "2. Start Frontend (in new terminal):"
echo "   cd payroll-frontend"
echo "   npm start"
echo ""
echo "3. Open browser:"
echo "   Frontend: http://localhost:4200"
echo "   API Docs: http://localhost:5163/swagger"
echo ""
echo "============================================"