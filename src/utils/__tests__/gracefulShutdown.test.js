const http = require('http');
const { createShutdownHandler } = require('../gracefulShutdown');

const silent = { log: () => {}, error: () => {} };

function listen(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function get(port) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/' }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function fakeDb() {
  return { closed: false, close(cb) { this.closed = true; cb(null); } };
}

describe('createShutdownHandler', () => {
  test('lets an in-flight slow request finish before exiting 0', async () => {
    let requestStarted;
    const started = new Promise((r) => { requestStarted = r; });
    const events = [];
    const server = await listen((req, res) => {
      requestStarted();
      res.on('finish', () => events.push('response sent'));
      setTimeout(() => res.end('done'), 300);
    });
    const { port } = server.address();
    const db = fakeDb();
    let exited;
    const exitCode = new Promise((r) => { exited = r; });

    const shutdown = createShutdownHandler({
      server,
      db,
      logger: silent,
      exit: (code) => { events.push(`exit:${code}`); exited(code); },
    });

    const response = get(port);
    await started;
    shutdown('SIGTERM');

    // No new connections are accepted once shutdown has started.
    await expect(get(port)).rejects.toThrow();

    await expect(response).resolves.toEqual({ status: 200, body: 'done' });
    await expect(exitCode).resolves.toBe(0);
    expect(events).toEqual(['response sent', 'exit:0']);
    expect(db.closed).toBe(true);
  });

  test('does not wait for keep-alive sockets once their request is done', async () => {
    const server = await listen((req, res) => setTimeout(() => res.end('ok'), 200));
    server.keepAliveTimeout = 10000;
    const { port } = server.address();
    const agent = new http.Agent({ keepAlive: true });
    let exited;
    const exitCode = new Promise((r) => { exited = r; });
    const shutdown = createShutdownHandler({
      server, db: fakeDb(), timeoutMs: 5000, logger: silent, exit: exited,
    });

    const response = new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path: '/', agent }, (res) => {
        res.resume();
        res.on('end', resolve);
      }).on('error', reject);
    });
    await new Promise((r) => server.once('request', r));
    shutdown('SIGTERM');
    await response;
    const doneAt = Date.now();

    await expect(exitCode).resolves.toBe(0);
    expect(Date.now() - doneAt).toBeLessThan(1000);
    agent.destroy();
  });

  test('forces exit 1 after the timeout if a request never finishes', async () => {
    const server = await listen(() => { /* never responds */ });
    const { port } = server.address();
    const req = http.get({ host: '127.0.0.1', port, path: '/' });
    req.on('error', () => {});
    await new Promise((r) => server.once('request', r));

    let exited;
    const exitCode = new Promise((r) => { exited = r; });
    const shutdown = createShutdownHandler({
      server, db: fakeDb(), timeoutMs: 100, logger: silent, exit: exited,
    });
    shutdown('SIGTERM');

    await expect(exitCode).resolves.toBe(1);
    server.closeAllConnections();
  });

  test('ignores repeated signals', async () => {
    const server = await listen((req, res) => res.end());
    const exit = jest.fn();
    let closes = 0;
    const db = { close(cb) { closes += 1; cb(null); } };
    const shutdown = createShutdownHandler({ server, db, logger: silent, exit });
    shutdown('SIGTERM');
    shutdown('SIGINT');
    await new Promise((r) => setTimeout(r, 50));
    expect(closes).toBe(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });
});
