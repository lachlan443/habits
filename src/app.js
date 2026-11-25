const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth.routes');
const habitRoutes = require('./routes/habits.routes');
const completionRoutes = require('./routes/completions.routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { createMetrics } = require('./metrics');

const app = express();

app.set('trust proxy', 1);

// Structured request logs, and opt-in Prometheus metrics (METRICS_ENABLED=true).
// First in the stack so every request is covered, including rejected ones.
app.use(requestLogger());
const metrics = createMetrics();
if (metrics) {
  app.use(metrics.middleware);
  app.get('/metrics', metrics.limiter, metrics.handler);
}

app.use(helmet());

const DB_PATH = process.env.DB_PATH ||
  (process.env.NODE_ENV === 'production' ? '/config/habits.db' : path.join(__dirname, '../data/habits.db'));
const DATA_DIR = path.dirname(DB_PATH);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: DATA_DIR
  }),
  secret: process.env.SESSION_SECRET,
  name: 'habits.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/completions', completionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
