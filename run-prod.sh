#!/bin/bash
# Run production Docker container
# Reads environment variables from .env file or command line

# Load .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$DATABASE_URL" ] || [ -z "$TELEGRAM_BOT_KEY" ] || [ -z "$XAI_API_KEY" ]; then
  echo "❌ Error: Required environment variables not set!"
  echo "Please set: DATABASE_URL, TELEGRAM_BOT_KEY, XAI_API_KEY"
  echo "And optionally: REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD"
  exit 1
fi

# Set defaults for Redis if not provided
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_USERNAME=${REDIS_USERNAME:-}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

docker run -d \
  --name emanuelle-prod \
  -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e REDIS_HOST="$REDIS_HOST" \
  -e REDIS_PORT="$REDIS_PORT" \
  -e REDIS_USERNAME="$REDIS_USERNAME" \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  -e TELEGRAM_BOT_KEY="$TELEGRAM_BOT_KEY" \
  -e XAI_API_KEY="$XAI_API_KEY" \
  -e NODE_ENV=production \
  -e JWT_SECRET="${JWT_SECRET:-123}" \
  -e JWT_EXPIRATION_TIME="${JWT_EXPIRATION_TIME:-30d}" \
  emanuelle-prod

echo "✅ Container started!"
echo "📋 View logs: docker logs -f emanuelle-prod"
echo "🛑 Stop: docker stop emanuelle-prod"
