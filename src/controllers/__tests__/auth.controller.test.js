const bcrypt = require('bcrypt');

jest.mock('bcrypt', () => ({
  hashSync: jest.fn(() => '$2b$10$dummyhash'),
  compare: jest.fn()
}));

jest.mock('../../config/database', () => ({
  get: jest.fn(),
  run: jest.fn()
}));

jest.mock('../../services/authService', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn()
}));

const db = require('../../config/database');
const { verifyPassword } = require('../../services/authService');
const { login, signup } = require('../auth.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mockReq(body = {}) {
  return { body, session: { regenerate: jest.fn() } };
}

describe('login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('runs bcrypt.compare against dummy hash when username does not exist', async () => {
    db.get.mockImplementation((sql, params, cb) => cb(null, undefined));

    const req = mockReq({ username: 'nonexistent', password: 'somepassword' });
    const res = mockRes();

    await login(req, res);

    expect(bcrypt.compare).toHaveBeenCalledWith('somepassword', expect.any(String));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  test('returns 401 with same message when password is wrong', async () => {
    const fakeUser = { id: 1, username: 'john', password_hash: '$2b$10$real', timezone: 'UTC', encryption_salt: 'salt', encrypted_master_key: 'key' };
    db.get.mockImplementation((sql, params, cb) => cb(null, fakeUser));
    verifyPassword.mockResolvedValue(false);

    const req = mockReq({ username: 'john', password: 'wrongpassword' });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
  });
});

describe('signup', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns generic Registration failed when username is taken', async () => {
    const { hashPassword } = require('../../services/authService');
    hashPassword.mockResolvedValue('$2b$10$hash');
    db.run.mockImplementation((sql, params, cb) => {
      cb({ message: 'UNIQUE constraint failed: users.username' });
    });

    const req = mockReq({
      username: 'takenuser',
      password: 'password123',
      timezone: 'Australia/Sydney',
      encryption_salt: 'salt',
      encrypted_master_key: 'key'
    });
    const res = mockRes();

    await signup(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Registration failed' });
  });
});
