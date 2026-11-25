// Low-cardinality label for a request, for logs and metrics: the matched Express
// route pattern (e.g. "/api/habits/:id"), never the raw path with ids in it.
// Call after the response has finished, when req.route is populated.
function routeLabel(req) {
  if (req.route && req.route.path !== undefined) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }
  return 'unmatched';
}

module.exports = routeLabel;
