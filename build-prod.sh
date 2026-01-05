#!/bin/bash
# Build production Docker image
# Reads environment variables from .env file or command line

# Load .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables for build
if [ -z "$DATABASE_URL" ] || [ -z "$TELEGRAM_BOT_KEY" ] || [ -z "$XAI_API_KEY" ]; then
  echo "❌ Error: Required environment variables not set!"
  echo "Please set: DATABASE_URL, TELEGRAM_BOT_KEY, XAI_API_KEY"
  echo "You can create a .env file or export them in your shell"
  exit 1
fi

docker build -f Dockerfile.prod \
  --build-arg DATABASE_URL="$DATABASE_URL" \
  --build-arg TELEGRAM_BOT_KEY="$TELEGRAM_BOT_KEY" \
  --build-arg XAI_API_KEY="$XAI_API_KEY" \
  -t emanuelle-prod .

echo "✅ Build complete!"
