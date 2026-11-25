// Graceful shutdown for SIGTERM (docker stop, Kubernetes pod termination) and
// SIGINT (Ctrl-C). Stops accepting new connections, lets in-flight requests
// finish, closes the database, then exits 0. If that takes longer than
// `timeoutMs` the process exits 1 anyway so it never hangs.

const DEFAULT_TIMEOUT_MS = 10000;

function closeSqlite(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

function createShutdownHandler({
  server,
  db,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  exit = (code) => process.exit(code),
  logger = console,
}) {
  let shuttingDown = false;

  return function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`${signal} received, shutting down gracefully`);

    const timer = setTimeout(() => {
      logger.error(`Shutdown timed out after ${timeoutMs}ms, forcing exit`);
      exit(1);
    }, timeoutMs);
    timer.unref();

    // server.close() stops accepting connections, closes idle keep-alive
    // sockets and calls back once every connection has gone. Sockets that
    // finish their in-flight request afterwards would otherwise linger until
    // keepAliveTimeout, so keep closing idle ones while we wait.
    const idleSweep = setInterval(() => server.closeIdleConnections(), 100);
    idleSweep.unref();

    new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    })
      .finally(() => clearInterval(idleSweep))
      .then(() => (db ? closeSqlite(db) : undefined))
      .then(() => {
        clearTimeout(timer);
        logger.log('Shutdown complete');
        exit(0);
      })
      .catch((err) => {
        clearTimeout(timer);
        logger.error('Error during shutdown:', err);
        exit(1);
      });
  };
}

module.exports = { createShutdownHandler, DEFAULT_TIMEOUT_MS };
