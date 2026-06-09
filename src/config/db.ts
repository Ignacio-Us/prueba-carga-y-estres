import { Pool } from 'pg';
import { env } from './env.js';

// Pool de conexiones reutilizables hacia PostgreSQL
export const pool = new Pool({
    user: env.db.user,
    password: env.db.password,
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
});

/**
 * Verifica que la base de datos esté accesible ejecutando una consulta simple.
 * Obtiene una conexión del pool, la usa y la devuelve al finalizar.
 */
export async function testConnection(): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
    } finally {
        client.release();
    }
}
