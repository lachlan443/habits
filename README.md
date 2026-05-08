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

- **Backend**: Express.js (Node.js 20) with SQLite
- **Frontend**: React + Vite + Tailwind CSS v4
- **Authentication**: Session cookies (HttpOnly, SameSite=Strict) with bcrypt
- **Encryption**: AES-256-GCM with independent master key, PBKDF2 key derivation (600k iterations), all crypto client-side

## Requirements

This app uses the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) for client-side encryption, which browsers only expose in [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). The app **will not work over plain HTTP unless accessed via `localhost`**.

For production deployments the app must be served over HTTPS. The recommended approach is a reverse proxy like [Traefik](https://traefik.io) with automatic TLS certificate provisioning.

## Development Setup

### Prerequisites
- Node.js 20+
- npm

### Running Locally

1. **Start the backend:**
   ```bash
   npm start
   ```
   Server runs on http://localhost:7160

2. **Start the frontend (new terminal):**
   ```bash
   cd client
   npm run dev
   ```
   Frontend runs on http://localhost:3000 and proxies API requests to port 7160

## Docker Deployment

```bash
docker compose up -d
```

The `docker-compose.yml` mounts `/home/lach/configs/habits` to `/config`, exposes port 7160, and auto-restarts unless stopped.

### Data Persistence

All data is stored in `/config`:
- `/config/habits.db` — SQLite database (habit names stored as encrypted blobs)
- `/config/sessions.db` — Session store
- `/config/session_secret.txt` — Session signing secret (auto-generated on first run)

Back up or migrate by copying the `/config` directory.

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

## Environment Variables

- `NODE_ENV` — production/development
- `PORT` — server port (default: 7160)
- `DB_PATH` — SQLite database path (default: /config/habits.db)
- `SESSION_SECRET_FILE` — path to session secret file (default: /config/session_secret.txt)
- `VITE_API_URL` — build-time API base URL for the frontend (default: /api)
