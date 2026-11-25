# Everyday Habits Tracker

A habit tracking application inspired by everyday.app, built with Express.js, React, and SQLite.

## Features

- Track daily habits with visual calendar grid
- Custom frequency support (specific days of week)
- Mark habits as completed or skipped
- Streak tracking (current and longest streaks)
- Completion rate statistics
- Color-coded habits
- Archive and delete habits
- End-to-end encrypted habit names — the server stores only ciphertext and cannot read user data without their password

## Tech Stack

- **Backend**: Express.js (Node.js 22+) with SQLite
- **Frontend**: React + Vite + Tailwind CSS v4
- **Authentication**: Session cookies (HttpOnly, SameSite=Strict) with bcrypt
- **Encryption**: AES-256-GCM with independent master key, PBKDF2 key derivation (600k iterations), all crypto client-side

## Requirements

This app uses the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) for client-side encryption, which browsers only expose in [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). The app **will not work over plain HTTP unless accessed via `localhost`**.

For production deployments the app must be served over HTTPS. The recommended approach is a reverse proxy like [Traefik](https://traefik.io) with automatic TLS certificate provisioning.

## Development Setup

### Prerequisites
- Node.js 22+
- npm

### Running Locally

```bash
npm run dev
```

This installs all dependencies (root and client), then starts both servers concurrently:
- **Frontend**: http://localhost:3000 — open this in your browser
- **Backend**: http://localhost:7161 — API only, do not open directly

The frontend Vite dev server proxies all `/api` requests to the backend. A dev user is seeded automatically on first run: **username: `admin`, password: `password`**.

## Docker Deployment

```bash
docker compose up -d
```

The `docker-compose.yml` mounts `/home/lach/configs/habits` to `/config`, exposes port 7160, and auto-restarts unless stopped.

### Local Docker Testing

The production image runs with `NODE_ENV=production`, which sets the `Secure` flag on session cookies. Browsers won't send Secure cookies over plain HTTP, so the session will appear to work after login but all subsequent requests will get a 401.

To test locally, override `NODE_ENV` at runtime:

```bash
docker build -t habits-test .
docker run --rm -p 7161:7160 -e NODE_ENV=development habits-test
```

Then open `http://localhost:7161`. This disables the Secure cookie flag for the local session while leaving all other production behaviour intact.

### Data Persistence

All data is stored in `/config`:
- `/config/habits.db` — SQLite database (habit names stored as encrypted blobs)
- `/config/sessions.db` — Session store
- `/config/session_secret.txt` — Session signing secret (auto-generated on first run)

Back up or migrate by copying the `/config` directory.

The container starts as root only long enough to fix ownership of `/config`, then runs the app as the unprivileged `node` user (UID/GID 1000). Existing deployments with root-owned data keep working without any manual `chown`. If ownership can't be changed (read-only or root-squashed mount) or `node` can't read a custom `SESSION_SECRET_FILE`, it keeps running as root like earlier versions. To run fully non-root (for example Kubernetes `runAsNonRoot` or `docker run --user 1000:1000 --read-only`), start the container as that user and make sure `/config` is writable by it; `/config` is declared as a `VOLUME`, so a writable anonymous volume is created if you don't mount one.

### Kubernetes: replicated Postgres (optional)

[`k8s/postgres/`](k8s/postgres/README.md) contains optional CloudNativePG manifests for a 3-instance Postgres cluster with a PgBouncer pooler and S3 backups, plus how to give the app a `DATABASE_URL`. This is opt-in work in progress (#83): SQLite in `/config` stays the default and nothing changes for existing deployments.
### Graceful Shutdown

On `SIGTERM` (`docker stop`, Kubernetes pod termination) or `SIGINT` the server stops accepting new connections, lets in-flight requests finish, closes the database and exits with code 0. If that takes longer than 10 seconds it exits with code 1 anyway. Docker's default stop timeout is also 10 seconds, so if you have unusually slow requests, give the container a little longer (`docker stop -t 15`, `stop_grace_period` in Compose, or `terminationGracePeriodSeconds` in Kubernetes, whose default is 30).

## Encryption Model

Each user has a random master key generated at signup. The master key is encrypted with a key derived from their password (PBKDF2) and stored server-side — the server never sees the master key itself. Habit names are encrypted client-side with the master key before being sent to the server.

Password changes re-wrap the master key with the new password — existing habits are never re-encrypted and no data is lost.

## Usage

### Creating Habits

1. Click "+ New Habit"
2. Enter a name, choose a color, and set frequency (daily or specific days)

### Tracking

- **Click empty square** — mark complete
- **Click completed square** — cycle to skipped or undo

### Viewing Statistics

Click any habit name to see current streak, longest streak, total completions, and completion rate.

### Managing Habits

Click "⋯" next to a habit to edit, archive, or delete it.

## API

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/key` — returns encrypted master key + salt for client-side decryption
- `PUT /api/auth/username`
- `PUT /api/auth/timezone`
- `PUT /api/auth/password`
- `DELETE /api/auth/account`

### Habits
- `GET /api/habits`
- `POST /api/habits`
- `GET /api/habits/:id`
- `PUT /api/habits/:id`
- `DELETE /api/habits/:id`
- `GET /api/habits/:id/stats`

### Completions
- `GET /api/completions`
- `POST /api/completions`
- `DELETE /api/completions/by-date`

## Load Testing

`loadtest/habits.js` is a [k6](https://k6.io) script covering signup/login, listing habits, marking completions and fetching stats, with thresholds of p95 < 500 ms and < 1% errors.

```bash
k6 run loadtest/habits.js                                   # ramp profile
k6 run -e PROFILE=spike -e PEAK_VUS=10 loadtest/habits.js   # spike profile
k6 run -e BASE_URL=http://localhost:7161 loadtest/habits.js
```

PBKDF2 runs in the browser, so the server load is bcrypt login plus API/DB work. Auth endpoints are rate limited (20 per 15 minutes per IP), so keep `PEAK_VUS` under 19 and restart the server between runs.

## Environment Variables

- `NODE_ENV` — production/development
- `PORT` — server port (default: 7160)
- `DB_PATH` — SQLite database path (default: /config/habits.db)
- `SESSION_SECRET` — session signing secret. If set, it is used as-is and no secret file is read or written (use this for Kubernetes/Secrets; no `/config` volume needed for the secret)
- `SESSION_SECRET_FILE` — path to session secret file, used only when `SESSION_SECRET` is unset (default: /config/session_secret.txt, auto-generated on first run)
- `DATABASE_URL` — optional, experimental. Postgres connection string for the database adapter (`src/db/adapter.js`). Unset by default, which keeps SQLite at `DB_PATH`. The app's queries do not use Postgres yet (HA / Kubernetes work, #83); for development run `docker compose --profile postgres up -d postgres`.
- `LOG_FORMAT` — request log format: `json` (default, one JSON line per request with `ts`, `request_id`, `method`, `route`, `status`, `duration_ms`) or `text` (readable, for local development). Bodies, cookies, headers and query strings are never logged. An incoming `X-Request-Id` is reused, otherwise one is generated, and it is returned in the `X-Request-Id` response header.
- `METRICS_ENABLED` — set to `true` to expose Prometheus metrics at `GET /metrics` (default: off, route not registered). Includes default Node.js metrics and `http_request_duration_seconds` labelled by method, route pattern and status code.
- `METRICS_TOKEN` — bearer token required for `/metrics` when enabled (`Authorization: Bearer <token>`). Use a Kubernetes Secret. If unset, a token is generated into `METRICS_TOKEN_FILE` on first start.
- `METRICS_TOKEN_FILE` — path to the metrics token file, used only when `METRICS_TOKEN` is unset (default: /config/metrics_token.txt)
- `VITE_API_URL` — build-time API base URL for the frontend (default: /api)
