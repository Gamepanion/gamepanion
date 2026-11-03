#!/bin/sh
# A demo instance for looking at the app (npm run demo): its own data in ./data/demo, emptied on every start so the demo is always the
# same; the demo player signed in without a mail server, with the sessions of backend/testing/demo.ts filed (scripts/demo-session.mts
# prints the cookie); then `next dev`. DEMO_KEEP=1 keeps the data from the last run instead.
set -e
export PORT="${PORT:-3123}"
export PUBLIC_URL="${PUBLIC_URL:-http://localhost:$PORT}"
export DATA_DIR="${DATA_DIR:-./data/demo}"
export GAMEPANION_SECRET="${GAMEPANION_SECRET:-demo-only-secret-never-use-this-for-real-data}"
export GAMEPANION_SIGNUP_ALLOW="${GAMEPANION_SIGNUP_ALLOW:-demo@example.com}"
# Email codes are on but never sent: the session script catches its own code, and nobody else signs in here.
export GAMEPANION_SMTP_URL="${GAMEPANION_SMTP_URL:-smtp://mail.invalid}"
export GAMEPANION_SMTP_FROM="${GAMEPANION_SMTP_FROM:-demo@example.com}"
if [ -z "$DEMO_KEEP" ]; then
  case "$DATA_DIR" in
    ./data/demo | data/demo) rm -rf "$DATA_DIR" ;;
    *) echo "DATA_DIR is $DATA_DIR, not ./data/demo: not emptying it" >&2 ;;
  esac
fi
mkdir -p "$DATA_DIR"
npx tsx scripts/demo-session.mts
exec npx next dev -p "$PORT"
