import { NextRequest, NextResponse } from 'next/server';

/**
 * Track HTTP request metrics
 */
export function trackHttpMetrics(
  request: NextRequest,
  response: NextResponse,
  startTime: number
) {
  if (!globalThis.metrics) return;

  const method = request.method;
  const route = request.nextUrl.pathname;
  const statusCode = response.status;
  const duration = (Date.now() - startTime) / 1000;

  try {
    globalThis.metrics.http.requestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);

    globalThis.metrics.http.requestTotal
      .labels(method, route, statusCode.toString())
      .inc();
  } catch (error) {
    // Silently fail if metrics not initialized
    console.error('Failed to track HTTP metrics:', error);
  }
}

/**
 * Track queue job metrics
 */
export function trackQueueJob(
  queueName: string,
  status: 'completed' | 'failed' | 'delayed',
  duration?: number,
  waitTime?: number
) {
  if (!globalThis.metrics) return;

  try {
    if (duration !== undefined) {
      globalThis.metrics.queue.jobDuration
        .labels(queueName)
        .observe(duration);
    }

    if (waitTime !== undefined) {
      globalThis.metrics.queue.jobWaitTime
        .labels(queueName)
        .observe(waitTime);
    }

    globalThis.metrics.queue.jobsTotal
      .labels(queueName, status)
      .inc();
  } catch (error) {
    console.error('Failed to track queue metrics:', error);
  }
}

/**
 * Track AI request metrics
 */
export function trackAIRequest(
  companionId: string,
  status: 'success' | 'failed',
  duration?: number,
  tokensUsed?: number
) {
  if (!globalThis.metrics) return;

  try {
    globalThis.metrics.ai.requestsTotal
      .labels(status, companionId)
      .inc();

    if (duration !== undefined) {
      globalThis.metrics.ai.responseDuration
        .labels(companionId)
        .observe(duration);
    }

    if (tokensUsed !== undefined) {
      globalThis.metrics.ai.tokensUsed
        .labels(companionId)
        .inc(tokensUsed);
    }
  } catch (error) {
    console.error('Failed to track AI metrics:', error);
  }
}

/**
 * Track payment metrics
 */
export function trackPayment(
  status: 'success' | 'failed' | 'pending',
  offerType: string,
  amountUSD?: number
) {
  if (!globalThis.metrics) return;

  try {
    globalThis.metrics.payment.paymentsTotal
      .labels(status, offerType)
      .inc();

    if (amountUSD !== undefined) {
      globalThis.metrics.payment.paymentAmount
        .labels(offerType)
        .inc(amountUSD);
    }
  } catch (error) {
    console.error('Failed to track payment metrics:', error);
  }
}

/**
 * Track database query metrics
 */
export function trackDBQuery(
  operation: 'select' | 'insert' | 'update' | 'delete',
  table: string,
  duration: number
) {
  if (!globalThis.metrics) return;

  try {
    globalThis.metrics.database.queryDuration
      .labels(operation, table)
      .observe(duration);
  } catch (error) {
    console.error('Failed to track DB metrics:', error);
  }
}

