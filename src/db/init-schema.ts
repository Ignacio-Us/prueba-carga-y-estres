import { readFile } from 'fs/promises';
import path from 'path';
import { pool } from '../config/db.js';

export async function initSchema(): Promise<void> {
    const sqlPath = path.join(process.cwd(), 'sql', 'init.sql');
    const sql = await readFile(sqlPath, 'utf-8');
    await pool.query(sql);
}
