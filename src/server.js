const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 7160 : 7161);
const { loadSessionSecret } = require('./config/sessionSecret');

// Must run synchronously before app.js is required — app.js reads SESSION_SECRET at module load time
process.env.SESSION_SECRET = loadSessionSecret();

const app = require('./app');
const { runMigrations } = require('./db/migrations');
const db = require('./config/database');
const { createShutdownHandler } = require('./utils/gracefulShutdown');

async function start() {
  try {
    await runMigrations();
    if (process.env.NODE_ENV !== 'production') {
      const { seedDevUser } = require('./db/seed');
      await seedDevUser();
    }
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DB_PATH || 'data/habits.db'}`);
    });
    const shutdown = createShutdownHandler({ server, db });
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
