import { Counter, Histogram, Registry } from 'prom-client';

export function createCustomMetrics(registry: Registry) {
  // 1. HTTP Request Metrics
  const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [registry],
  });

  const httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
  });

  // 2. Queue Metrics
  const queueJobDuration = new Histogram({
    name: 'queue_job_duration_seconds',
    help: 'Queue job processing duration',
    labelNames: ['queue'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
    registers: [registry],
  });

  const queueJobsTotal = new Counter({
    name: 'queue_jobs_total',
    help: 'Total queue jobs',
    labelNames: ['queue', 'status'],
    registers: [registry],
  });

  const queueJobWaitTime = new Histogram({
    name: 'queue_job_wait_seconds',
    help: 'Time jobs wait in queue before processing',
    labelNames: ['queue'],
    buckets: [0.1, 0.5, 1, 5, 10, 30],
    registers: [registry],
  });

  // 3. AI Request Metrics
  const aiRequestsTotal = new Counter({
    name: 'ai_requests_total',
    help: 'Total AI requests',
    labelNames: ['status', 'companion_id'],
    registers: [registry],
  });

  const aiResponseDuration = new Histogram({
    name: 'ai_response_duration_seconds',
    help: 'AI response generation duration',
    labelNames: ['companion_id'],
    buckets: [1, 2, 5, 10, 15, 30, 60],
    registers: [registry],
  });

  const aiTokensUsed = new Counter({
    name: 'ai_tokens_used_total',
    help: 'Total AI tokens consumed',
    labelNames: ['companion_id'],
    registers: [registry],
  });

  // 4. Payment Metrics
  const paymentsTotal = new Counter({
    name: 'payments_total',
    help: 'Total payment transactions',
    labelNames: ['status', 'offer_type'],
    registers: [registry],
  });

  const paymentAmount = new Counter({
    name: 'payment_amount_usd_total',
    help: 'Total payment amount in USD',
    labelNames: ['offer_type'],
    registers: [registry],
  });

  // 5. Database Query Duration
  const dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [registry],
  });

  return {
    http: {
      requestDuration: httpRequestDuration,
      requestTotal: httpRequestTotal,
    },
    queue: {
      jobDuration: queueJobDuration,
      jobsTotal: queueJobsTotal,
      jobWaitTime: queueJobWaitTime,
    },
    ai: {
      requestsTotal: aiRequestsTotal,
      responseDuration: aiResponseDuration,
      tokensUsed: aiTokensUsed,
    },
    payment: {
      paymentsTotal: paymentsTotal,
      paymentAmount: paymentAmount,
    },
    database: {
      queryDuration: dbQueryDuration,
    },
  };
}

