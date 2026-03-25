#!/bin/bash
echo "=============================================="
echo "LUTO2 Dual-Stack Dashboard Launcher"
echo "=============================================="

# Check Python (use python3 on macOS)
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed."
    echo "Please install Python from: https://www.python.org/downloads/"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "[OK] Python and Node.js are installed."

# Install Phase - UI
echo "Installing frontend dependencies..."
cd "$(dirname "$0")/luto2_ui" || exit
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "node_modules folder exists, skipping npm install."
fi
cd ..

# Install Phase - API
echo "Installing backend dependencies..."
cd "$(dirname "$0")/luto2_api" || exit
python3 -m pip install -r requirements.txt
cd ..

# Launch Phase (Concurrent)
echo "Starting FastAPI Backend (Port 8000)..."
cd "$(dirname "$0")/luto2_api" || exit
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "Starting Next.js Frontend (Port 3000)..."
cd "$(dirname "$0")/luto2_ui" || exit
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a brief moment for servers to spin up
sleep 5

# Browser Launch
echo "Opening Dashboard in your default browser..."
open http://localhost:3000

echo "Both servers are running in the background. Press [Ctrl+C] to stop."
# Trap SIGINT to kill background processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
