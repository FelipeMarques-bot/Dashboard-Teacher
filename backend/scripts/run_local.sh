#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -d .venv ]]; then
  echo "Ambiente virtual nao encontrado em backend/.venv"
  echo "Crie com: python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

source .venv/bin/activate

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

export $(grep -v '^#' .env | xargs)
PORT="${BACKEND_PORT:-8000}"

python manage.py runserver "127.0.0.1:${PORT}"
