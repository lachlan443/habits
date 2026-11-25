const express = require('express');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { createMetrics } = require('../metrics');

function start(metrics) {
  const app = express();
  app.use(metrics.middleware);
  app.get('/metrics', metrics.limiter, metrics.handler);
  const router = express.Router();
  router.get('/:id', (req, res) => res.json({ ok: true }));
  app.use('/api/habits', router);
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function get(server, path_, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: server.address().port, path: path_, headers }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

describe('createMetrics', () => {
  let dir;
  let server;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-')); });
  afterEach(async () => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (server) await new Promise((r) => server.close(r));
    server = undefined;
  });

  test('returns null when not enabled (nothing registered)', () => {
    expect(createMetrics({})).toBeNull();
    expect(createMetrics({ METRICS_ENABLED: 'false' })).toBeNull();
  });

  test('requires the bearer token and serves Prometheus text', async () => {
    const metrics = createMetrics({ METRICS_ENABLED: 'true', METRICS_TOKEN: 's3cret-token' }, { collectDefault: false });
    server = await start(metrics);
    await get(server, '/api/habits/1');
    await get(server, '/api/habits/2');

    expect((await get(server, '/metrics')).status).toBe(401);
    expect((await get(server, '/metrics', { authorization: 'Bearer wrong' })).status).toBe(401);
    expect((await get(server, '/metrics', { authorization: 's3cret-token' })).status).toBe(401);

    const ok = await get(server, '/metrics', { authorization: 'Bearer s3cret-token' });
    expect(ok.status).toBe(200);
    expect(ok.headers['content-type']).toMatch(/text\/plain/);
    // Route pattern label, so ids do not create a series per habit.
    expect(ok.body).toMatch(/http_request_duration_seconds_count\{method="GET",route="\/api\/habits\/:id",status_code="200"\} 2/);
    expect(ok.body).not.toMatch(/habits\/1"/);
  });

  test('generates a mode-0600 token file when no env var is set, and reuses it', async () => {
    const file = path.join(dir, 'metrics_token.txt');
    const env = { METRICS_ENABLED: 'true', METRICS_TOKEN_FILE: file };
    const metrics = createMetrics(env, { collectDefault: false });
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    const token = fs.readFileSync(file, 'utf8').trim();
    expect(token).toHaveLength(128);

    server = await start(metrics);
    expect((await get(server, '/metrics')).status).toBe(401);
    expect((await get(server, '/metrics', { authorization: `Bearer ${token}` })).status).toBe(200);

    // A second instance with the same file accepts the same token.
    createMetrics(env, { collectDefault: false });
    expect(fs.readFileSync(file, 'utf8').trim()).toBe(token);
  });

  test('METRICS_TOKEN env var wins and writes no file', () => {
    const file = path.join(dir, 'sub', 'metrics_token.txt');
    createMetrics({ METRICS_ENABLED: 'true', METRICS_TOKEN: 'abc', METRICS_TOKEN_FILE: file }, { collectDefault: false });
    expect(fs.existsSync(path.dirname(file))).toBe(false);
  });
});
