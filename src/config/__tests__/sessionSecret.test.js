const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadSessionSecret } = require('../sessionSecret');

describe('loadSessionSecret', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  test('uses env var and writes no files', () => {
    const file = path.join(dir, 'sub', 'secret.txt');
    const secret = loadSessionSecret({ SESSION_SECRET: ' abc ', SESSION_SECRET_FILE: file });
    expect(secret).toBe('abc');
    expect(fs.existsSync(path.dirname(file))).toBe(false);
  });

  test('generates and reuses file when env var unset', () => {
    const file = path.join(dir, 'secret.txt');
    const first = loadSessionSecret({ SESSION_SECRET_FILE: file });
    expect(first).toHaveLength(128);
    expect(loadSessionSecret({ SESSION_SECRET_FILE: file })).toBe(first);
  });
});
