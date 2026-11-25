const crypto = require('crypto');
const routeLabel = require('./utils/routeLabel');
const { loadMetricsToken } = require('./config/sessionSecret');

// Prometheus metrics, opt-in via METRICS_ENABLED=true. When disabled this
// returns null, prom-client is never loaded and no route is added, so default
// behaviour and exposure are unchanged.
//
// When enabled, GET /metrics always requires "Authorization: Bearer <token>".
// The token comes from METRICS_TOKEN, or from an auto-generated mode-0600 file
// (METRICS_TOKEN_FILE, default /config/metrics_token.txt), the same pattern as
// the session secret.
function createMetrics(env = process.env, { collectDefault = true } = {}) {
  if (env.METRICS_ENABLED !== 'true') return null;

  const client = require('prom-client');
  const register = new client.Registry();
  if (collectDefault) client.collectDefaultMetrics({ register });

  const duration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  const token = loadMetricsToken(env);
  const digest = (s) => crypto.createHash('sha256').update(s).digest();
  const expected = digest(token);

  function authorized(req) {
    const header = req.get('authorization') || '';
    const match = /^Bearer (.+)$/.exec(header);
    // Compare fixed-length digests so the comparison is constant-time.
    return Boolean(match) && crypto.timingSafeEqual(digest(match[1]), expected);
  }

  return {
    register,
    middleware(req, res, next) {
      const start = process.hrtime.bigint();
      res.on('finish', () => {
        duration.observe(
          { method: req.method, route: routeLabel(req), status_code: res.statusCode },
          Number(process.hrtime.bigint() - start) / 1e9
        );
      });
      next();
    },
    async handler(req, res) {
      if (!authorized(req)) {
        res.set('WWW-Authenticate', 'Bearer');
        return res.status(401).json({ error: 'Unauthorized' });
      }
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    },
  };
}

module.exports = { createMetrics };
