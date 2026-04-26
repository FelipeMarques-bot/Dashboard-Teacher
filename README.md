# Dashboard-Teacher

Dashboard de gestão escolar para professores com interface moderna, responsiva e foco em produtividade.

## Funcionalidades

- Sidebar fixa com navegação entre: Início, Calendário, Turmas, Avaliações, Alunos, Relatórios e Configurações.
- Tela inicial com boas-vindas, cards de resumo, calendário semanal e alertas.
- Calendário mensal interativo com marcação de feriados e painel de detalhes por dia.
- Gestão de turmas com tabela de notas editável inline, média automática e observações.
- Tela de avaliações com formulário e prévia de datas de aviso considerando finais de semana e feriados.
- Upload de listas/arquivos em **CSV ou PDF** para alunos e informações, incluindo importação básica de alunos a partir de CSV.
- Integrações do agente com fluxo para: conectar Drive, buscar/importar arquivos e publicar notas no sistema oficial.
- Estrutura **API-ready** para integração futura com IA (modo `mock` e modo `api`, com configuração de base URL e chave).

## Como executar

```bash
npm install
npm run dev
```

## Validação

```bash
npm run lint
npm run build
```
