import dotenv from 'dotenv';

// Carga las variables definidas en el archivo .env hacia process.env
dotenv.config();

// Obtiene una variable de entorno obligatoria o lanza error si no existe.
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

// Valida que una variable de entorno sea un número de puerto válido.
function requirePort(name: string): number {
    const value = parseInt(requireEnv(name), 10);
    if (Number.isNaN(value)) {
        throw new Error(`Environment variable ${name} must be a valid port number`);
    }
    return value;
}

// Configuración centralizada y validada de la aplicación
export const env = {
    db: {
        user: requireEnv('DB_USER'),
        password: requireEnv('DB_PASSWORD'),
        host: requireEnv('DB_HOST'),
        port: requirePort('DB_PORT'),
        name: requireEnv('DB_NAME'),
    },
    api: {
        host: requireEnv('API_HOST'),
        port: requirePort('API_PORT'),
    },
};
