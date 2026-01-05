# Развертывание на Timeweb App Platform

## Важно: Оба процесса запускаются автоматически

При использовании `Dockerfile.prod` оба процесса запускаются автоматически:
- ✅ **Next.js production server** (`node server.js`)
- ✅ **AI Queue Worker** (`npm run queue:worker:ai`)

## Настройка на Timeweb

### 1. Используйте Dockerfile.prod

В настройках Timeweb App Platform укажите:
- **Dockerfile**: `Dockerfile.prod`
- **Port**: `3000`

### 2. Переменные окружения

Убедитесь, что в Timeweb настроены следующие переменные окружения:

**Обязательные:**
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
TELEGRAM_BOT_KEY=your_telegram_bot_token
XAI_API_KEY=your_xai_api_key
```

**Redis (если Redis на Timeweb или внешний):**
```
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password (или оставьте пустым)
```

**Опциональные:**
```
AI_WORKER_CONCURRENCY=2
AI_WORKER_RATE_LIMIT=5
NODE_ENV=production
```

### 3. Redis на Timeweb

Если Redis запущен на Timeweb в отдельном контейнере:
- Используйте имя сервиса Redis как `REDIS_HOST` (например, `redis` или `redis-service`)
- Или используйте внутренний IP адрес Redis контейнера

Если Redis внешний:
- Укажите полный хост в `REDIS_HOST`

### 4. Проверка работы

После деплоя проверьте логи в Timeweb:
- Должно быть: `📦 Starting Next.js server...`
- Должно быть: `🤖 Starting AI Response Worker...`
- Должно быть: `✅ AI Response Queue Worker is running and ready to process jobs!`

## Альтернатива: Раздельные контейнеры

Если Timeweb поддерживает несколько контейнеров, можно разделить:

**Контейнер 1 (Web):**
- Dockerfile только для Next.js
- CMD: `node server.js`

**Контейнер 2 (Worker):**
- Dockerfile только для worker
- CMD: `npm run queue:worker:ai`

Но с текущим `Dockerfile.prod` оба процесса запускаются в одном контейнере автоматически.

## Troubleshooting

- **Worker не запускается**: Проверьте логи и переменные окружения
- **Redis не подключается**: Проверьте `REDIS_HOST` и доступность Redis
- **Next.js не запускается**: Проверьте `DATABASE_URL` и доступность PostgreSQL

