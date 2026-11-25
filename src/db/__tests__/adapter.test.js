const sqlite3 = require('sqlite3');
const {
  createAdapter,
  createPostgresAdapter,
  translatePlaceholders,
} = require('../adapter');

describe('translatePlaceholders', () => {
  test('numbers ? placeholders in order', () => {
    expect(translatePlaceholders('SELECT * FROM t WHERE a = ? AND b = ?'))
      .toBe('SELECT * FROM t WHERE a = $1 AND b = $2');
  });

  test('leaves SQL without placeholders unchanged', () => {
    expect(translatePlaceholders('SELECT 1')).toBe('SELECT 1');
  });

  test('ignores ? inside quoted strings, identifiers and comments', () => {
    const sql = [
      "SELECT 'what?', 'it''s ?', \"col?\" FROM t -- why?",
      'WHERE a = ? /* really? */ AND b = $$?$$ AND c = $x$?$x$ AND d = ?',
    ].join('\n');
    expect(translatePlaceholders(sql)).toBe([
      "SELECT 'what?', 'it''s ?', \"col?\" FROM t -- why?",
      'WHERE a = $1 /* really? */ AND b = $$?$$ AND c = $x$?$x$ AND d = $2',
    ].join('\n'));
  });
});

describe('SQLite adapter (DATABASE_URL unset)', () => {
  let db;
  let adapter;

  beforeEach(() => {
    db = new sqlite3.Database(':memory:');
    adapter = createAdapter({ databaseUrl: '', sqliteDb: db });
  });

  afterEach(() => adapter.close());

  test('uses sqlite dialect', () => {
    expect(adapter.dialect).toBe('sqlite');
  });

  test('run/get/all behave like the existing helpers', async () => {
    await adapter.run('CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, v TEXT)');
    const ins = await adapter.run('INSERT INTO t (v) VALUES (?)', ['a']);
    expect(ins).toEqual({ lastID: 1, changes: 1 });
    await adapter.run('INSERT INTO t (v) VALUES (?)', ['b']);

    expect(await adapter.get('SELECT v FROM t WHERE id = ?', [2])).toEqual({ v: 'b' });
    expect(await adapter.get('SELECT v FROM t WHERE id = ?', [99])).toBeUndefined();
    expect(await adapter.all('SELECT v FROM t ORDER BY id')).toEqual([{ v: 'a' }, { v: 'b' }]);
  });

  test('rejects on SQL errors', async () => {
    await expect(adapter.get('SELECT * FROM missing')).rejects.toThrow(/no such table/);
  });
});

describe('Postgres adapter (DATABASE_URL set)', () => {
  function fakePool(result) {
    return { query: jest.fn().mockResolvedValue(result), end: jest.fn().mockResolvedValue() };
  }

  test('translates placeholders and maps results', async () => {
    const pool = fakePool({ rows: [{ id: 7 }], rowCount: 1 });
    const adapter = createAdapter({ databaseUrl: 'postgres://x', pool });
    expect(adapter.dialect).toBe('postgres');

    const res = await adapter.run('INSERT INTO t (a, b) VALUES (?, ?) RETURNING id', [1, 2]);
    expect(pool.query).toHaveBeenCalledWith('INSERT INTO t (a, b) VALUES ($1, $2) RETURNING id', [1, 2]);
    expect(res).toEqual({ lastID: 7, changes: 1 });

    expect(await adapter.get('SELECT ?', [1])).toEqual({ id: 7 });
    expect(await adapter.all('SELECT ?', [1])).toEqual([{ id: 7 }]);

    await adapter.close();
    expect(pool.end).toHaveBeenCalled();
  });

  test('get returns undefined for no rows', async () => {
    const adapter = createPostgresAdapter(fakePool({ rows: [], rowCount: 0 }));
    expect(await adapter.get('SELECT 1 WHERE false')).toBeUndefined();
  });

  // Real-server check; runs only when TEST_DATABASE_URL points at a Postgres,
  // e.g. `docker compose --profile postgres up -d postgres` then
  // TEST_DATABASE_URL=postgres://habits:habits@localhost:5432/habits npm test
  const maybe = process.env.TEST_DATABASE_URL ? test : test.skip;
  maybe('SELECT 1 works against a real Postgres', async () => {
    const adapter = createAdapter({ databaseUrl: process.env.TEST_DATABASE_URL });
    try {
      expect(await adapter.get('SELECT 1 AS one')).toEqual({ one: 1 });
      expect(await adapter.get('SELECT ?::int + ?::int AS sum', [2, 3])).toEqual({ sum: 5 });
    } finally {
      await adapter.close();
    }
  });
});
