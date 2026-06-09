import { pool, testConnection } from '../config/db.js';
import { initSchema } from './init-schema.js';

// Script de inicialización manual: verifica conexión y aplica el schema SQL.
async function main(): Promise<void> {
    await testConnection();
    await initSchema();
    console.log('Database schema initialized successfully');
}

main()
    .catch((error: unknown) => {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
    });
