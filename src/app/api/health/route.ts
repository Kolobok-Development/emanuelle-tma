import { NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { redis } from '@/lib/redis';
import { TelegramService } from '@/lib/telegram';
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
    const apiKey = process.env.MODELSLAB_KEY;
    if (!apiKey) {
      return {
        status: 'error',
        message: 'MODELSLAB_KEY not configured',
        responseTime: Date.now() - startTime,
      };
    }

    await axios.get('https://modelslab.com/api/v5/models', {
      headers: {
        'Content-Type': 'application/json',
        key: apiKey,
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

  const isHealthy = Object.values(checks)
    .filter((check): check is HealthCheckResult => 
      typeof check === 'object' && 'status' in check
    )
    .every((check) => check.status === 'ok');

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

