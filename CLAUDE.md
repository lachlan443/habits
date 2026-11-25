# Habits: instructions for Claude

Express backend (`src/`) + React/Vite client (`client/`). Read `ARCHITECTURE.md` first: habit names are end-to-end encrypted on the client, so the server only ever stores ciphertext. Never add code that needs plaintext habit names on the server, and never log request bodies, cookies or passwords.

## CRITICAL: backwards compatibility (2.x)

Assume strangers run the published Docker image and upgrade it in place. Until the planned 3.0 major release, **every change must be backwards compatible**:

- Existing deployments must keep working with no manual steps: the same `/config` volume, existing SQLite data (`habits.db`, `sessions.db`, `session_secret.txt`, possibly root-owned), the same env vars and the same defaults.
- New settings are optional and default to today's behaviour (e.g. Postgres is opt-in via `DATABASE_URL`; with it unset, SQLite at `DB_PATH` is used exactly as before).
- Database changes must be additive and safe to run on existing data (no dropped or renamed columns, no destructive migrations). The previous release must still work against a schema migrated by the new one.
- Don't remove or rename env vars, API endpoints, response fields or file locations. Deprecate and keep them working.
- Don't change who the container runs as or what it needs to write in a way that breaks an existing mount. Test upgrades with root-owned data.
- Anything that cannot be made compatible (e.g. removing SQLite support, UUID primary keys that need a data migration) is a **3.0** item: label the issue `v3.0`, do not do it in 2.x, and ship a migration tool and upgrade notes with it.
- When in doubt, say in the PR what could break for an existing user and how you tested the upgrade path.

## Working on an issue

- Issues are small and each describes one task with a "Done when" line. Do only that task. Do not refactor unrelated code or touch files the issue does not need.
- Many issues belong to the HA / Kubernetes readiness tracker (#83) or the PWA epic (#73). If an issue says "Depends on #N" and that is not merged yet, stop and say so in a comment instead of guessing.
- Create a branch, make the change, and open a PR whose title follows the issue title (conventional commit style, e.g. `feat(db): ...`) and whose body says `Closes #<issue>`.
- Keep the PR small. If the task turns out to be bigger than the issue describes, say so in a comment rather than expanding scope.

## Checks to run before opening a PR

- `npm test` (jest) must pass, and add or update tests for behaviour you change.
- If you touched `client/`, run `npm run build --prefix client`.
- If you changed dependencies, `npm audit --audit-level=high` must exit 0 in the root and in `client/`.
- CI also runs CodeQL, so avoid patterns that would trigger it (string-built SQL, unsanitised input in responses).

## Conventions

- Node 22+. Plain JavaScript for now (no TypeScript migration yet).
- No new runtime dependencies without a reason stated in the PR description.
- Do not commit secrets, `.env` files or the `data/` directory.
- Update `README.md` / `ARCHITECTURE.md` when behaviour or configuration changes.
