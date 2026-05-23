#!/bin/bash
# Development startup script for Face Recognition Notes application
# Starts both Flask backend (port 5000) and Vite frontend (port 5173)

set -e

# PIDs for child processes
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function to terminate child processes
cleanup() {
    echo ""
    echo "Shutting down services..."

    # Send SIGTERM to both processes
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi

    # Wait up to 5 seconds for graceful shutdown
    local waited=0
    while [ $waited -lt 5 ]; do
        local still_running=0
        if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
            still_running=1
        fi
        if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
            still_running=1
        fi
        if [ $still_running -eq 0 ]; then
            break
        fi
        sleep 1
        waited=$((waited + 1))
    done

    # Force kill any remaining processes
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Force killing backend..."
        kill -9 "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Force killing frontend..."
        kill -9 "$FRONTEND_PID" 2>/dev/null
    fi

    echo "All services stopped."
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# --- Prerequisite Checks ---

# Check for Python virtual environment
VENV_PATH=""
if [ -d "backend/.venv" ]; then
    VENV_PATH="backend/.venv"
elif [ -d "backend/venv" ]; then
    VENV_PATH="backend/venv"
else
    echo "ERROR: Python virtual environment not found."
    echo "Expected at: backend/.venv or backend/venv"
    echo ""
    echo "To create one, run:"
    echo "  cd backend"
    echo "  python -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check for frontend/node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "ERROR: frontend/node_modules not found."
    echo "Please install frontend dependencies:"
    echo "  cd frontend"
    echo "  npm install"
    exit 1
fi

# Check if port 5000 is available
check_port() {
    local port=$1
    if command -v lsof &>/dev/null; then
        if lsof -i :"$port" -sTCP:LISTEN &>/dev/null; then
            return 1
        fi
    elif command -v ss &>/dev/null; then
        if ss -tlnp | grep -q ":${port} "; then
            return 1
        fi
    else
        # Fallback: try to connect to the port
        if (echo >/dev/tcp/localhost/"$port") 2>/dev/null; then
            return 1
        fi
    fi
    return 0
}

if ! check_port 5000; then
    echo "ERROR: Port 5000 is already in use."
    echo "Please stop the process using port 5000 and try again."
    exit 1
fi

if ! check_port 5173; then
    echo "ERROR: Port 5173 is already in use."
    echo "Please stop the process using port 5173 and try again."
    exit 1
fi

# --- Start Services ---

# Determine the Python executable from the venv
PYTHON_BIN="$VENV_PATH/bin/python"

echo "Starting Face Recognition Notes application..."
echo ""

# Start Flask backend
cd backend
"../$PYTHON_BIN" run.py &
BACKEND_PID=$!
cd ..

echo "Backend running on http://localhost:5000"

# Start Vite frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Frontend running on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 2>/dev/null

# If we get here, one of the processes exited on its own
cleanup
