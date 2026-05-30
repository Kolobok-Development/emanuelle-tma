#!/bin/bash
# Production entrypoint (no Docker)
# - Validates required environment variables
# - Builds the Next.js app if no build is found
# - Starts the Next.js production server
# - Starts the AI Response Worker
# Redis must already be running and reachable via REDIS_HOST/REDIS_PORT.

set -e

# Load .env if present
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Validate required environment variables
missing=()
[ -z "$DATABASE_URL" ] && missing+=("DATABASE_URL")
[ -z "$TELEGRAM_BOT_KEY" ] && missing+=("TELEGRAM_BOT_KEY")
[ -z "$XAI_API_KEY" ] && missing+=("XAI_API_KEY")
[ -z "$REDIS_HOST" ] && missing+=("REDIS_HOST")

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables: ${missing[*]}"
  echo "Set them in .env or export them in your shell."
  exit 1
fi

REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_USERNAME="${REDIS_USERNAME:-}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

export NODE_ENV=production
export REDIS_HOST REDIS_PORT REDIS_USERNAME REDIS_PASSWORD

echo "🚀 Starting application in production mode..."
echo "🔗 Redis: ${REDIS_HOST}:${REDIS_PORT}"

# Build if no .next directory exists; force a rebuild with FORCE_BUILD=1
if [ "${FORCE_BUILD:-0}" = "1" ] || [ ! -d ".next" ]; then
  echo "🔨 Building Next.js app..."
  npm run build
else
  echo "ℹ️  Using existing build in .next (set FORCE_BUILD=1 to rebuild)"
fi

# Start Next.js production server
echo "📦 Starting Next.js server..."
npm start &
NEXT_PID=$!

sleep 5

if ! kill -0 "$NEXT_PID" 2>/dev/null; then
  echo "❌ Next.js server failed to start"
  exit 1
fi
echo "✅ Next.js server started (PID: $NEXT_PID)"

# Start AI Response Worker
echo "🤖 Starting AI Response Worker..."
npm run queue:worker:ai &
AI_WORKER_PID=$!

sleep 2

if ! kill -0 "$AI_WORKER_PID" 2>/dev/null; then
  echo "⚠️  AI Worker failed to start, but continuing..."
else
  echo "✅ AI Worker started (PID: $AI_WORKER_PID)"
fi

cleanup() {
  echo ""
  echo "🛑 Shutting down gracefully..."

  if kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "Stopping Next.js server..."
    kill -TERM "$NEXT_PID" 2>/dev/null || true
  fi

  if kill -0 "$AI_WORKER_PID" 2>/dev/null; then
    echo "Stopping AI Worker..."
    kill -TERM "$AI_WORKER_PID" 2>/dev/null || true
  fi

  wait "$NEXT_PID" 2>/dev/null || true
  wait "$AI_WORKER_PID" 2>/dev/null || true

  # Force kill if still running
  kill -9 "$NEXT_PID" "$AI_WORKER_PID" 2>/dev/null || true

  echo "✅ Shutdown complete"
  exit 0
}

trap cleanup SIGTERM SIGINT EXIT

# Monitor processes; exit if Next.js dies, just warn if worker dies
while true; do
  sleep 10

  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "❌ Next.js process died, exiting..."
    exit 1
  fi

  if ! kill -0 "$AI_WORKER_PID" 2>/dev/null; then
    echo "⚠️  AI Worker process died, but Next.js is still running"
  fi
done
