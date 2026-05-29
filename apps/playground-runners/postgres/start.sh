#!/usr/bin/env bash
# Start Postgres in the background, then launch the agent for the student.
set -euo pipefail

mkdir -p /workspace
chown -R tutly:tutly /workspace || true

# Start postgres via the official entrypoint, in the background.
docker-entrypoint.sh postgres &
PG_PID=$!

# Wait for Postgres to be ready before handing control to the student.
until pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -h 127.0.0.1 -q; do
  sleep 1
done
echo "[tutly] postgres ready as ${POSTGRES_USER}/${POSTGRES_DB}"

# Forward signals so SIGTERM cleanly stops Postgres.
trap "kill -TERM $PG_PID; wait $PG_PID" SIGTERM SIGINT

exec sudo -u tutly -E node /agent/agent.cjs
