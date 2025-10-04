# Emanuelle TMA - Architecture Documentation

## Overview

This project is a Telegram bot application that provides AI companions for users to chat with. The architecture follows a microservices pattern with a webhook-based Telegram integration, queue-based AI processing, and a PostgreSQL database for persistence.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram      │    │   Next.js App   │    │   Queue Worker  │
│   Bot API       │───▶│   (Webhook)     │───▶│   (BullMQ)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │     Redis       │
                       │   Database      │    │   (Queue Store) │
                       └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   AI Service    │    │   Telegram      │
                       │  (ModelsLab)    │    │   Service       │
                       └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Telegram Webhook (`/src/app/api/bot/webhook/route.ts`)

**Purpose**: Entry point for all Telegram bot interactions

**Flow**:
1. Receives POST requests from Telegram Bot API
2. Validates incoming messages
3. Extracts user information and message content
4. Creates or retrieves user from database
5. Checks if user has selected a companion
6. Saves user message to conversation history
7. Queues AI response generation
8. Returns acknowledgment to Telegram

**Key Features**:
- User management (create/retrieve by Telegram ID)
- Companion validation
- Message persistence
- Error handling with graceful fallbacks
- GET endpoint for health checks

### 2. BullMQ Queue System (`/src/lib/queues/ai-response-queue.ts`)

**Purpose**: Queue management and job creation (worker runs separately)

**Queue Configuration**:
- **Queue Name**: `ai-response`
- **Retry Policy**: 3 attempts with exponential backoff
- **Job Retention**: 100 completed, 50 failed jobs

**Job Data Structure**:
```typescript
interface AIResponseJobData {
  chatId: number;           // Telegram chat ID
  userMessage: string;      // User's message
  companion: AICompanion;   // Selected AI companion
  username?: string;        // User's username
  messageId?: number;       // Telegram message ID
  dbChatId?: string;        // Database chat ID
}
```

**Key Functions**:
- `queueAIResponse()`: Adds AI response jobs to the queue
- `aiResponseQueue`: BullMQ Queue instance for job management

**Note**: This module only handles queue operations. The actual worker processing is handled by a separate process.

### 3. Queue Worker Processor (`/src/lib/queues/processor.ts`)

**Purpose**: Standalone process that runs the BullMQ worker

**Worker Configuration**:
- **Concurrency**: 2 workers
- **Rate Limiting**: 5 jobs per minute
- **Queue Name**: `ai-response`

**Processing Flow**:
1. Retrieve conversation history (last 15 messages)
2. Generate AI response using companion personality
3. Save AI response to database
4. Send response back to Telegram
5. Handle errors with fallback messages

**Features**:
- Graceful shutdown handling (SIGINT, SIGTERM)
- Error handling for uncaught exceptions
- Process monitoring and logging
- Automatic worker initialization
- Event listeners for job completion/failure

**Usage**:
```bash
npm run queue:worker
```

### 4. AI Service (`/src/lib/ai.ts`)

**Purpose**: Integration with external AI API (ModelsLab)

**Configuration**:
- **API Endpoint**: `https://modelslab.com/api/v5/uncensored_chat`
- **Model**: `mistralai-Mistral-7B-Instruct-v0.3`
- **Max Tokens**: 1000
- **Timeout**: 30 seconds

**Features**:
- System message generation with companion personality
- Conversation context management
- Token usage tracking
- Rate limit handling
- Error recovery

**Companion Response Generation**:
- Creates personalized system prompts
- Incorporates companion personality and description
- Maintains conversation continuity
- Tracks token usage for billing

### 5. Database Layer (Prisma + PostgreSQL)

**Models**:

#### Users
- Telegram ID mapping
- Subscription management
- User settings and preferences

#### AICompanion
- Companion definitions (name, personality, avatar)
- Subscription tier requirements
- Energy cost system

#### CompanionSelection
- User-companion associations
- Selection timestamps

#### Chat & Message
- Conversation persistence
- Message role tracking (USER/ASSISTANT/SYSTEM)
- Token usage tracking

#### UserSettings
- Personalization options
- Language preferences
- Theme settings

### 6. Redis Configuration (`/src/lib/redis.ts`)

**Purpose**: Queue storage and caching

**Configuration**:
- **Host**: `REDIS_HOST` (default: localhost)
- **Port**: `REDIS_PORT` (default: 6379)
- **Password**: `REDIS_PASSWORD` (optional)
- **Connection**: Lazy connection with retry logic

**Usage**:
- BullMQ queue storage
- Job state management
- Rate limiting data
- Session caching (future)

### 7. Telegram Service (`/src/lib/telegram.ts`)

**Purpose**: Telegram Bot API integration

**Features**:
- Message sending with HTML/Markdown support
- Error handling and logging
- Response validation
- Rate limit management

**API Methods**:
- `sendMessage()`: Send text messages to users
- Automatic retry logic
- Error response handling

### 8. Supporting Services

#### ConversationService (`/src/lib/conversation.ts`)
- Chat history management
- Message persistence
- Context retrieval for AI
- Active chat tracking

#### CompanionService (`/src/lib/companions.ts`)
- Companion CRUD operations
- User-companion associations
- Default companion seeding
- Subscription tier validation

#### UserService (`/src/lib/user.ts`)
- User creation and retrieval
- Telegram ID mapping
- Username updates
- Settings management

## Data Flow

### 1. Message Processing Flow

```
User sends message → Telegram Bot API → Webhook → User validation → 
Companion check → Message save → Queue AI job → Worker processes → 
AI generation → Response save → Telegram send → User receives response
```

### 2. Error Handling Flow

```
Error occurs → Log error → Graceful fallback → User notification → 
Continue processing → Retry mechanism (if applicable)
```

### 3. Queue Processing Flow

```
Job queued → Worker picks up → Validate data → Retrieve context → 
Generate AI response → Save to DB → Send to Telegram → 
Mark job complete → Cleanup
```

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct PostgreSQL connection (for migrations)
- `TELEGRAM_BOT_KEY`: Telegram bot token
- `MODELSLAB_KEY`: AI service API key

### Optional
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis authentication password

## Deployment Architecture

### Development
```bash
# Setup environment variables (first time only)
npm run setup:env

# Start Next.js app (webhook only - no worker)
npm run dev

# Start queue worker (separate terminal - REQUIRED)
npm run queue:worker

# Test queue separation
npm run queue:test

# Seed companions
npm run seed:companions
```

### Production
- **Web Server**: Next.js app with webhook endpoints
- **Queue Worker**: Separate process running BullMQ worker
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis for BullMQ
- **External Services**: Telegram Bot API, ModelsLab AI API

## Security Considerations

1. **Webhook Security**: Telegram webhook validation (implemented via Bot API)
2. **API Keys**: Environment variable protection
3. **Database**: Connection string security
4. **Rate Limiting**: Built-in BullMQ rate limiting
5. **Error Handling**: No sensitive data in error logs

## Monitoring and Logging

### Logging Points
- Webhook requests and responses
- Queue job processing
- AI API calls and responses
- Database operations
- Error conditions

### Metrics to Monitor
- Queue job success/failure rates
- AI response generation time
- Database connection health
- Redis connection status
- Telegram API response times

## Scalability Considerations

### Horizontal Scaling
- Multiple queue workers can be deployed
- Redis clustering for high availability
- Database read replicas for conversation history

### Performance Optimization
- Conversation history limiting (15 messages)
- Job retention policies
- Rate limiting per user
- Connection pooling

### Future Enhancements
- WebSocket connections for real-time updates
- Message queuing for high-volume periods
- Caching layer for companion data
- Analytics and user behavior tracking

## Troubleshooting

### Common Issues

1. **Queue Worker Not Processing**
   - Check Redis connection
   - Verify worker process is running
   - Check job queue status

2. **AI Responses Not Generated**
   - Verify ModelsLab API key
   - Check API rate limits
   - Review error logs

3. **Telegram Messages Not Sent**
   - Verify bot token
   - Check webhook configuration
   - Review Telegram API errors

4. **Database Connection Issues**
   - Verify DATABASE_URL
   - Check PostgreSQL server status
   - Review Prisma connection logs

### Debug Commands
```bash
# Setup environment variables
npm run setup:env

# Start queue worker
npm run queue:worker

# Test queue separation
npm run queue:test

# Test webhook endpoint
curl -X GET http://localhost:3000/api/bot/webhook

# Check database connection
npx prisma db push

# View logs
tail -f logs/app.log
```

## Development Workflow

1. **Setup**: Install dependencies, configure environment
2. **Database**: Run migrations, seed data
3. **Development**: Start Next.js app and queue worker
4. **Testing**: Use Telegram bot for end-to-end testing
5. **Deployment**: Deploy web app and worker separately

This architecture provides a robust, scalable foundation for the AI companion chatbot system with clear separation of concerns and reliable message processing.
