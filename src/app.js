const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const habitRoutes = require('./routes/habits.routes');
const completionRoutes = require('./routes/completions.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/config'
  : path.join(__dirname, '../data');

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

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/completions', completionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;
