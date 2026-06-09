import { Pool } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
    user: env.db.user,
    password: env.db.password,
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
});

export async function testConnection(): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
    } finally {
        client.release();
    }
}
