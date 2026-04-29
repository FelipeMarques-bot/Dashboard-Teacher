import type { ClassItem, Evaluation, Holiday, Student, UploadedItem } from '../types'
import type { PublicationRecord } from './agentIntegration'

export type PersistedState = {
  classes: ClassItem[]
  activeClass: string
  students: Student[]
  uploadedFiles: UploadedItem[]
  holidays: Holiday[]
  evaluations: Evaluation[]
  publicationRecords: PublicationRecord[]
}

const fallbackBaseUrl = 'http://localhost:3000'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || fallbackBaseUrl).replace(/\/$/, '')

export const defaultPersistedState: PersistedState = {
  classes: [],
  activeClass: '',
  students: [],
  uploadedFiles: [],
  holidays: [],
  evaluations: [],
  publicationRecords: [],
}

function sanitizeState(value: unknown): PersistedState {
  if (!value || typeof value !== 'object') {
    return defaultPersistedState
  }

  const data = value as Partial<PersistedState>
  return {
    classes: Array.isArray(data.classes) ? data.classes : [],
    activeClass: typeof data.activeClass === 'string' ? data.activeClass : '',
    students: Array.isArray(data.students) ? data.students : [],
    uploadedFiles: Array.isArray(data.uploadedFiles) ? data.uploadedFiles : [],
    holidays: Array.isArray(data.holidays) ? data.holidays : [],
    evaluations: Array.isArray(data.evaluations) ? data.evaluations : [],
    publicationRecords: Array.isArray(data.publicationRecords)
      ? data.publicationRecords
      : [],
  }
}

export async function loadAppState(): Promise<PersistedState> {
  const response = await fetch(`${apiBaseUrl}/api/state`)
  if (!response.ok) {
    throw new Error('Não foi possível carregar os dados salvos.')
  }

  const payload = (await response.json()) as unknown
  return sanitizeState(payload)
}

export async function saveAppState(state: PersistedState): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/state`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  })

  if (!response.ok) {
    throw new Error('Não foi possível salvar os dados no servidor.')
  }
}
