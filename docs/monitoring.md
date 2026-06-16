# Stack de Monitoreo y Pruebas de Carga

Infraestructura para pruebas de carga y estrés sobre la API de juegos usando **K6 + Prometheus + Grafana + postgres_exporter + cAdvisor**.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  Red Docker: prueba-carga-network                               │
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐                         │
│  │ juegos-api   │◄─────┤     k6       │  (lifecycle CRUD)       │
│  │  :3000       │      │  (on-demand) │                         │
│  └───────┬──────┘      └──────┬───────┘                         │
│          │                    │                                 │
│  ┌───────▼──────┐             │ remote_write                    │
│  │juegos-postgr.│             │                                 │
│  │  :5432       │             ▼                                 │
│  └───────┬──────┘      ┌──────────────┐    ┌──────────────┐    │
│          │             │  prometheus  │◄───┤   grafana    │    │
│          │             │   :9090      │    │  :3000→3030  │    │
│          │             └──────┬───────┘    └──────────────┘    │
│          │                    │                                 │
│  ┌───────▼──────┐      ┌──────▼───────┐                         │
│  │ postgres_exp │─────►│   cadvisor   │                         │
│  │   :9187      │      │    :8080     │                         │
│  └──────────────┘      └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## Pre-requisitos

- Docker + Docker Compose v2
- Archivo `.env` configurado (ver `.env.example` en raíz del repo)
- La API y Postgres deben usar la red `prueba-carga-network` (ya configurado en el `docker-compose.yml` principal)

## Levantar el entorno

**Orden estricto** (la red la crea el compose principal):

```bash
# 1. Levantar API + Postgres (crea la red prueba-carga-network)
docker compose up -d

# 2. Verificar que la red existe
docker network ls | grep prueba-carga-network

# 3. Levantar el stack de monitoreo
docker compose -f docker-compose.monitoring.yml up -d

# 4. Verificar que todos los contenedores corren
docker compose -f docker-compose.monitoring.yml ps
```

## Acceder a las UIs

| Servicio       | URL                       | Credenciales    |
|----------------|---------------------------|-----------------|
| API            | http://localhost:3000     | —               |
| Grafana        | http://localhost:3030     | admin / admin   |
| Prometheus     | http://localhost:9090     | —               |
| postgres_exp.  | http://localhost:9187/metrics | —           |
| cAdvisor       | http://localhost:8080     | —               |

En Grafana → Dashboards → "Pruebas de Carga - Vista General" (auto-provisionado).

## Ejecutar la prueba de carga

```bash
docker compose -f docker-compose.monitoring.yml \
  --profile tests run --rm k6 run /scripts/plan-carga.js
```

**Mientras corre:**
- Abre Grafana → dashboard se actualiza cada 5s con métricas en vivo
- K6 imprime resumen en consola al finalizar

**Parámetros de la prueba (definidos en `plan-carga.js`):**
- Ramp-up: 30s → 100 VUs
- Sostenido: 10 min @ 100 VUs
- Ramp-down: 30s → 0
- Lifecycle por VU: POST → GET list → GET by id → PUT → DELETE

**Thresholds (criterios de aceptación):**
- Error rate < 5%
- p95 global < 2000ms
- p95 lectura < 500ms
- p95 escritura < 1500ms

## Detener el entorno

```bash
# Bajar monitoreo (sin perder datos de Prometheus/Grafana)
docker compose -f docker-compose.monitoring.yml down

# Bajar monitoreo + limpiar datos persistidos
docker compose -f docker-compose.monitoring.yml down -v

# Bajar API
docker compose down
```

## Limpieza entre runs

La BD acumula datos huérfanos si una prueba se interrumpe. Para limpiar:

```bash
docker exec -it juegos-postgres psql -U postgres-carga -d juegos-carga \
  -c "TRUNCATE juegos RESTART IDENTITY;"
```

## Notas técnicas

- **cAdvisor en Docker Desktop Windows:** funciona pero con limitaciones — algunas métricas de filesystem y red pueden venir vacías. CPU y memoria de contenedores se reportan correctamente.
- **Prometheus remote_write:** habilitado vía `--web.enable-remote-write-receiver`. K6 envía métricas cada 5s al endpoint `/api/v1/write`.
- **K6 con profile `tests`:** no arranca con `up`. Se invoca on-demand con `--profile tests run --rm`.
- **Sin paginación en GET /api/games:** la lista crece linealmente durante la prueba antes del DELETE. Es un cuello de botella conocido de la API base.

## Estructura del directorio

```
.
├── docker-compose.yml                    # Principal (API + Postgres)
├── docker-compose.monitoring.yml         # Stack de monitoreo + K6
├── monitoring/
│   ├── prometheus/prometheus.yml         # Scrape config + remote_write
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/datasource.yml
│       │   └── dashboards/dashboards.yml
│       └── dashboards/load-test-overview.json
└── k6/
    ├── scripts/plan-carga.js             # Lifecycle CRUD
    └── data/games.csv                    # Datos parametrizados
```
