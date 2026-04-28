export type IntegrationProvider = 'drive' | 'official-system'

export type DriveFile = {
  id: string
  name: string
  type: 'CSV' | 'PDF'
  size: number
  content?: string
}

export type PublicationRecord = {
  id: number
  timestamp: string
  className: string
  students: number
  status: 'Publicado'
}

export type AgentIntegrationConfig = {
  aiApiEnabled: boolean
  baseUrl: string
  apiKeyConfigured: boolean
  mode: 'mock' | 'api'
}

export const defaultAgentConfig: AgentIntegrationConfig = {
  aiApiEnabled: false,
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  apiKeyConfigured: false,
  mode: 'mock',
}

const mockedDriveFiles: DriveFile[] = [
  {
    id: 'drv-1',
    name: 'alunos_7a.csv',
    type: 'CSV',
    size: 2450,
    content: 'Pedro Rocha,Transferido da unidade 2\nMarina Lessa,Aluna bolsista\nRafael Dias,Precisa reforço em matemática',
  },
  {
    id: 'drv-2',
    name: 'ocorrencias_maio.pdf',
    type: 'PDF',
    size: 428900,
  },
  {
    id: 'drv-3',
    name: 'atualizacao_cadastro.csv',
    type: 'CSV',
    size: 1820,
    content: 'Lorena Alves,Contato da mãe atualizado\nMateus Melo,Documentação pendente',
  },
]

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function connectIntegration(
  provider: IntegrationProvider,
  config: AgentIntegrationConfig,
) {
  if (config.mode === 'api' && (!config.baseUrl || !config.apiKeyConfigured)) {
    throw new Error(`Configuração de API incompleta para ${provider}.`)
  }

  await delay(250)
  return { connected: true }
}

export async function fetchDriveFiles(config: AgentIntegrationConfig) {
  if (config.mode === 'api') {
    // Ponto de extensão futuro: chamar API de IA para busca de arquivos no Drive.
    // Exemplo esperado: GET `${config.baseUrl}/integrations/drive/files`
  }

  await delay(320)
  return mockedDriveFiles
}

export async function publishGrades(
  config: AgentIntegrationConfig,
  payload: { className: string; students: number },
): Promise<PublicationRecord> {
  if (config.mode === 'api') {
    // Ponto de extensão futuro: publicar notas via API de IA.
    // Exemplo esperado: POST `${config.baseUrl}/integrations/official-system/grades`
  }

  await delay(300)
  return {
    id: Date.now(),
    timestamp: new Date().toLocaleString('pt-BR'),
    className: payload.className,
    students: payload.students,
    status: 'Publicado',
  }
}
