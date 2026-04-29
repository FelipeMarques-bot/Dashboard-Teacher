# Dashboard-Teacher

Dashboard de gestão escolar com autenticação Google, importação CSV/XLSX e persistência de dados no backend.

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

- Importação de alunos via CSV/XLSX (suporta múltiplas abas no XLSX e colunas de escola, turma, aluno e observação).
- Importação de feriados/paradas pedagógicas via CSV/XLSX (inclui múltiplas abas no XLSX).
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

### 1) Criar PostgreSQL no Render

- [ ] New + > **PostgreSQL**
- [ ] Nome: `dashboard-teacher-db` (ou outro)
- [ ] Plano/região conforme necessidade
- [ ] Após criar, copie:
  - [ ] **Internal Database URL** (para `DATABASE_URL` no backend)
  - [ ] **External Database URL** (opcional, para acesso externo)
- [ ] Onde encontrar: PostgreSQL no Render > **Info** > **Connections** > **Internal Database URL**

### 2) Criar backend (Web Service)

- [ ] New + > **Web Service**
- [ ] Conectar este repositório
- [ ] Root Directory: *(vazio)*
- [ ] Runtime: **Node**
- [ ] Build Command:
  ```bash
  npm install
  ```
- [ ] Start Command:
  ```bash
  npm run start
  ```
- [ ] Environment Variables (copiar e colar):
  ```env
  PORT=3000
  DATABASE_URL=<INTERNAL_DATABASE_URL_DO_POSTGRES_RENDER>
  DATABASE_SSL=true
  ```
- [ ] Deploy do serviço
- [ ] Copiar URL pública do backend (ex.: `https://dashboard-teacher-api.onrender.com`)

### 3) Criar frontend (Static Site)

- [ ] New + > **Static Site**
- [ ] Conectar este repositório
- [ ] Root Directory: *(vazio)*
- [ ] Build Command:
  ```bash
  npm ci && npm run build
  ```
- [ ] Publish Directory:
  ```bash
  dist
  ```
- [ ] Environment Variables (copiar e colar):
  ```env
  VITE_FIREBASE_API_KEY=<SUA_FIREBASE_API_KEY>
  VITE_FIREBASE_AUTH_DOMAIN=<SEU_PROJECT_ID>.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=<SEU_PROJECT_ID>
  VITE_FIREBASE_STORAGE_BUCKET=<SEU_PROJECT_ID>.appspot.com
  VITE_FIREBASE_MESSAGING_SENDER_ID=<SEU_MESSAGING_SENDER_ID>
  VITE_FIREBASE_APP_ID=<SEU_FIREBASE_APP_ID>
  VITE_API_BASE_URL=https://<URL_PUBLICA_DO_BACKEND_RENDER>
  ```
- [ ] Deploy do site estático

### 4) Configurar rewrite SPA no Static Site

- [ ] Render > Static Site > **Settings** > **Redirects and Rewrites**
- [ ] Adicionar regra:
  - **Source:** `/*`
  - **Destination:** `/index.html`
  - **Action:** `Rewrite`

### 5) Checklist final de validação

- [ ] Abrir frontend publicado no Render
- [ ] Fazer login Google
- [ ] Importar planilha XLSX com múltiplas abas
- [ ] Confirmar criação de turmas/alunos por aba
- [ ] Criar avaliação e recarregar a página para validar persistência
