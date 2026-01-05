FROM node:20-alpine

RUN apk add --no-cache bash libc6-compat openssl python3 make g++

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema & generate client
COPY prisma ./prisma
# Use the same Prisma version as @prisma/client (6.16.2) to avoid version conflicts
# Prisma 7+ requires different schema format, so we must use 6.x
RUN npx prisma@6.16.2 generate

# Copy the rest of the app
COPY . .

# Set environment variables (will be overridden by docker run -e)
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000

CMD ["./start.sh"]
