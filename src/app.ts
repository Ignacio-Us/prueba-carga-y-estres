import express, { type Express } from 'express';
import cors from 'cors';
import { testConnection } from './config/db.js';

export const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
    try {
        await testConnection();
        res.json({ status: 'ok', database: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});
