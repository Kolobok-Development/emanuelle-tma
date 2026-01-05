# Docker Setup для Development режима

Этот Dockerfile запускает оба процесса:
- `npm run dev` - Next.js dev сервер
- `npm run queue:worker:ai` - AI Queue Worker для обработки задач из Redis

## Быстрый старт

### 1. Сборка образа

```bash
docker build -t emanuelle-dev .
```

### 2. Запуск контейнера

```bash
docker run -d \
  --name emanuelle-app \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD= \
  -e TELEGRAM_BOT_KEY=your_telegram_bot_token \
  -e XAI_API_KEY=your_xai_api_key \
  emanuelle-dev
```

### 3. Использование с docker-compose (если Redis в отдельном контейнере)

Создайте `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - TELEGRAM_BOT_KEY=${TELEGRAM_BOT_KEY}
      - XAI_API_KEY=${XAI_API_KEY}
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: >
      sh -c "if [ -n '$$REDIS_PASSWORD' ]; then 
        redis-server --requirepass $$REDIS_PASSWORD 
      else 
        redis-server 
      fi"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - app-network

volumes:
  redis-data:

networks:
  app-network:
    driver: bridge
```

Запуск:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Переменные окружения

### Обязательные:
- `DATABASE_URL` - PostgreSQL connection string
- `TELEGRAM_BOT_KEY` - Telegram bot token
- `XAI_API_KEY` - xAI (Grok) API key

### Опциональные:
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `AI_WORKER_CONCURRENCY` - количество параллельных задач воркера (default: 2)
- `AI_WORKER_RATE_LIMIT` - лимит задач в минуту (default: 5)

## Проверка работы

1. Проверьте логи контейнера:
```bash
docker logs -f emanuelle-app
```

2. В логах должно быть:
   - `📦 Starting Next.js dev server...`
   - `🤖 Starting AI Response Worker...`
   - `✅ AI Response Queue Worker is running and ready to process jobs!`

3. Проверьте health endpoint:
```bash
curl http://localhost:3000/api/health
```

## Остановка

```bash
docker stop emanuelle-app
docker rm emanuelle-app
```

Или с docker-compose:
```bash
docker-compose -f docker-compose.dev.yml down
```

## Troubleshooting

- **Воркер не подключается к Redis**: Проверьте `REDIS_HOST`, `REDIS_PORT` и `REDIS_PASSWORD`
- **Next.js не запускается**: Проверьте `DATABASE_URL` и доступность PostgreSQL
- **Джобы не обрабатываются**: Убедитесь, что воркер запущен и видит логи
- **Порт 3000 занят**: Измените маппинг портов `-p 3001:3000`
