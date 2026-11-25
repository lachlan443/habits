# Habits: instructions for Claude

Express backend (`src/`) + React/Vite client (`client/`). Read `ARCHITECTURE.md` first: habit names are end-to-end encrypted on the client, so the server only ever stores ciphertext. Never add code that needs plaintext habit names on the server, and never log request bodies, cookies or passwords.

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
