const express = require('express');
const http = require('http');
const requestLogger = require('../requestLogger');

function start(logger) {
  const app = express();
  app.use(logger);
  const router = express.Router();
  router.get('/:id', (req, res) => res.json({ id: req.params.id }));
  app.use('/api/habits', router);
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function get(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: server.address().port, path, headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    }).on('error', reject);
  });
}

// The log line is written on 'finish', which can land just after the client sees the end.
const flush = () => new Promise((r) => setImmediate(r));

describe('requestLogger', () => {
  let server;
  afterEach(() => new Promise((r) => (server ? server.close(r) : r())));

  test('writes one JSON line with route pattern, status and duration', async () => {
    const lines = [];
    server = await start(requestLogger({ format: 'json', write: (l) => lines.push(l) }));
    const res = await get(server, '/api/habits/42?secret=1');
    await flush();

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(Object.keys(entry).sort()).toEqual(['duration_ms', 'method', 'request_id', 'route', 'status', 'ts']);
    expect(entry).toMatchObject({ method: 'GET', route: '/api/habits/:id', status: 200 });
    expect(entry.duration_ms).toBeGreaterThanOrEqual(0);
    expect(entry.request_id).toBe(res.headers['x-request-id']);
    // No raw id, query string, cookies or headers in the log.
    expect(lines[0]).not.toMatch(/42|secret/);
  });

  test('is JSON by default', async () => {
    const lines = [];
    server = await start(requestLogger({ write: (l) => lines.push(l) }));
    await get(server, '/api/habits/1');
    await flush();
    expect(() => JSON.parse(lines[0])).not.toThrow();
  });

  test('uses a sane incoming X-Request-Id and rejects unsafe ones', async () => {
    const lines = [];
    server = await start(requestLogger({ write: (l) => lines.push(l) }));
    const ok = await get(server, '/api/habits/1', { 'x-request-id': 'abc-123' });
    const bad = await get(server, '/api/habits/1', { 'x-request-id': 'bad id"with spaces' });
    await flush();
    expect(ok.headers['x-request-id']).toBe('abc-123');
    expect(bad.headers['x-request-id']).not.toBe('bad id"with spaces');
    expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('unmatched requests get a constant route label', async () => {
    const lines = [];
    server = await start(requestLogger({ write: (l) => lines.push(l) }));
    await get(server, '/nope/1234');
    await flush();
    expect(JSON.parse(lines[0])).toMatchObject({ route: 'unmatched', status: 404 });
  });

  test('text format is a single readable line', async () => {
    const lines = [];
    server = await start(requestLogger({ format: 'text', write: (l) => lines.push(l) }));
    await get(server, '/api/habits/7');
    await flush();
    expect(lines[0]).toMatch(/ GET \/api\/habits\/:id 200 [\d.]+ms [0-9a-f-]{36}$/);
  });
});
