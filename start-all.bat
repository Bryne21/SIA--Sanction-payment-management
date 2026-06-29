@echo off
title Sanction Payment Management System Launcher
echo ==========================================================
echo Adding portable Node.js to environment PATH...
echo ==========================================================
set PATH=C:\Users\PC-NI-NED\.gemini\antigravity-ide\scratch\node_bin\node-v20.11.1-win-x64;%PATH%

echo ==========================================================
echo Starting Express Server (Backend)...
echo ==========================================================
start "SanctionPay Backend Server" cmd /k "cd /d \"%~dp0server\" && npm start"

echo ==========================================================
echo Starting Vite Dev Server (Frontend)...
echo ==========================================================
start "SanctionPay Frontend Dashboard" cmd /k "cd /d \"%~dp0dashboard\" && npm run dev"

echo ==========================================================
echo Both servers have been launched!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo ==========================================================
pause
