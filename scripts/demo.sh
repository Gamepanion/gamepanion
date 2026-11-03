#!/bin/sh
# A demo instance for looking at the app (npm run demo): its own data in ./data/demo, the demo player signed in without a mail server
# (scripts/demo-session.mts prints the cookie), two playthroughs filed on the first run, then `next dev`. Delete ./data/demo to start over.
set -e
export PORT="${PORT:-3123}"
export PUBLIC_URL="${PUBLIC_URL:-http://localhost:$PORT}"
export DATA_DIR="${DATA_DIR:-./data/demo}"
export GAMEPANION_SECRET="${GAMEPANION_SECRET:-demo-only-secret-never-use-this-for-real-data}"
export GAMEPANION_SIGNUP_ALLOW="${GAMEPANION_SIGNUP_ALLOW:-demo@example.com}"
# Email codes are on but never sent: the session script catches its own code, and nobody else signs in here.
export GAMEPANION_SMTP_URL="${GAMEPANION_SMTP_URL:-smtp://mail.invalid}"
export GAMEPANION_SMTP_FROM="${GAMEPANION_SMTP_FROM:-demo@example.com}"
mkdir -p "$DATA_DIR"
npx tsx scripts/demo-session.mts
exec npx next dev -p "$PORT"
