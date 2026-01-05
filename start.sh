#!/bin/sh
set -e

echo "🚀 Starting application in development mode..."

# Start Next.js dev server in background
echo "📦 Starting Next.js dev server..."
npm run dev &
NEXT_PID=$!

# Wait a bit for Next.js to start
sleep 3

# Start AI Response Worker
echo "🤖 Starting AI Response Worker..."
npm run queue:worker:ai &
AI_WORKER_PID=$!

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down gracefully..."
    kill $NEXT_PID $AI_WORKER_PID 2>/dev/null || true
    wait
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT

# Wait for all processes
wait
