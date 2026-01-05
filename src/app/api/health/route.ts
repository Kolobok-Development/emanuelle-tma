import { NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { redis } from '@/lib/redis';
import axios from 'axios';

interface HealthCheckResult {
  status: 'ok' | 'error';
  message?: string;
  responseTime?: number;
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Database connection failed',
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    await redis.ping();
    return {
      status: 'ok',
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Redis connection failed',
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkTelegram(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const botToken = process.env.TELEGRAM_BOT_KEY;
    if (!botToken) {
      return {
        status: 'error',
        message: 'TELEGRAM_BOT_KEY not configured',
        responseTime: Date.now() - startTime,
      };
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return {
        status: 'error',
        message: `Telegram API returned ${response.status}`,
        responseTime: Date.now() - startTime,
      };
    }

    const data = await response.json();
    if (!data.ok) {
      return {
        status: 'error',
        message: data.description || 'Telegram API error',
        responseTime: Date.now() - startTime,
      };
    }

    return {
      status: 'ok',
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'Telegram API check failed',
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkAIService(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        status: 'error',
        message: 'XAI_API_KEY not configured',
        responseTime: Date.now() - startTime,
      };
    }

    await axios.get('https://api.x.ai/v1/models', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout: 5000,
    });

    return {
      status: 'ok',
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'AI service check failed',
      responseTime: Date.now() - startTime,
    };
  }
}

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    telegram: await checkTelegram(),
    aiService: await checkAIService(),
    timestamp: new Date().toISOString(),
  };

  // Consider app healthy if database is OK (Redis, Telegram, AI are optional for basic functionality)
  const criticalChecks = [checks.database];
  const isHealthy = criticalChecks.every((check) => check.status === 'ok');
  
  // Return 200 if database is OK, even if other services have issues
  // This prevents unnecessary restarts when Redis or external APIs are temporarily unavailable
  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}


