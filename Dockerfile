FROM node:20-alpine AS builder

RUN apk add --no-cache bash libc6-compat openssl python3 make g++

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema & generate client
COPY prisma ./prisma
# Use the same Prisma version as @prisma/client (6.16.2) to avoid version conflicts
RUN npx prisma@6.16.2 generate

# Copy the rest of the app
COPY . .

# Accept build arguments for environment variables needed during build
ARG DATABASE_URL
ARG TELEGRAM_BOT_KEY
ARG XAI_API_KEY

# Set environment variables for build stage
ENV DATABASE_URL=$DATABASE_URL
ENV TELEGRAM_BOT_KEY=$TELEGRAM_BOT_KEY
ENV XAI_API_KEY=$XAI_API_KEY

# Build Next.js app for production
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache bash libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy source files and configs needed for workers
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Copy node_modules (needed for tsx and workers)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy startup script
COPY --chown=nextjs:nodejs start-prod.sh ./start-prod.sh
RUN chmod +x ./start-prod.sh

USER nextjs

EXPOSE 3000

CMD ["./start-prod.sh"]

