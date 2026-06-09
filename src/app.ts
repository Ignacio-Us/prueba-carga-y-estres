import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { testConnection } from './config/db.js';
import gameRoutes from './routes/game.routes.js';

export const app: Express = express();

app.use(cors());          // Permite peticiones desde otros orígenes
app.use(express.json());  // Parsea el body de las peticiones como JSON

app.use('/api/games', gameRoutes);

// Endpoint de monitoreo: verifica que la API y la base de datos estén operativas
app.get('/health', async (_req, res) => {
    try {
        await testConnection();
        res.json({ status: 'ok', database: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

// Captura cualquier ruta que no coincida con las definidas anteriormente
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Maneja errores no capturados (ej. fallos de base de datos) y responde 500
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
