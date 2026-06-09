import type { Request, Response } from 'express';
import { parseGameId, parseGameInput } from '../models/game.model.js';
import * as gameService from '../services/game.service.js';

// POST /api/games — Valida el body y crea un juego (201).
export async function createGame(req: Request, res: Response): Promise<void> {
    const input = parseGameInput(req.body);

    if (!input) {
        res.status(400).json({ error: 'Invalid game data' });
        return;
    }

    const game = await gameService.createGame(input);
    res.status(201).json(game);
}

// GET /api/games — Retorna la lista completa de juegos.
export async function getAllGames(_req: Request, res: Response): Promise<void> {
    const games = await gameService.getAllGames();
    res.json(games);
}

// GET /api/games/:id — Retorna un juego o 404 si no existe.
export async function getGameById(req: Request, res: Response): Promise<void> {
    const id = parseGameId(req.params.id);

    if (!id) {
        res.status(400).json({ error: 'Invalid game id' });
        return;
    }

    const game = await gameService.getGameById(id);

    if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
    }

    res.json(game);
}

// PUT /api/games/:id — Actualiza un juego existente o retorna 404.
export async function updateGame(req: Request, res: Response): Promise<void> {
    const id = parseGameId(req.params.id);

    if (!id) {
        res.status(400).json({ error: 'Invalid game id' });
        return;
    }

    const input = parseGameInput(req.body);

    if (!input) {
        res.status(400).json({ error: 'Invalid game data' });
        return;
    }

    const game = await gameService.updateGame(id, input);

    if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
    }

    res.json(game);
}

// DELETE /api/games/:id — Elimina un juego y responde 204 sin contenido.
export async function deleteGame(req: Request, res: Response): Promise<void> {
    const id = parseGameId(req.params.id);

    if (!id) {
        res.status(400).json({ error: 'Invalid game id' });
        return;
    }

    const deleted = await gameService.deleteGame(id);

    if (!deleted) {
        res.status(404).json({ error: 'Game not found' });
        return;
    }

    res.status(204).send();
}
