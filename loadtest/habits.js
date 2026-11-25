// k6 load test for the habits API: signup/login, list habits, mark completion, fetch stats.
//
// Usage:
//   k6 run loadtest/habits.js                                  # ramp profile, 5 peak VUs
//   k6 run -e PROFILE=spike -e PEAK_VUS=15 loadtest/habits.js
//   k6 run -e BASE_URL=http://localhost:7161 loadtest/habits.js
//
// Env: BASE_URL (default http://localhost:7161), PROFILE (ramp|spike, default ramp),
//      PEAK_VUS (default 5).
//
// PBKDF2 runs in the browser, so the server load here is bcrypt (login/signup) plus API and
// DB work. Habit names are sent as opaque placeholder ciphertext; the server never decrypts them.
//
// Note: /api/auth/login and /api/auth/signup share a rate limit of 20 requests per 15 minutes
// per IP. To stay under it, one account is created in setup() and each VU logs in once and
// reuses its session cookie, so PEAK_VUS must stay below ~19 and repeated runs inside the
// same 15 minutes will hit 429s. Restart the server between runs if that happens.
// Note: the session cookie is `secure` when NODE_ENV=production, so run against http:// only
// with a non-production server.
import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:7161';
const PROFILE = __ENV.PROFILE || 'ramp';
const PEAK = parseInt(__ENV.PEAK_VUS || '5', 10);

const PROFILES = {
  ramp: [
    { duration: '20s', target: PEAK },
    { duration: '40s', target: PEAK },
    { duration: '10s', target: 0 },
  ],
  spike: [
    { duration: '10s', target: 1 },
    { duration: '5s', target: PEAK },
    { duration: '20s', target: PEAK },
    { duration: '5s', target: 1 },
    { duration: '10s', target: 0 },
  ],
};

if (!PROFILES[PROFILE]) {
  throw new Error(`Unknown PROFILE "${PROFILE}" (expected ramp or spike)`);
}

export const options = {
  stages: PROFILES[PROFILE],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

function post(path, body) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), JSON_HEADERS);
}

// Placeholder for the client-side encrypted values; the server treats them as opaque strings.
function fakeCiphertext(len) {
  return 'A'.repeat(len);
}

export function setup() {
  const username = `lt_${Date.now().toString(36)}`;
  const password = 'loadtest-password';
  const res = post('/api/auth/signup', {
    username,
    password,
    timezone: 'UTC',
    encryption_salt: fakeCiphertext(24),
    encrypted_master_key: fakeCiphertext(64),
  });
  if (res.status !== 201 && res.status !== 200) {
    fail(`signup failed with status ${res.status}`);
  }
  return { username, password };
}

let habitId = null; // per-VU state: each VU keeps its own session cookie and habit

export default function (data) {
  if (habitId === null) {
    group('login', () => {
      const res = post('/api/auth/login', { username: data.username, password: data.password });
      check(res, { 'login 200': (r) => r.status === 200 });
    });
    group('create habit', () => {
      const res = post('/api/habits', {
        name: fakeCiphertext(40),
        color: '#FF5733',
        frequency_type: 'daily',
      });
      check(res, { 'create habit 201': (r) => r.status === 201 });
      if (res.status === 201) habitId = res.json('habit.id');
    });
    if (habitId === null) {
      sleep(1);
      return;
    }
  }

  group('list habits', () => {
    const res = http.get(`${BASE_URL}/api/habits`);
    check(res, { 'list habits 200': (r) => r.status === 200 });
  });

  group('mark completion', () => {
    // Random date within the last year so repeated iterations upsert different rows.
    const d = new Date(Date.now() - Math.floor(Math.random() * 365) * 86400000);
    const res = post('/api/completions', {
      habit_id: habitId,
      date: d.toISOString().slice(0, 10),
      status: 'completed',
    });
    check(res, { 'completion ok': (r) => r.status === 200 || r.status === 201 });
  });

  group('fetch stats', () => {
    const res = http.get(`${BASE_URL}/api/habits/${habitId}/stats`);
    check(res, { 'stats 200': (r) => r.status === 200 });
  });

  sleep(1);
}
