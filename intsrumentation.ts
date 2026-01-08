export  async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') { 
        const pino = (await import('pino')).default;
        const pinoLoki = (await import('pino-loki')).default;

        const trasport = pinoLoki({
            host: 'https://logs.grafana.net',
            batching: {
                interval: 5,
            },
            labels: { 
                app: 'emanuelle-tma',
            },
        });

        const logger = pino(trasport)

        globalThis.logger = logger;
    }
}