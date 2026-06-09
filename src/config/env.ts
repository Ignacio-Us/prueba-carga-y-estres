import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function requirePort(name: string): number {
    const value = parseInt(requireEnv(name), 10);
    if (Number.isNaN(value)) {
        throw new Error(`Environment variable ${name} must be a valid port number`);
    }
    return value;
}

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
