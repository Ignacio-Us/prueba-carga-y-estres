/**
 * plan-estres.js
 * --------------------------------------------------------------
 * Prueba de ESTRES ESCALONADO: identifica el punto de quiebre del sistema
 * escalando progresivamente la carga en 7 escalones de 2 minutos cada uno:
 *
 *   Escalon 1:   50 VUs (baseline confirmado)
 *   Escalon 2:  100 VUs (carga objetivo, igual a plan-carga.js)
 *   Escalon 3:  200 VUs (doble de la carga objetivo)
 *   Escalon 4:  400 VUs (presion sobre el pool de conexiones)
 *   Escalon 5:  600 VUs (saturacion esperada del pool de Postgres)
 *   Escalon 6:  800 VUs (punto de quiebre esperado)
 *   Escalon 7: 1000 VUs (limite superior)
 *
 * Criterios de quiebre (primer evento que ocurra):
 *   - Error rate > 5% sostenido durante 30s
 *   - Latencia p95 > 2000ms sostenida durante 30s
 *   - Throughput cae mientras los VUs siguen subiendo (saturacion)
 *   - Errores de conexion (timeouts, ECONNREFUSED)
 *
 * A diferencia de plan-carga.js, este script TOLERA FALLOS: cada paso
 * del lifecycle se valida antes de continuar, evitando cascadas de error
 * en los escalones altos donde la API esta saturada.
 *
 * Los thresholds estan configurados como INFORMATIVOS (no abortan la
 * prueba), permitiendo que la corrida complete los ~18 minutos completos
 * para obtener la curva completa de degradacion.
 *
 * Ejecutar (Git Bash Windows, doble slash para evitar MSYS path conversion):
 *   docker compose -f docker-compose.monitoring.yml --profile tests \
 *     run --rm k6 run //scripts/plan-estres.js
 *
 * Ejecutar (Linux/Mac/PowerShell):
 *   docker compose -f docker-compose.monitoring.yml --profile tests \
 *     run --rm k6 run /scripts/plan-estres.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter, Rate } from 'k6/metrics';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// --- Metricas personalizadas por endpoint ---
const createDuration = new Trend('crud_create_duration', true);
const listDuration   = new Trend('crud_list_duration', true);
const readDuration   = new Trend('crud_read_duration', true);
const updateDuration = new Trend('crud_update_duration', true);
const deleteDuration = new Trend('crud_delete_duration', true);

// --- Contadores de errores por etapa (para diagnostico post-prueba) ---
const failedCreates = new Counter('stress_failed_creates');
const failedReads   = new Counter('stress_failed_reads');
const failedLists   = new Counter('stress_failed_lists');
const failedUpdates = new Counter('stress_failed_updates');
const failedDeletes = new Counter('stress_failed_deletes');
const iterationAborts = new Counter('stress_iteration_aborts');

// --- Tasa de exito para visualizar en Grafana ---
const successRate = new Rate('crud_success_rate');

// --- Carga de datos parametrizados ---
const games = new SharedArray('games', function () {
  const csv = open('/data/games.csv');
  return papaparse.parse(csv, { header: true, skipEmptyLines: true }).data;
});

// --- Configuracion de escalones ---
export const options = {
  scenarios: {
    estres_escalonado: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Calentamiento + Escalon 1: 50 VUs
        { duration: '30s', target: 50 },
        { duration: '2m',  target: 50 },
        // Escalon 2: 100 VUs
        { duration: '30s', target: 100 },
        { duration: '2m',  target: 100 },
        // Escalon 3: 200 VUs
        { duration: '30s', target: 200 },
        { duration: '2m',  target: 200 },
        // Escalon 4: 400 VUs
        { duration: '30s', target: 400 },
        { duration: '2m',  target: 400 },
        // Escalon 5: 600 VUs
        { duration: '30s', target: 600 },
        { duration: '2m',  target: 600 },
        // Escalon 6: 800 VUs
        { duration: '30s', target: 800 },
        { duration: '2m',  target: 800 },
        // Escalon 7: 1000 VUs
        { duration: '30s', target: 1000 },
        { duration: '2m',  target: 1000 },
        // Ramp-down
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  // Thresholds INFORMATIVOS (no abortan, solo se reportan al final)
  thresholds: {
    'http_req_failed':   [{ threshold: 'rate<0.50', abortOnFail: false }],
    'http_req_duration': [{ threshold: 'p(95)<5000', abortOnFail: false }],
    'crud_success_rate': [{ threshold: 'rate>0.50', abortOnFail: false }],
  },
  // Tags globales para distinguir esta prueba en Prometheus/Grafana
  tags: {
    test_type: 'stress',
    plan: 'plan-estres',
  },
};

// --- Helpers ---
const BASE_URL = __ENV.API_BASE_URL || 'http://juegos-api:3000';
const HEADERS = { 'Content-Type': 'application/json' };
// Timeout corto para que requests colgadas no bloqueen el VU
const TIMEOUT = '15s';

function buildPayload(game, suffix = '') {
  return JSON.stringify({
    nombre: `${game.nombre}-${__VU}-${__ITER}${suffix}`,
    genero: game.genero,
    plataforma: game.plataforma,
    fecha_lanzamiento: game.fecha_lanzamiento,
    precio: parseFloat(game.precio),
  });
}

// --- Lifecycle CRUD tolerante a fallos ---
export default function () {
  const game = games[Math.floor(Math.random() * games.length)];

  // 1) POST - Crear (si falla, abortar esta iteracion)
  const createRes = http.post(
    `${BASE_URL}/api/games`,
    buildPayload(game),
    { headers: HEADERS, timeout: TIMEOUT, tags: { endpoint: 'POST_games' } }
  );
  createDuration.add(createRes.timings.duration);
  const createOk = check(createRes, {
    'POST status is 201': (r) => r.status === 201,
  });
  if (!createOk) {
    failedCreates.add(1);
    iterationAborts.add(1);
    successRate.add(false);
    sleep(0.3);
    return;
  }
  const gameId = createRes.json('id');
  if (!gameId) {
    failedCreates.add(1);
    iterationAborts.add(1);
    successRate.add(false);
    sleep(0.3);
    return;
  }

  sleep(0.2);

  // 2) GET - Listado (no aborta si falla, continua con read)
  const listRes = http.get(`${BASE_URL}/api/games`, {
    timeout: TIMEOUT,
    tags: { endpoint: 'GET_games_list' },
  });
  listDuration.add(listRes.timings.duration);
  const listOk = check(listRes, {
    'GET list status is 200': (r) => r.status === 200,
  });
  if (!listOk) failedLists.add(1);

  sleep(0.2);

  // 3) GET - Por id
  const readRes = http.get(`${BASE_URL}/api/games/${gameId}`, {
    timeout: TIMEOUT,
    tags: { endpoint: 'GET_games_by_id' },
  });
  readDuration.add(readRes.timings.duration);
  const readOk = check(readRes, {
    'GET by id status is 200': (r) => r.status === 200,
  });
  if (!readOk) failedReads.add(1);

  sleep(0.2);

  // 4) PUT - Actualizar
  const updateRes = http.put(
    `${BASE_URL}/api/games/${gameId}`,
    buildPayload(game, '-upd'),
    { headers: HEADERS, timeout: TIMEOUT, tags: { endpoint: 'PUT_games' } }
  );
  updateDuration.add(updateRes.timings.duration);
  const updateOk = check(updateRes, {
    'PUT status is 200': (r) => r.status === 200,
  });
  if (!updateOk) failedUpdates.add(1);

  sleep(0.2);

  // 5) DELETE (intentar siempre para no dejar registros huerfanos)
  const deleteRes = http.del(`${BASE_URL}/api/games/${gameId}`, null, {
    timeout: TIMEOUT,
    tags: { endpoint: 'DELETE_games' },
  });
  deleteDuration.add(deleteRes.timings.duration);
  const deleteOk = check(deleteRes, {
    'DELETE status is 204': (r) => r.status === 204,
  });
  if (!deleteOk) failedDeletes.add(1);

  // Marcar exito solo si todos los pasos funcionaron
  const fullSuccess = createOk && listOk && readOk && updateOk && deleteOk;
  successRate.add(fullSuccess);

  sleep(0.5); // Think time entre iteraciones
}
