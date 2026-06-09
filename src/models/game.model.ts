// Representación de un juego tal como se expone en la API.
export interface Game {
    id: number;
    nombre: string;
    genero: string;
    plataforma: string;
    fecha_lanzamiento: string;
    precio: number;
}

// Datos requeridos para crear o actualizar un juego.
export interface CreateGameInput {
    nombre: string;
    genero: string;
    plataforma: string;
    fecha_lanzamiento: string;
    precio: number;
}

export type UpdateGameInput = CreateGameInput;

interface GameRow {
    id: number;
    nombre: string;
    genero: string;
    plataforma: string;
    fecha_lanzamiento: Date;
    precio: string;
}

/**
 * Convierte una fila de PostgreSQL al formato de respuesta de la API.
 * Transforma la fecha a string ISO (YYYY-MM-DD) y el precio DECIMAL a number Float.
 */
export function mapGameRow(row: GameRow): Game {
    return {
        id: row.id,
        nombre: row.nombre,
        genero: row.genero,
        plataforma: row.plataforma,
        fecha_lanzamiento: row.fecha_lanzamiento.toISOString().split('T')[0],
        precio: parseFloat(row.precio),
    };
}

// Comprueba si un string representa una fecha válida.
function isValidDate(value: string): boolean {
    return !Number.isNaN(Date.parse(value));
}

/**
 * Valida y normaliza el body de una petición de creación o actualización.
 * Retorna null si algún campo es inválido o falta.
 */
export function parseGameInput(body: unknown): CreateGameInput | null {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const { nombre, genero, plataforma, fecha_lanzamiento, precio } = body as Record<string, unknown>;

    if (typeof nombre !== 'string' || !nombre.trim()) {
        return null;
    }
    if (typeof genero !== 'string' || !genero.trim()) {
        return null;
    }
    if (typeof plataforma !== 'string' || !plataforma.trim()) {
        return null;
    }
    if (typeof fecha_lanzamiento !== 'string' || !isValidDate(fecha_lanzamiento)) {
        return null;
    }
    if (typeof precio !== 'number' || precio < 0) {
        return null;
    }

    return {
        nombre: nombre.trim(),
        genero: genero.trim(),
        plataforma: plataforma.trim(),
        fecha_lanzamiento,
        precio,
    };
}

// Convierte el parámetro :id de la URL a número entero positivo, o null si es inválido.
export function parseGameId(value: string): number | null {
    const id = parseInt(value, 10);
    if (Number.isNaN(id) || id <= 0) {
        return null;
    }
    return id;
}
