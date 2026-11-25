// Database adapter: one small promise-based run/get/all API over either
// SQLite (default, unchanged) or Postgres (opt-in via DATABASE_URL).
//
// - DATABASE_URL unset: wraps the existing sqlite3 connection from
//   src/config/database.js (DB_PATH, PRAGMAs etc. exactly as before).
// - DATABASE_URL set: uses a pg connection pool. `?` placeholders are
//   translated to $1..$n so callers can keep writing SQLite-style SQL.
//
// Nothing in the app uses this module yet; queries are migrated separately.

/**
 * Translate SQLite-style `?` placeholders to Postgres `$1..$n`.
 * `?` inside single-quoted strings, double-quoted identifiers, dollar-quoted
 * strings, and `--` / block comments is left untouched.
 */
function translatePlaceholders(sql) {
  let out = '';
  let n = 0;
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "'" || ch === '"') {
      // Quoted string / identifier; a doubled quote is an escaped quote.
      let j = i + 1;
      while (j < len) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) { j += 2; continue; }
          break;
        }
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', i);
      const j = end === -1 ? len : end;
      out += sql.slice(i, j);
      i = j;
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      const j = end === -1 ? len : end + 2;
      out += sql.slice(i, j);
      i = j;
    } else if (ch === '$') {
      // Dollar-quoted string: $$...$$ or $tag$...$tag$
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const j = end === -1 ? len : end + tag.length;
        out += sql.slice(i, j);
        i = j;
      } else {
        out += ch;
        i++;
      }
    } else if (ch === '?') {
      n++;
      out += '$' + n;
      i++;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function createSqliteAdapter(db) {
  return {
    dialect: 'sqlite',
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
      });
    },
    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        db.close(err => (err ? reject(err) : resolve()));
      });
    },
  };
}

function createPostgresAdapter(pool) {
  const query = (sql, params = []) => pool.query(translatePlaceholders(sql), params);
  return {
    dialect: 'postgres',
    async run(sql, params = []) {
      const res = await query(sql, params);
      // Postgres has no implicit last insert id; use `RETURNING id` to get one.
      const first = res.rows && res.rows[0];
      return {
        lastID: first && first.id !== undefined ? first.id : undefined,
        changes: res.rowCount,
      };
    },
    async get(sql, params = []) {
      const res = await query(sql, params);
      return res.rows[0];
    },
    async all(sql, params = []) {
      const res = await query(sql, params);
      return res.rows;
    },
    close() {
      return pool.end();
    },
  };
}

/**
 * Build an adapter. With no DATABASE_URL, wraps the existing SQLite
 * connection. Dependencies are only loaded for the backend in use, so
 * SQLite deployments never load `pg` and Postgres ones never open DB_PATH.
 */
function createAdapter({ databaseUrl = process.env.DATABASE_URL, sqliteDb, pool } = {}) {
  if (databaseUrl) {
    if (!pool) {
      const { Pool } = require('pg');
      pool = new Pool({ connectionString: databaseUrl });
    }
    return createPostgresAdapter(pool);
  }
  return createSqliteAdapter(sqliteDb || require('../config/database'));
}

let defaultAdapter;
function getAdapter() {
  if (!defaultAdapter) defaultAdapter = createAdapter();
  return defaultAdapter;
}

module.exports = {
  getAdapter,
  createAdapter,
  createSqliteAdapter,
  createPostgresAdapter,
  translatePlaceholders,
};
