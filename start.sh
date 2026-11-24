#!/usr/bin/env bash
# One-command setup: ./start.sh
# Creates .env (with a random JWT_SECRET) if missing, builds and starts
# db + api + web in Docker, and seeds demo data. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Docker is not installed or not on PATH."; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop and retry."; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  secret="$(openssl rand -base64 32 | tr -d '\n/+=')"
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" .env && rm -f .env.bak
  echo "Created .env with a random JWT_SECRET."
fi

docker compose up -d --build --wait
docker compose exec -T api npm run db:seed

cat <<'EOF'

Ready.
  Web:  http://localhost:3000
  API:  http://localhost:3001/health

Demo logins (password: Password123!)
  admin@example.com   (admin)
  alice@example.com
  john@example.com

Stop:  docker compose down        Logs:  docker compose logs -f
EOF
