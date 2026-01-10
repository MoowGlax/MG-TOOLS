#!/bin/bash
echo "[MG Tools] Setting up development environment..."

if ! command -v node &> /dev/null; then
    echo "[Error] Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi

echo "[Info] Installing dependencies..."
npm install

echo "[Info] Setup complete. Run 'npm run dev' to start."
