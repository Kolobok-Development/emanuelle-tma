#!/bin/bash
# Development entrypoint
# - Ensures a Redis Docker container is running
# - Starts the Next.js dev server on the host
# - Starts the AI Response Worker on the host
# All processes are kept in the foreground; Ctrl+C cleans them up.

set -e

# Load .env if present so REDIS_*, DATABASE_URL, etc. are available
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Force NODE_ENV=development for `next dev` (overrides any value inherited from
# the shell or .env, which Next.js warns about as "non-standard").
export NODE_ENV=development

REDIS_CONTAINER_NAME="${REDIS_CONTAINER_NAME:-emanuelle-redis-dev}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_USERNAME="${REDIS_USERNAME:-}"

echo "🚀 Starting application in development mode..."

# 1) Ensure Redis is running via Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is required for dev mode (used to run Redis). Please install Docker."
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER_NAME}$"; then
  echo "✅ Redis container '${REDIS_CONTAINER_NAME}' is already running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER_NAME}$"; then
  echo "🔄 Starting existing Redis container '${REDIS_CONTAINER_NAME}'..."
  docker start "$REDIS_CONTAINER_NAME" >/dev/null
else
  echo "📦 Creating Redis container '${REDIS_CONTAINER_NAME}' on port ${REDIS_PORT}..."
  if [ -n "$REDIS_PASSWORD" ]; then
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      -p "${REDIS_PORT}:6379" \
      -v "${REDIS_CONTAINER_NAME}-data:/data" \
      redis:7-alpine \
      redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes >/dev/null
  else
    docker run -d \
      --name "$REDIS_CONTAINER_NAME" \
      -p "${REDIS_PORT}:6379" \
      -v "${REDIS_CONTAINER_NAME}-data:/data" \
      redis:7-alpine \
      redis-server --appendonly yes >/dev/null
  fi
fi

# Wait for Redis to be reachable
echo "⏳ Waiting for Redis to be ready..."
for i in $(seq 1 30); do
  if [ -n "$REDIS_PASSWORD" ]; then
    if docker exec "$REDIS_CONTAINER_NAME" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping 2>/dev/null | grep -q PONG; then
      break
    fi
  else
    if docker exec "$REDIS_CONTAINER_NAME" redis-cli ping 2>/dev/null | grep -q PONG; then
      break
    fi
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ Redis did not become ready in time"
    exit 1
  fi
  sleep 0.5
done
echo "✅ Redis is ready on ${REDIS_HOST}:${REDIS_PORT}"

# Make Redis credentials available to child processes
export REDIS_HOST REDIS_PORT REDIS_USERNAME REDIS_PASSWORD

# 2) Start Next.js dev server
echo "📦 Starting Next.js dev server..."
npm run dev &
NEXT_PID=$!

sleep 3

if ! kill -0 "$NEXT_PID" 2>/dev/null; then
  echo "❌ Next.js dev server failed to start"
  exit 1
fi

# 3) Start AI Response Worker
echo "🤖 Starting AI Response Worker..."
npm run queue:worker:ai &
AI_WORKER_PID=$!

cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill "$NEXT_PID" "$AI_WORKER_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ Stopped (Redis container '${REDIS_CONTAINER_NAME}' is still running; 'docker stop ${REDIS_CONTAINER_NAME}' to stop it)"
  exit 0
}

trap cleanup SIGTERM SIGINT

wait
