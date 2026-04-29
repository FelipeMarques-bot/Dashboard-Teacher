# Dashboard-Teacher

Dashboard de gestão escolar com autenticação Google, importação CSV/XLSX e persistência no backend.

## Rodar localmente no Windows (sem Render, com banco interno)

> O backend usa banco interno em arquivo local quando **DATABASE_URL não estiver definida**.  
> Arquivo local: `server/data/state.json`.

### 1) Instalar pré-requisitos

- Git: https://git-scm.com/download/win
- Node.js LTS: https://nodejs.org

Depois de instalar o Node.js, **feche e abra novamente** o PowerShell.

Valide:

```powershell
git --version
node -v
npm -v
```

> Se `npm` não for reconhecido: reinstale o Node.js LTS marcando a opção de adicionar ao PATH e abra um novo terminal.

### 2) Clonar o projeto

```powershell
cd C:\
mkdir projetos
cd projetos
git clone https://github.com/FelipeMarques-bot/Dashboard-Teacher.git
cd Dashboard-Teacher
```

### 3) Instalar dependências do projeto

```powershell
npm install
```

### 4) Configurar variáveis locais

1. Se os exemplos existirem:
   ```powershell
   copy .env.local.example .env.local
   copy .env.api.example .env.api
   ```
2. Se os exemplos **não** existirem, crie manualmente:
   ```powershell
   New-Item .env.local -ItemType File
   New-Item .env.api -ItemType File
   ```
   `.env.api`:
   ```dotenv
   PORT=3000
   ```
   `.env.local`:
   ```dotenv
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_API_BASE_URL=http://localhost:3000
   ```
3. Preencha o `.env.local` com suas credenciais do Firebase.
4. Deixe `DATABASE_URL` indefinida (não adicione essa variável no arquivo) para usar banco interno em arquivo.

### 5) Subir frontend + backend juntos (modo desenvolvimento)

```powershell
npm run dev:local
```

- Frontend: `http://localhost:5173`
- Backend/API: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/api/health` (deve retornar `"storage":"file"`)

> Observação de segurança: o script local usa `--host 0.0.0.0` para facilitar acesso em rede local.
> Em redes não confiáveis, prefira executar em ambiente isolado/firewall ou ajuste para `localhost`.

### 6) Subir localmente em modo produção

```powershell
npm run build
npm run start:local
```

- Frontend (preview): `http://localhost:4173`
- Backend/API: `http://localhost:3000`

## Inicialização automática ao ligar o notebook

### Windows (Task Scheduler)

1. Abra **Agendador de Tarefas** > **Criar Tarefa**.
2. Aba **Gatilhos**: adicione **Ao iniciar sessão**.
3. Aba **Ações** (recomendado para uso contínuo: `start:local`; use `dev:local` apenas para desenvolvimento):
   - Programa/script: `C:\Windows\System32\cmd.exe`  
   - Argumentos:
      ```bat
     /c cd /d "C:\projetos\Dashboard-Teacher" && npm run start:local
      ```
4. Salve e teste deslogando/logando novamente.

### Linux (systemd --user)

1. Crie `~/.config/systemd/user/dashboard-teacher.service`:
   ```ini
   [Unit]
   Description=Dashboard Teacher local stack

   [Service]
   WorkingDirectory=/home/$USER/projetos/Dashboard-Teacher
   ExecStart=/usr/bin/npm run start:local
   Restart=always
   Environment=PATH=/usr/bin:/usr/local/bin

   [Install]
   WantedBy=default.target
   ```
2. Ative:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now dashboard-teacher.service
   loginctl enable-linger "$USER"
   ```

## Validação

```bash
npm run lint
npm run build
```

## Recursos atuais

- Importação de alunos via CSV/XLSX (múltiplas abas e colunas de escola/turma/aluno/observação).
- Importação de feriados/paradas pedagógicas via CSV/XLSX (inclui múltiplas abas).
- Persistência automática de turmas, alunos, avaliações, feriados e histórico no backend.
