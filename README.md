# Dashboard-Teacher

Plataforma fullstack de gestao escolar com backend Django/DRF e frontend React/TypeScript.

## Estrutura

- backend: API, autenticacao, regras de negocio, Celery
- frontend: interface web (Vite + React)
- infra: docker-compose (postgres, redis, backend, celery, frontend)

## Rodar com Docker

```bash
cd infra
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

## Rodar sem Docker (local + Supabase)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Supabase

No `backend/.env`, configure uma destas opcoes:

1. `DATABASE_URL` (recomendado)
2. `POSTGRES_HOST/PORT/DB/USER/PASSWORD` + `POSTGRES_SSLMODE=require`

Observacoes:

- Se a senha tiver `@`, encode como `%40` dentro da URL.
- O backend aceita `DATABASE_URL` e `SUPABASE_DB_URL`.

## Endpoints principais

- `/api/auth/register/`
- `/api/auth/login/`
- `/api/auth/refresh/`
- `/api/auth/me/`
- `/api/schools/`
- `/api/class-groups/`
- `/api/students/`
- `/api/assessments/`
- `/api/grades/`
- `/api/calendar-events/`

## Nota importante para clone

Se seu clone nao trouxer `backend`, `frontend` e `infra`, atualize para a branch/commit que publica a estrutura fullstack.
