# Dashboard-Teacher

Dashboard de gestão escolar com autenticação Google, importação CSV/XLSX e persistência no backend.

## Rodar localmente com banco interno (sem Render)

> O backend usa banco interno em arquivo local quando **DATABASE_URL não estiver definida**.  
> Arquivo local: `server/data/state.json`.

### 1) Instalar dependências

```bash
npm install
```

### 2) Configurar variáveis locais

1. Copie os arquivos de exemplo:
   ```bash
   cp .env.local.example .env.local
   cp .env.api.example .env.api
   ```
2. Preencha o `.env.local` com suas credenciais do Firebase.
3. Mantenha o `.env.api` apenas com `PORT=3000` (não defina `DATABASE_URL` para usar banco interno).

### 3) Subir frontend + backend juntos (modo desenvolvimento)

```bash
npm run dev:local
```

- Frontend: `http://localhost:5173`
- Backend/API: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/api/health` (deve retornar `"storage":"file"`)

### 4) Subir localmente em modo produção

```bash
npm run build
npm run start:local
```

- Frontend (preview): `http://localhost:4173`
- Backend/API: `http://localhost:3000`

## Inicialização automática ao ligar o notebook

### Windows (Task Scheduler)

1. Abra **Agendador de Tarefas** > **Criar Tarefa**.
2. Aba **Gatilhos**: adicione **Ao iniciar sessão**.
3. Aba **Ações**:  
   - Programa/script: `C:\Windows\System32\cmd.exe`  
   - Argumentos:
     ```bat
     /c cd /d "C:\caminho\Dashboard-Teacher" && npm run dev:local
     ```
4. Salve e teste deslogando/logando novamente.

### Linux (systemd --user)

1. Crie `~/.config/systemd/user/dashboard-teacher.service`:
   ```ini
   [Unit]
   Description=Dashboard Teacher local stack

   [Service]
   WorkingDirectory=/caminho/Dashboard-Teacher
   ExecStart=/usr/bin/npm run dev:local
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
