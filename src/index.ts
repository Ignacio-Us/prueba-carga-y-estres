import { app } from './app.js';
import { testConnection } from './config/db.js';
import { env } from './config/env.js';
import { initSchema } from './db/init-schema.js';

async function start(): Promise<void> {
    await testConnection();
    await initSchema();

    app.listen(env.api.port, env.api.host, () => {
        console.log(`Server running at http://${env.api.host}:${env.api.port}`);
    });
}

start().catch((error: unknown) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});