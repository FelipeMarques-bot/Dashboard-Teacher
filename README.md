# Dashboard-Teacher

Dashboard de gestão escolar com autenticação Google, importação CSV e persistência de dados no backend.

## Execução local

```bash
npm install
npm run dev:api   # backend na porta 3000
npm run dev       # frontend na porta 5173
```

## Validação

```bash
npm run lint
npm run build
```

## Recursos atuais

- Importação de alunos via CSV (suporta colunas de escola, turma, aluno e observação).
- Importação de feriados/paradas pedagógicas via CSV.
- Persistência automática de turmas, alunos, avaliações, feriados e histórico no backend.

## Login com Google (Firebase)

1. Crie um projeto no Firebase.
2. Ative **Authentication > Sign-in method > Google**.
3. Em **Authentication > Settings > Authorized domains**, adicione seus domínios.
4. Em **Project settings > General**, copie as credenciais Web App.

## Variáveis de ambiente

### Frontend (`.env.local` apenas local)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:3000
```

### Backend (Render Web Service)

```env
PORT=3000
DATABASE_URL=
DATABASE_SSL=true
```

- `DATABASE_URL`: conexão Postgres (Render PostgreSQL recomendado em produção).
- Sem `DATABASE_URL`, o backend usa fallback em arquivo local (`server/data/state.json`) para desenvolvimento.

## Deploy no Render (recomendado)

### 1) Backend (Web Service)

- Build Command: `npm install`
- Start Command: `npm run start`
- Environment:
  - `DATABASE_URL` do Render PostgreSQL
  - `DATABASE_SSL=true`
  - `PORT=3000`

### 2) Frontend (Static Site)

- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Environment:
  - todas variáveis `VITE_FIREBASE_*`
  - `VITE_API_BASE_URL` apontando para URL pública do backend Render

### 3) Rewrite SPA

1. Render > Static Site > **Settings** > **Redirects and Rewrites**.
2. Adicione regra:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`
