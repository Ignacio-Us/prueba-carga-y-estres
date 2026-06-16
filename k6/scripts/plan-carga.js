import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter } from 'k6/metrics';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// ─── Métricas personalizadas por endpoint ──────────────────────────
const createDuration = new Trend('crud_create_duration', true);
const listDuration   = new Trend('crud_list_duration', true);
const readDuration   = new Trend('crud_read_duration', true);
const updateDuration = new Trend('crud_update_duration', true);
const deleteDuration = new Trend('crud_delete_duration', true);
const businessErrors = new Counter('business_errors');

// ─── Carga de datos parametrizados desde CSV ───────────────────────
const games = new SharedArray('games', function () {
  const csv = open('/data/games.csv');
  return papaparse.parse(csv, { header: true, skipEmptyLines: true }).data;
});

// ─── Configuración de la prueba ────────────────────────────────────
export const options = {
  scenarios: {
    carga_sostenida: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },   // Ramp-up gradual
        { duration: '10m', target: 100 },   // Carga sostenida (objetivo del enunciado)
        { duration: '30s', target: 0 },     // Ramp-down ordenado
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Criterios de aceptación globales
    'http_req_failed':         ['rate<0.05'],        // <5% errores HTTP
    'http_req_duration':       ['p(95)<2000'],       // p95 global <2s
    // Por endpoint (más estrictos en reads)
    'crud_create_duration':    ['p(95)<1500'],
    'crud_read_duration':      ['p(95)<500'],
    'crud_list_duration':      ['p(95)<800'],
    'crud_update_duration':    ['p(95)<1500'],
    'crud_delete_duration':    ['p(95)<800'],
    'business_errors':         ['count<50'],
  },
  // Tags útiles para filtrar en Grafana
  tags: {
    test_type: 'load',
    plan: 'plan-carga',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────
const BASE_URL = __ENV.API_BASE_URL || 'http://juegos-api:3000';
const HEADERS = { 'Content-Type': 'application/json' };

function buildPayload(game, suffix = '') {
  return JSON.stringify({
    nombre: `${game.nombre}-${__VU}-${__ITER}${suffix}`,
    genero: game.genero,
    plataforma: game.plataforma,
    fecha_lanzamiento: game.fecha_lanzamiento,
    precio: parseFloat(game.precio),
  });
}

// ─── Lifecycle CRUD por VU ─────────────────────────────────────────
export default function () {
  const game = games[Math.floor(Math.random() * games.length)];

  // 1) POST - Crear
  const createRes = http.post(
    `${BASE_URL}/api/games`,
    buildPayload(game),
    { headers: HEADERS, tags: { endpoint: 'POST_games' } }
  );
  createDuration.add(createRes.timings.duration);
  const created = check(createRes, {
    'POST status is 201':        (r) => r.status === 201,
    'POST returns id':           (r) => r.json('id') !== undefined,
  });
  if (!created) {
    businessErrors.add(1);
    return; // Sin id no tiene sentido seguir
  }
  const gameId = createRes.json('id');

  sleep(0.3);

  // 2) GET - Listado
  const listRes = http.get(`${BASE_URL}/api/games`, {
    tags: { endpoint: 'GET_games_list' },
  });
  listDuration.add(listRes.timings.duration);
  check(listRes, {
    'GET list status is 200': (r) => r.status === 200,
    'GET list is array':      (r) => Array.isArray(r.json()),
  });

  sleep(0.3);

  // 3) GET - Por id
  const readRes = http.get(`${BASE_URL}/api/games/${gameId}`, {
    tags: { endpoint: 'GET_games_by_id' },
  });
  readDuration.add(readRes.timings.duration);
  check(readRes, {
    'GET by id status is 200':    (r) => r.status === 200,
    'GET by id matches gameId':   (r) => r.json('id') === gameId,
  });

  sleep(0.3);

  // 4) PUT - Actualizar
  const updateRes = http.put(
    `${BASE_URL}/api/games/${gameId}`,
    buildPayload(game, '-upd'),
    { headers: HEADERS, tags: { endpoint: 'PUT_games' } }
  );
  updateDuration.add(updateRes.timings.duration);
  check(updateRes, {
    'PUT status is 200': (r) => r.status === 200,
  });

  sleep(0.3);

  // 5) DELETE
  const deleteRes = http.del(`${BASE_URL}/api/games/${gameId}`, null, {
    tags: { endpoint: 'DELETE_games' },
  });
  deleteDuration.add(deleteRes.timings.duration);
  check(deleteRes, {
    'DELETE status is 204': (r) => r.status === 204,
  });

  sleep(1); // Pausa entre iteraciones del mismo VU (think time)
}
