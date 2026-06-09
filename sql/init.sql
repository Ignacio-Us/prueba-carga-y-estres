CREATE TABLE IF NOT EXISTS juegos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    genero VARCHAR(100) NOT NULL,
    plataforma VARCHAR(100) NOT NULL,
    fecha_lanzamiento DATE NOT NULL,
    precio DECIMAL(10, 2) NOT NULL
);
