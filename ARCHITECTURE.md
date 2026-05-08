# Habits Tracker — Architecture

## Core Security Goal

As the server operator, there is no way to read a user's habit names without their plaintext password. The server stores only encrypted data and is cryptographically blind to habit content.

## The Encryption Chain

```
password → [PBKDF2] → password_key → [AES-GCM decrypt] → master_key → [AES-GCM decrypt] → habit name
```

The server holds `encrypted_master_key`, `encryption_salt`, and encrypted habit names — but not the password. Without the password, every step in the chain is blocked.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Auth mechanism | Session cookie (HttpOnly) | More secure than localStorage JWT |
| Password hashing | Plaintext over HTTPS, bcrypt server-side | Client-side bcrypt adds no security |
| Encryption key | Independent random master key | Password changes don't require re-encrypting all habits |
| Encrypted fields | `name` only | `frequency_type` and `frequency_days` are scheduling metadata, not sensitive content — keeping them plaintext allows server-side streak calculation without fetching full history |
| Streak calculation | Server-side | Client-side would require fetching all completions (e.g. 600-day streak = 600 days of data) |
| Key persistence | Memory + IndexedDB cache (see below) | Survives page refresh without re-login |

---

## Cryptographic Flows

### Signup

```
User enters: username, password, timezone
  ↓
[CLIENT] Generate random master_key (256-bit)
[CLIENT] Generate random encryption_salt (16 bytes)
[CLIENT] Derive password_key = PBKDF2(password, encryption_salt, 600k iterations, SHA-256)
[CLIENT] encrypted_master_key = AES-256-GCM(master_key, password_key)
[CLIENT] Send to server: { username, password, timezone, encryption_salt, encrypted_master_key }
  ↓
[SERVER] Hash password with bcrypt
[SERVER] Store user: { username, password_hash, timezone, encryption_salt, encrypted_master_key }
[SERVER] Create session, set HttpOnly cookie
  ↓
[CLIENT] Store master_key in memory (Zustand)
[CLIENT] Write IndexedDB cache entry (see Key Persistence below)
```

### Login

```
User enters: username, password
  ↓
[CLIENT] Send to server: { username, password }
  ↓
[SERVER] Verify password against bcrypt hash
[SERVER] Return: { user, encryption_salt, encrypted_master_key }
[SERVER] Set HttpOnly session cookie
  ↓
[CLIENT] Derive password_key = PBKDF2(password, encryption_salt, 600k iterations)
[CLIENT] Decrypt master_key = AES-256-GCM-decrypt(encrypted_master_key, password_key)
[CLIENT] Store master_key in memory (Zustand)
[CLIENT] Write IndexedDB cache entry (see Key Persistence below)
```

### Habit Encryption

```
[CLIENT] name = "Exercise"
[CLIENT] encrypted_name = AES-256-GCM(name, master_key)
[CLIENT] Send to server: { encrypted_name, frequency_type, frequency_days, color, ... }
  ↓
[SERVER] Stores encrypted_name as opaque blob
[SERVER] Can read and use frequency_type, frequency_days, color for queries/streak calc
  ↓
[CLIENT] On fetch: decrypt each habit name with master_key before displaying
```

### Password Change

```
User enters: old_password, new_password
  ↓
[CLIENT] Derive old_password_key = PBKDF2(old_password, current_salt)
[CLIENT] Try to decrypt master_key with old_password_key
         → If auth tag fails: return "Incorrect password"
[CLIENT] Generate new_salt (random 16 bytes)
[CLIENT] Derive new_password_key = PBKDF2(new_password, new_salt, 600k iterations)
[CLIENT] new_encrypted_master_key = AES-256-GCM(master_key, new_password_key)
[CLIENT] Send to server: { old_password, new_password, new_salt, new_encrypted_master_key }
  ↓
[SERVER] Verify old_password against bcrypt hash → 401 if wrong
[SERVER] Update user: { password_hash, encryption_salt, encrypted_master_key }
         No habits touched — master_key is unchanged, only its wrapper changed
  ↓
[CLIENT] Update Zustand state (salt, encrypted_master_key)
         master_key stays in memory — no re-encryption needed
```

---

## Key Persistence

The master key lives in memory (Zustand). To survive page refreshes without re-login, it is cached using a split-storage approach — neither piece alone can reconstruct the master key.

```
Login:
  - Generate random session_key = crypto.getRandomValues(32 bytes)
  - Store session_key in sessionStorage
  - Store AES-GCM(master_key, session_key) in IndexedDB

Page refresh (same tab):
  - sessionStorage still has session_key ✓
  - Decrypt master_key from IndexedDB ✓
  - No password needed, no server call

Tab close / new tab:
  - sessionStorage cleared → IndexedDB entry is useless without session_key
  - User must re-login (PBKDF2 runs once, ~1 second)

Logout:
  - Delete IndexedDB entry
  - Clear sessionStorage
  - Clear Zustand state
```

**Why split storage?** An attacker needs both the IndexedDB blob (persistent) and the session_key (tab-scoped, cleared on close) to reconstruct the master key. Neither piece is useful on its own.

---

## Database Schema

```sql
CREATE TABLE users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  username             TEXT UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  encryption_salt      TEXT NOT NULL,        -- base64, 16 random bytes
  encrypted_master_key TEXT NOT NULL,        -- base64, AES-wrapped master key
  timezone             TEXT DEFAULT 'UTC',
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE habits (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL,
  name           TEXT NOT NULL,              -- AES-256-GCM encrypted, base64
  color          TEXT NOT NULL,              -- plaintext, e.g. "#FF5733"
  frequency_type TEXT NOT NULL,              -- plaintext: 'daily' | 'custom'
  frequency_days TEXT,                       -- plaintext: JSON array of day abbreviations
  archived       INTEGER DEFAULT 0,
  order_index    INTEGER DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE completions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id   INTEGER NOT NULL,
  date       TEXT NOT NULL,                  -- YYYY-MM-DD, UTC
  status     TEXT NOT NULL,                  -- 'completed' | 'skipped'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_id, date),
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
```

---

## API

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login, returns `encryption_salt` + `encrypted_master_key` |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/password` | Change password (re-wraps master key, no habit re-encryption) |

**Login response:**
```json
{
  "user": { "id": 1, "username": "alice", "timezone": "Australia/Sydney" },
  "encryption_salt": "<base64>",
  "encrypted_master_key": "<base64>"
}
```

### Habits

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/habits` | List habits (returns encrypted names as-is) |
| POST | `/api/habits` | Create habit (client sends encrypted name) |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |
| GET | `/api/habits/:id/stats` | Streak + completion stats (server calculates using plaintext frequency_days) |

### Completions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/completions` | Query by date range / habit |
| POST | `/api/completions` | Upsert completion |
| DELETE | `/api/completions/:id` | Remove completion |

---

## Client Architecture

### Zustand Auth Store

```typescript
interface AuthState {
  userId: number | null;
  username: string | null;
  timezone: string | null;

  masterKey: CryptoKey | null;           // never persisted in plaintext
  encryptionSalt: string | null;
  encryptedMasterKey: string | null;

  isLoading: boolean;
  error: string | null;

  signup: (username: string, password: string, timezone: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  checkAuth: () => Promise<void>;        // on app load: restore from IndexedDB cache or session
}
```

### Encryption Service

```typescript
// Constants
PBKDF2_ITERATIONS = 600_000
KEY_LENGTH        = 32   // 256-bit
IV_LENGTH         = 12   // 96-bit GCM IV
SALT_LENGTH       = 16   // 128-bit

generateSalt(): string
derivePasswordKey(password: string, saltBase64: string): Promise<CryptoKey>
generateMasterKey(): Uint8Array
encryptMasterKey(masterKey: Uint8Array, passwordKey: CryptoKey): Promise<string>
decryptMasterKey(encryptedBlob: string, passwordKey: CryptoKey): Promise<Uint8Array>
importMasterKey(raw: Uint8Array): Promise<CryptoKey>
encryptHabitName(name: string, masterKey: CryptoKey): Promise<string>
decryptHabitName(encryptedBlob: string, masterKey: CryptoKey): Promise<string>
```

**Encrypted blob format:** `[IV (12 bytes)][ciphertext][auth tag (16 bytes)]` → base64.
The GCM auth tag is appended automatically by `crypto.subtle`. A failed decrypt (wrong key or tampered data) throws — use this to detect incorrect passwords.

### Key Cache Service

```typescript
// Wraps IndexedDB + sessionStorage split-storage logic
writeCacheEntry(masterKey: CryptoKey): Promise<void>
readCacheEntry(): Promise<CryptoKey | null>   // returns null if session expired
clearCacheEntry(): Promise<void>
```

---

## Threat Model

### Protected Against
- **Database breach** — attacker has encrypted blobs + salts, cannot decrypt without password
- **Server operator** — cannot read habit names without user's plaintext password
- **Session token theft** — attacker with session cookie cannot decrypt habits (needs password to derive master key)
- **Network eavesdropping** — HTTPS protects password and encrypted data in transit

### Not Protected Against
- **Compromised client device** — malware with OS-level access can read memory or keylog
- **XSS** — injected JS can read master key from memory or sessionStorage
- **Forgotten password** — master key is unrecoverable without the password (by design)
- **Weak passwords** — PBKDF2 with 600k iterations slows brute force but does not prevent it

---

## Stage 1 — Implementation Order

1. **Backend foundation** — Express, SQLite schema, session middleware
2. **Auth routes** — signup, login, logout, me, change-password
3. **Habits + completions routes** — CRUD, stats endpoint (streak calc uses plaintext frequency_days)
4. **Encryption service** (client) — generateSalt, derivePasswordKey, encrypt/decrypt
5. **Key cache service** (client) — IndexedDB + sessionStorage split-storage
6. **Auth store** (client) — Zustand, full signup/login/logout/checkAuth flows
7. **Habits UI** — list, create, edit, delete (decrypt names after fetch)
8. **Settings** — change password, timezone, delete account

---

## Stage 2 — Security Hardening

These issues were identified by auditing the existing codebase. Each must be addressed in the rewrite.

### 1. Auth Middleware: Deleted User Stays Authenticated

**Problem:** The middleware only checks session existence. If a user is deleted from the database mid-session, their session cookie still passes auth.

**Fix:** Query the database on every authenticated request:

```javascript
async function authMiddleware(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });

  const user = await db.get('SELECT id FROM users WHERE id = ?', [req.session.userId]);
  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'Not authenticated' });
  }

  req.userId = req.session.userId;
  next();
}
```

### 2. CSRF Protection

**Problem:** The rewrite switches from JWT (Authorization header, CSRF-immune) to HttpOnly session cookies. Cookies are sent automatically by the browser, making every state-changing endpoint vulnerable to cross-site request forgery.

**Fix:** Set `SameSite=Strict` on the session cookie. This alone prevents CSRF for all same-origin flows without needing a CSRF token:

```javascript
app.use(session({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  }
}));
```

`SameSite=Strict` means the cookie is never sent on cross-origin requests, even navigations from external sites.

### 3. Rate Limiting on Auth Endpoints

**Problem:** No rate limiting exists anywhere. Login and signup endpoints are open to brute force.

**Fix:** Apply `express-rate-limit` to auth routes only:

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
```

### 4. Input Size Validation on Habit Fields

**Problem:** No size limits on `name` (encrypted blob) or `frequency_days`. A client can upload arbitrarily large payloads, exhausting disk or memory.

**Fix:** Enforce maximum sizes at the controller level before any DB write:

```javascript
// Encrypted name: plaintext max 200 chars → ~300 bytes encrypted → ~400 bytes base64
const MAX_ENCRYPTED_NAME_BYTES = 512;
// frequency_days: at most 7 day strings in JSON → encrypted blob stays well under 512 bytes
const MAX_FREQUENCY_DAYS_BYTES = 512;

if (Buffer.byteLength(name, 'utf8') > MAX_ENCRYPTED_NAME_BYTES) {
  return res.status(400).json({ error: 'Invalid habit data' });
}
```

Also set an Express body size limit:

```javascript
app.use(express.json({ limit: '16kb' }));
```

### 5. Pagination on GET /api/habits

**Problem:** A single request returns all of a user's habits with no limit. With hundreds of habits this becomes an unbounded read.

**Fix:** Add a soft cap. Habits are a bounded personal collection (unlike posts or messages) so a generous hard limit of 500 is sufficient without needing cursor pagination:

```javascript
const habits = await db.all(
  'SELECT * FROM habits WHERE user_id = ? AND archived = ? ORDER BY order_index, created_at LIMIT 500',
  [userId, includeArchived ? undefined : 0]
);
```

### 6. Username Enumeration via Signup

**Problem:** The signup endpoint returns `"Username already exists"` when a username is taken. This lets an attacker probe which usernames are registered.

**Fix:** Return a generic message:

```javascript
// ❌ Current
res.status(409).json({ error: 'Username already exists' });

// ✓ Fixed
res.status(409).json({ error: 'Could not create account' });
```

This is a low-severity issue on a self-hosted personal server but costs nothing to fix.

### 7. Session Regeneration on Login

**Problem:** Not regenerating the session ID on login leaves the app open to session fixation attacks — an attacker who can set a victim's session cookie before login will have a valid authenticated session after the victim logs in.

**Fix:** Regenerate the session on every successful login:

```javascript
req.session.regenerate((err) => {
  if (err) return next(err);
  req.session.userId = user.id;
  res.json({ user, encryption_salt, encrypted_master_key });
});
```

### Summary

| Issue | Severity | Fix |
|---|---|---|
| Deleted user stays authenticated | Medium | DB check in auth middleware |
| No CSRF protection | High (new with session cookies) | `SameSite=Strict` cookie |
| No rate limiting on auth | High | `express-rate-limit` on login/signup |
| Unbounded habit payload size | Medium | Size checks + `express.json({ limit: '16kb' })` |
| No pagination on GET /habits | Low | Hard limit of 500 |
| Username enumeration via signup | Low | Generic error message |
| Session fixation on login | Medium | `req.session.regenerate()` |
| changePassword deletes all habits | Fixed by design | Independent master key — habits never touched on password change |
