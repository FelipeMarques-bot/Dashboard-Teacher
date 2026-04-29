export type ClassItem = {
  name: string
  school: string
  shift: string
}

export type Student = {
  id: number
  name: string
  className: string
  grades: number[]
  note: string
}

export type UploadedItem = {
  name: string
  type: 'CSV' | 'PDF'
  size: string
  rows?: string[][]
}

export type Holiday = {
  name: string
  date: string
  type: 'Nacional' | 'Estadual' | 'Municipal' | 'Pedagógica'
}

export type Evaluation = {
  id: number
  name: string
  className: string
  school: string
  date: string
  status: 'Agendada'
}
