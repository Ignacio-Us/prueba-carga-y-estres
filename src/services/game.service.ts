import { pool } from '../config/db.js';
import {
    type CreateGameInput,
    type Game,
    type UpdateGameInput,
    mapGameRow,
} from '../models/game.model.js';

// Inserta un nuevo juego en la base de datos y retorna el registro creado.
export async function createGame(input: CreateGameInput): Promise<Game> {
    const result = await pool.query(
        `INSERT INTO juegos (nombre, genero, plataforma, fecha_lanzamiento, precio)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [input.nombre, input.genero, input.plataforma, input.fecha_lanzamiento, input.precio],
    );

    return mapGameRow(result.rows[0]);
}

// Obtiene todos los juegos ordenados por id ascendente.
export async function getAllGames(): Promise<Game[]> {
    const result = await pool.query('SELECT * FROM juegos ORDER BY id ASC');
    return result.rows.map(mapGameRow);
}

// Busca un juego por su id. Retorna null si no existe.
export async function getGameById(id: number): Promise<Game | null> {
    const result = await pool.query('SELECT * FROM juegos WHERE id = $1', [id]);

    if (result.rowCount === 0) {
        return null;
    }

    return mapGameRow(result.rows[0]);
}

// Reemplaza todos los campos de un juego existente. Retorna null si el id no existe.
export async function updateGame(id: number, input: UpdateGameInput): Promise<Game | null> {
    const result = await pool.query(
        `UPDATE juegos
         SET nombre = $1, genero = $2, plataforma = $3, fecha_lanzamiento = $4, precio = $5
         WHERE id = $6
         RETURNING *`,
        [input.nombre, input.genero, input.plataforma, input.fecha_lanzamiento, input.precio, id],
    );

    if (result.rowCount === 0) {
        return null;
    }

    return mapGameRow(result.rows[0]);
}

// Elimina un juego por id. Retorna true si se eliminó, false si no existía.
export async function deleteGame(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM juegos WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
}
