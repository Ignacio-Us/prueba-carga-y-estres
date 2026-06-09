export interface Game {
    id: number;
    nombre: string;
    genero: string;
    plataforma: string;
    fecha_lanzamiento: string;
    precio: number;
}

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

function isValidDate(value: string): boolean {
    return !Number.isNaN(Date.parse(value));
}

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

export function parseGameId(value: string): number | null {
    const id = parseInt(value, 10);
    if (Number.isNaN(id) || id <= 0) {
        return null;
    }
    return id;
}
