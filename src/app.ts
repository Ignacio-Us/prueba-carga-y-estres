import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { testConnection } from './config/db.js';
import gameRoutes from './routes/game.routes.js';

export const app: Express = express();

app.use(cors());
app.use(express.json());

app.use('/api/games', gameRoutes);

app.get('/health', async (_req, res) => {
    try {
        await testConnection();
        res.json({ status: 'ok', database: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
