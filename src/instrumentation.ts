import { Logger } from 'pino';

declare global {
    var logger: Logger | undefined;
    var metrics: {
        registry: any;
        http: {
            requestDuration: any;
            requestTotal: any;
        };
        queue: {
            jobDuration: any;
            jobsTotal: any;
            jobWaitTime: any;
        };
        ai: {
            requestsTotal: any;
            responseDuration: any;
            tokensUsed: any;
        };
        payment: {
            paymentsTotal: any;
            paymentAmount: any;
        };
        database: {
            queryDuration: any;
        };
    } | undefined;
}

console.log('registering instrumentation');

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') { 
        const pino = (await import('pino')).default;
        const pinoLoki = (await import('pino-loki')).default;

        // Check if Loki is configured
        const lokiHost = process.env.LOKI_HOST;
        const lokiUsername = process.env.LOKI_USERNAME;
        const lokiPassword = process.env.LOKI_PASSWORD;

        if (!lokiHost || !lokiUsername || !lokiPassword) {
            console.warn('⚠️  Loki logging not configured. Missing LOKI_HOST, LOKI_USERNAME, or LOKI_PASSWORD');
            // Create a basic logger without Loki transport
            const logger = pino({
                level: process.env.LOG_LEVEL || 'info',
            });
            globalThis.logger = logger;
        } else {

        // For Grafana Cloud, the host should be the full URL
        // Example: https://logs-prod-XXX.grafana.net
        const transport = pinoLoki({
            host: lokiHost, // Full URL for Grafana Cloud
            basicAuth: {
                username: lokiUsername, // Your Grafana Cloud instance ID
                password: lokiPassword,  // Your Grafana Cloud API token
            },
            batching: {
                interval: 5, // seconds
            },
            labels: {  
                app: 'emanuelle-tma',
                environment: process.env.NODE_ENV || 'development',
            },
        });

        const logger = pino(transport);

            // Test the logger
            logger.info({ lokiConfigured: true }, 'Loki logger initialized');

            globalThis.logger = logger;
        }


        // Initialize Prometheus metrics (always initialize, even if Loki is not configured)
        // Use dynamic import to prevent client-side bundling
        const { Registry, collectDefaultMetrics } = await import('prom-client');
        const { createCustomMetrics } = await import('./lib/metrics');
        
        const prometheusRegistry = new Registry();
        
        // Collect default system metrics (CPU, memory, event loop, etc.)
        // These include: process_cpu_*, process_resident_memory_bytes, 
        // nodejs_heap_*, nodejs_eventloop_lag_*, etc.
        collectDefaultMetrics({
            register: prometheusRegistry,
            prefix: 'app_',
        });

        // Custom application metrics
        const customMetrics = createCustomMetrics(prometheusRegistry);

        globalThis.metrics = {
            registry: prometheusRegistry,
            http: customMetrics.http,
            queue: customMetrics.queue,
            ai: customMetrics.ai,
            payment: customMetrics.payment,
            database: customMetrics.database,
        };

        console.log('✅ Prometheus metrics initialized');

    }
}