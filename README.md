# Dashboard-Teacher

Dashboard de gestão escolar para professores com autenticação Google, dados iniciais limpos e configuração por variáveis de ambiente (`VITE_*`).

## Como executar localmente

```bash
npm install
npm run dev
```

## Validação

```bash
npm run lint
npm run build
```

## Login com Google (Firebase)

1. Crie um projeto no Firebase.
2. Ative **Authentication > Sign-in method > Google**.
3. Em **Authentication > Settings > Authorized domains**, adicione:
   - `dashboard-teacher.onrender.com`
   - seu domínio customizado (se existir).
4. Em **Project settings > General**, copie as credenciais Web App.

## Variáveis de ambiente VITE (onde buscar)

As variáveis abaixo vêm do painel do seu provedor (Firebase e backend/API):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=
```

- **Firebase**: valores em `Project settings > General > Your apps`.
- **VITE_API_BASE_URL**: URL base da sua API (Render Web Service, Supabase, etc).

### Exemplo local

Crie `.env.local` na raiz do projeto com os valores acima.

## Deploy no Render

### Passo 5 — Rewrite da SPA

1. Render > seu **Static Site** > **Settings**.
2. Abra **Redirects and Rewrites**.
3. Clique em **Add Rule**.
4. Configure:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`
5. Salve e faça novo deploy.
6. Teste uma rota interna diretamente no navegador para confirmar que não há 404.

### Environment Variables no Render

Render > Static Site > **Environment** > **Add Environment Variable** e adicione as variáveis `VITE_*`.
