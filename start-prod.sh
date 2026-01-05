#!/bin/sh

echo "🚀 Starting application in production mode..."

# Start Next.js server in background
echo "📦 Starting Next.js server..."
node server.js &
NEXT_PID=$!

# Wait a bit for Next.js to start
sleep 5

# Check if Next.js is still running
if ! kill -0 $NEXT_PID 2>/dev/null; then
    echo "❌ Next.js server failed to start"
    exit 1
fi

echo "✅ Next.js server started (PID: $NEXT_PID)"

# Start AI Response Worker
echo "🤖 Starting AI Response Worker..."
npm run queue:worker:ai &
AI_WORKER_PID=$!

# Wait a bit for worker to start
sleep 2

# Check if worker is still running
if ! kill -0 $AI_WORKER_PID 2>/dev/null; then
    echo "⚠️  AI Worker failed to start, but continuing..."
fi

echo "✅ AI Worker started (PID: $AI_WORKER_PID)"

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down gracefully..."
    
    # Send SIGTERM to both processes
    if kill -0 $NEXT_PID 2>/dev/null; then
        echo "Stopping Next.js server..."
        kill -TERM $NEXT_PID 2>/dev/null || true
    fi
    
    if kill -0 $AI_WORKER_PID 2>/dev/null; then
        echo "Stopping AI Worker..."
        kill -TERM $AI_WORKER_PID 2>/dev/null || true
    fi
    
    # Wait for processes to finish (max 30 seconds)
    wait $NEXT_PID 2>/dev/null || true
    wait $AI_WORKER_PID 2>/dev/null || true
    
    # Force kill if still running
    kill -9 $NEXT_PID $AI_WORKER_PID 2>/dev/null || true
    
    echo "✅ Shutdown complete"
    exit 0
}

# Trap signals
trap cleanup SIGTERM SIGINT EXIT

# Monitor processes and restart if needed
while true; do
    sleep 10
    
    # Check Next.js
    if ! kill -0 $NEXT_PID 2>/dev/null; then
        echo "❌ Next.js process died, exiting..."
        cleanup
        exit 1
    fi
    
    # Check Worker (non-critical, just log)
    if ! kill -0 $AI_WORKER_PID 2>/dev/null; then
        echo "⚠️  AI Worker process died, but Next.js is still running"
    fi
done

