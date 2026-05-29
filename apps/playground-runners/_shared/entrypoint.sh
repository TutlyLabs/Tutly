#!/usr/bin/env sh
# Shared entrypoint for Tutly playground runner images.
# Runs first-time setup commands (idempotent marker), then exec's the agent.
set -eu

mkdir -p /workspace
chown -R tutly:tutly /workspace 2>/dev/null || true

MARKER=/workspace/.tutly-setup-done
if [ -n "${TUTLY_SETUP_CMD:-}" ] && [ ! -f "$MARKER" ]; then
  echo "[tutly] running first-time setup: $TUTLY_SETUP_CMD"
  su - tutly -c "cd /workspace && sh -c '$TUTLY_SETUP_CMD'" || true
  date > "$MARKER"
fi

exec su - tutly -c 'cd /workspace && exec node /agent/agent.cjs'
