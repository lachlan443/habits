#!/bin/sh
# Backwards-compatible privilege drop.
#
# Older versions ran as root, so existing data (habits.db, sessions.db,
# session_secret.txt) is often root-owned. Start as root, fix ownership of the
# data directory, then run the app as the unprivileged "node" user, but only if
# node can actually reach everything it needs. Otherwise (read-only or
# root-squashed mount, custom root-owned SESSION_SECRET_FILE, ...) keep running
# as root exactly like older versions did.
#
# If the container is already started as a non-root user (docker `user:`,
# Kubernetes runAsUser) the app runs as-is; the data directory must then
# already be writable by that user.
set -e

if [ "$(id -u)" = "0" ]; then
  CONFIG_DIR="$(dirname "${DB_PATH:-/config/habits.db}")"
  mkdir -p "$CONFIG_DIR" 2>/dev/null || true
  chown -R node:node "$CONFIG_DIR" 2>/dev/null || true

  ok=1
  su-exec node test -w "$CONFIG_DIR" || ok=0
  if [ -n "$SESSION_SECRET_FILE" ]; then
    if [ -e "$SESSION_SECRET_FILE" ]; then
      su-exec node test -r "$SESSION_SECRET_FILE" || ok=0
    else
      su-exec node test -w "$(dirname "$SESSION_SECRET_FILE")" || ok=0
    fi
  fi

  if [ "$ok" = "1" ]; then
    exec su-exec node "$@"
  fi
  echo "warning: node user cannot access its data paths; running as root (backwards-compatible mode)" >&2
fi

exec "$@"
