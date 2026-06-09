import { readFile } from 'fs/promises';
import path from 'path';
import { pool } from '../config/db.js';

/**
 * Lee el archivo sql/init.sql y lo ejecuta contra la base de datos.
 * Crea la tabla juegos si aún no existe (CREATE TABLE IF NOT EXISTS).
 */
export async function initSchema(): Promise<void> {
    const sqlPath = path.join(process.cwd(), 'sql', 'init.sql');
    const sql = await readFile(sqlPath, 'utf-8');
    await pool.query(sql);
}
