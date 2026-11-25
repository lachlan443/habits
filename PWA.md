# Offline-First PWA Plan

Assessment of moving Habits from an always-online app to an offline-first PWA that works fully offline and syncs to the server when the network returns.

## Current State

- **PWA scaffolding is minimal.** `client/public/manifest.json` and a few meta tags in `client/index.html` exist (looks like a Create React App leftover).
- **No service worker**, no offline support, no asset caching.
- **No iOS support**: no `apple-touch-icon` or `apple-mobile-web-app-*` tags.
- **Theme colors mismatch**: manifest says `#2e7d32`, `index.html` says `#000000`.
- **No maskable icon**, and `start_url` is `"."`.
- **Every action is an HTTP request.** Marking a habit done calls the API directly, so the app requires a network.

## Verdict

**Plausible; the encryption model does not fundamentally break.** The client already holds the master key and does all encryption and decryption. The server only stores ciphertext, so it works as a sync target. The rewrite is mostly a data-layer change. The hard parts are key persistence and Face ID, not the encryption.

## What Gets Easier

- **Offline login.** Wrong passwords are already detected locally by a failed AES-GCM decrypt. Once the wrapped key is cached, the server isn't needed to verify a password.
- **Completions sync cleanly.** `UNIQUE(habit_id, date)` with upsert is idempotent, so replaying a queue of "mark done" actions is safe.

## What Breaks or Needs Rework

1. **Key persistence (the real design problem).** `ARCHITECTURE.md` deliberately forces a re-login on tab close or new tab (`sessionStorage` session key + IndexedDB blob). That conflicts with offline-first use. A new unlock model is needed (see Face ID below), and it weakens that threat model somewhat.
2. **First login needs the network.** The device must fetch `encrypted_master_key` and `encryption_salt` once. After that it can work offline indefinitely.
3. **Server-calculated stats.** `/api/habits/:id/stats` computes streaks server-side. Offline, the client must do it. Logic appears to exist in both `client/src/utils/statisticsUtils.js` and `src/utils/streakCalculator.js`, so it could be unified.
4. **Server-assigned integer IDs.** Offline-created habits need an ID before the server has seen them. Switch to client-generated UUIDs (schema + migration change).
5. **Sync protocol.** Replace per-action REST calls with a local store plus an outbox queue.
   - Server gets a `push mutations` endpoint and a `pull changes since cursor` endpoint.
   - Conflicts are low-stakes: last-write-wins on `updated_at` for most records.
   - Deletes need tombstones.
6. **Session expiry.** An expired cookie while offline must not lock the user out of local data. It should only pause syncing until re-auth.

## Face ID in a PWA

- **Plain passkeys (WebAuthn)** work in installed iOS PWAs and can trigger Face ID, but only prove identity. They don't provide the master key.
- **WebAuthn PRF extension** lets the authenticator derive a secret used to wrap the master key, so Face ID unlocks the key directly with no password. Recent iOS Safari should support it, but **verify on the target iOS version before committing to the design**.
- **Fallback:** keep password unlock as the fallback and for the first sign-in on a new device.

## iOS-Specific Constraints

- **No Background Sync API.** Sync only happens while the app is open, triggered by the `online` event and when the app returns to the foreground. Acceptable for a habit tracker.
- **Storage eviction.** Safari can evict data for unused sites, but home-screen-installed PWAs are largely exempt. Call `navigator.storage.persist()` anyway, and treat the server as the backup.

## Implementation Order

1. **Service worker** for the app shell, via `vite-plugin-pwa`. Also fix the manifest: maskable icons, iOS tags, consistent theme color, proper `start_url`.
2. **Local IndexedDB store** (e.g. Dexie) as the source of truth.
3. **Outbox queue**, then the sync endpoint pair on the server.
4. **UUIDs** for IDs, and **move stats to the client**.
5. **Unlock redesign**: PRF/Face ID with password fallback.

Steps 1–4 give full offline use even with the existing password-only unlock. Face ID is an add-on.

## Open Questions

- Does WebAuthn PRF work on the iOS version(s) in use?
- What should the new unlock/lock policy be (idle timeout, lock on app background, etc.)?
- Is last-write-wins acceptable for habit edits across multiple devices?
- Migration path for existing integer-ID data to UUIDs.

## Caveat

This plan is based on `ARCHITECTURE.md`, `README.md`, and a directory listing. The code in `src` and `client/src` hasn't been audited against the docs.
