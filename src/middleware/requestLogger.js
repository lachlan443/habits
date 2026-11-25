const crypto = require('crypto');
const routeLabel = require('../utils/routeLabel');

// One structured log line per request, written when the response finishes.
// Fields: ts, request_id, method, route, status, duration_ms.
// Never logs bodies, cookies, headers or query strings.
//
// LOG_FORMAT=json (default) | text (human-readable, for local development)
function requestLogger({ format = process.env.LOG_FORMAT, write = console.log } = {}) {
  const text = format === 'text';

  return (req, res, next) => {
    const start = process.hrtime.bigint();

    // Accept a sane incoming id (from a proxy) so requests can be traced across services.
    const incoming = req.get('x-request-id');
    const requestId = incoming && /^[\w.-]{1,128}$/.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const entry = {
        ts: new Date().toISOString(),
        request_id: requestId,
        method: req.method,
        route: routeLabel(req),
        status: res.statusCode,
        duration_ms: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
      };
      write(text
        ? `${entry.ts} ${entry.method} ${entry.route} ${entry.status} ${entry.duration_ms}ms ${entry.request_id}`
        : JSON.stringify(entry));
    });

    next();
  };
}

module.exports = requestLogger;
