@echo off
echo [MG Tools] Setting up development environment...

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js is not installed. Please install Node.js v18+ first.
    exit /b 1
)

echo [Info] Installing dependencies...
call npm install

echo [Info] Setup complete. Run 'npm run dev' to start.
pause
