# Prueba de Carga y Estrés - Sistema de Gestión de Juegos

 Consiste en una API REST con operaciones CRUD sobre una entidad de juegos, junto con la infraestructura necesaria para ejecutar pruebas de carga y de estrés que verifiquen su comportamiento bajo distintos niveles de concurrencia.

## Stack tecnológico

- **API**: TypeScript + Express 5 (ESM), Node.js 22
- **Base de datos**: PostgreSQL 16
- **Orquestación**: Docker + Docker Compose
- **Monitoreo**: Prometheus + Grafana + postgres_exporter + cAdvisor
- **Generador de carga**: K6

## Estructura del repositorio

```
.
├── docker-compose.yml                    Stack principal (API + Postgres)
├── docker-compose.monitoring.yml         Stack de monitoreo + K6
├── Dockerfile                            Imagen multi-stage de la API
├── sql/init.sql                          Schema de la base de datos
├── src/                                  Código fuente de la API
├── monitoring/                           Configuración Prometheus + Grafana
├── k6/scripts/                           Scripts de pruebas K6
│   ├── plan-carga.js                     Prueba de carga (100 VUs, 10 min)
│   ├── plan-estres.js                    Prueba de estrés (escalones 50 a 1000 VUs)
│   └── smoke-test.js                     Smoke test del pipeline
└── docs/
    ├── monitoring.md                     Guía detallada del stack de monitoreo
    ├── screenshots/                      Capturas de Grafana
    └── Informe-Pruebas-Carga-Estres.pdf  Informe final
```

## Cómo levantar el entorno

Requiere Docker y Docker Compose v2 instalados.

```bash
# Clonar el repositorio
git clone https://github.com/Ignacio-Us/prueba-carga-y-estres.git
cd prueba-carga-y-estres

# Copiar las variables de entorno
cp .env.example .env

# Levantar la API y la base de datos
docker compose up -d

# Levantar el stack de monitoreo
docker compose -f docker-compose.monitoring.yml up -d
```

## Cómo ejecutar las pruebas

```bash
# Prueba de carga (100 VUs durante 10 minutos)
docker compose -f docker-compose.monitoring.yml --profile tests run --rm k6 run /scripts/plan-carga.js

# Prueba de estrés (escalones progresivos durante 18 minutos)
docker compose -f docker-compose.monitoring.yml --profile tests run --rm k6 run /scripts/plan-estres.js
```

En Git Bash sobre Windows, anteponer `//` al path del script para evitar la conversión de rutas de MSYS:

```bash
docker compose -f docker-compose.monitoring.yml --profile tests run --rm k6 run //scripts/plan-carga.js
```

## URLs de acceso

| Servicio   | URL                          | Credenciales  |
|------------|------------------------------|---------------|
| API        | http://localhost:3000        | —             |
| Grafana    | http://localhost:3030        | admin / admin |
| Prometheus | http://localhost:9090        | —             |

En Grafana, el dashboard "Pruebas de Carga - Vista General" se provisiona automáticamente.

## Endpoints de la API

| Método | Ruta              | Descripción                              |
|--------|-------------------|------------------------------------------|
| POST   | /api/games        | Crea un nuevo juego                      |
| GET    | /api/games        | Devuelve la lista completa de juegos     |
| GET    | /api/games/:id    | Devuelve un juego por identificador      |
| PUT    | /api/games/:id    | Actualiza un juego existente             |
| DELETE | /api/games/:id    | Elimina un juego por identificador       |
| GET    | /health           | Health check del servicio                |

## Resultados obtenidos

| Métrica           | Prueba de carga | Prueba de estrés |
|-------------------|-----------------|-------------------|
| VUs máximo        | 100             | 600 (sostenidos)  |
| Total requests    | 84.800          | 327.686           |
| Throughput pico   | 45 req/s        | 240 req/s         |
| Latencia p95 máx  | 160 ms          | ~30 segundos      |
| Tasa de error     | 0,00 %          | 0,41 %            |
| Resultado         | Sistema sano    | Quiebre a 400 VUs |

El cuello de botella principal identificado es el pool de conexiones de la API (configurado en 10), que se saturó tempranamente sin que el hardware ni PostgreSQL alcanzaran su límite de capacidad.

Para detalles completos del análisis ver `docs/Informe-Pruebas-Carga-Estres.pdf`.

## Documentación adicional

- `docs/monitoring.md` — Guía de uso detallada del stack de monitoreo
- `docs/Informe-Pruebas-Carga-Estres.pdf` — Informe completo con resultados, análisis y recomendaciones
