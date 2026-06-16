import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '30s', target: 5 },
        { duration: '5s',  target: 0 },
      ],
    },
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://juegos-api:3000';
const HEADERS = { 'Content-Type': 'application/json' };

export default function () {
  const createRes = http.post(
    `${BASE_URL}/api/games`,
    JSON.stringify({
      nombre: `Smoke-${__VU}-${__ITER}`,
      genero: 'Test',
      plataforma: 'PC',
      fecha_lanzamiento: '2024-01-01',
      precio: 9.99,
    }),
    { headers: HEADERS, tags: { endpoint: 'POST_smoke' } }
  );
  check(createRes, { 'POST 201': (r) => r.status === 201 });

  if (createRes.status === 201) {
    const id = createRes.json('id');
    http.del(`${BASE_URL}/api/games/${id}`, null, {
      tags: { endpoint: 'DELETE_smoke' },
    });
  }

  sleep(1);
}
