import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from 'firebase/auth'
import './App.css'
import {
  connectIntegration,
  defaultAgentConfig,
  fetchDriveFiles,
  publishGrades,
} from './services/agentIntegration'
import {
  isFirebaseConfigured,
  observeAuthState,
  signInWithGoogle,
  signOutFromGoogle,
} from './services/firebaseAuth'
import type {
  AgentIntegrationConfig,
  DriveFile,
  IntegrationProvider,
  PublicationRecord,
} from './services/agentIntegration'

type Section =
  | 'Início'
  | 'Calendário'
  | 'Turmas'
  | 'Avaliações'
  | 'Alunos'
  | 'Relatórios'
  | 'Configurações'

type ClassItem = {
  name: string
  school: string
  shift: string
}

type Student = {
  id: number
  name: string
  className: string
  grades: number[]
  note: string
}

type UploadedItem = {
  name: string
  type: 'CSV' | 'PDF'
  size: string
  rows?: string[][]
}

type Holiday = {
  name: string
  date: string
  type: 'Nacional' | 'Estadual' | 'Municipal' | 'Pedagógica'
}

type Evaluation = {
  id: number
  name: string
  className: string
  school: string
  date: string
  status: 'Agendada'
}

const navItems: { section: Section; icon: string }[] = [
  { section: 'Início', icon: '🏠' },
  { section: 'Calendário', icon: '🗓️' },
  { section: 'Turmas', icon: '🎓' },
  { section: 'Avaliações', icon: '📝' },
  { section: 'Alunos', icon: '👥' },
  { section: 'Relatórios', icon: '📊' },
  { section: 'Configurações', icon: '⚙️' },
]

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR')
}

function subtractBusinessDays(target: Date, days: number, holidaySet: Set<string>) {
  const result = new Date(target)
  let remaining = days

  while (remaining > 0) {
    result.setDate(result.getDate() - 1)
    const weekday = result.getDay()
    const iso = result.toISOString().slice(0, 10)

    if (weekday !== 0 && weekday !== 6 && !holidaySet.has(iso)) {
      remaining -= 1
    }
  }

  return result
}

function fileSizeLabel(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function parseCsv(content: string) {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

function UploadPanel({
  title,
  items,
  onUpload,
}: {
  title: string
  items: UploadedItem[]
  onUpload: (files: FileList | null) => Promise<void>
}) {
  return (
    <div className="card">
      <div className="section-heading">
        <h3>{title}</h3>
        <label className="btn btn-accent" htmlFor={title}>
          Subir CSV/PDF
        </label>
      </div>
      <input
        id={title}
        className="hidden-input"
        type="file"
        accept=".csv,application/pdf"
        multiple
        onChange={(event) => {
          void onUpload(event.target.files)
          event.currentTarget.value = ''
        }}
      />
      {items.length === 0 ? (
        <p className="muted">Nenhum arquivo enviado ainda.</p>
      ) : (
        <div className="upload-list">
          {items.map((item) => (
            <div key={`${item.name}-${item.size}`} className="upload-item">
              <div>
                <strong>{item.name}</strong>
                <p className="muted">
                  {item.type} • {item.size}
                </p>
              </div>
              {item.rows && item.rows.length > 0 && (
                <p className="muted">{item.rows.length} linhas importadas</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>('Início')
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [activeClass, setActiveClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedItem[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [driveConnected, setDriveConnected] = useState(false)
  const [officialSystemConnected, setOfficialSystemConnected] = useState(false)
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [selectedDriveFileId, setSelectedDriveFileId] = useState('')
  const [integrationMessage, setIntegrationMessage] = useState('')
  const [publicationRecords, setPublicationRecords] = useState<PublicationRecord[]>([])
  const [agentConfig, setAgentConfig] = useState<AgentIntegrationConfig>(
    defaultAgentConfig,
  )
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const [classForm, setClassForm] = useState({
    name: '',
    school: '',
    shift: 'Manhã',
  })

  const [studentForm, setStudentForm] = useState({
    name: '',
    className: '',
    note: '',
  })

  const [evaluationForm, setEvaluationForm] = useState({
    name: '',
    description: '',
    className: '',
    school: '',
    date: '',
    warningDays: 2,
    printWarningDays: 1,
  })

  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'Municipal' as Holiday['type'],
  })

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false)
      return
    }

    const unsubscribe = observeAuthState((authUser) => {
      setUser(authUser)
      setAuthLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const holidaySet = useMemo(
    () => new Set(holidays.map((holiday) => holiday.date)),
    [holidays],
  )

  const warningPreview = useMemo(() => {
    if (!evaluationForm.date) return null
    const target = new Date(`${evaluationForm.date}T00:00:00`)
    return subtractBusinessDays(target, evaluationForm.warningDays, holidaySet)
  }, [evaluationForm.date, evaluationForm.warningDays, holidaySet])

  const printWarningPreview = useMemo(() => {
    if (!evaluationForm.date) return null
    const target = new Date(`${evaluationForm.date}T00:00:00`)
    return subtractBusinessDays(target, evaluationForm.printWarningDays, holidaySet)
  }, [evaluationForm.date, evaluationForm.printWarningDays, holidaySet])

  const studentsByActiveClass = useMemo(() => {
    if (!activeClass) return students
    return students.filter((student) => student.className === activeClass)
  }, [activeClass, students])

  const upcomingEvaluations = useMemo(() => {
    const now = Date.now()
    const inSevenDays = now + 7 * 24 * 60 * 60 * 1000

    return evaluations.filter((evaluation) => {
      const timestamp = new Date(`${evaluation.date}T00:00:00`).getTime()
      return timestamp >= now && timestamp <= inSevenDays
    })
  }, [evaluations])

  const monthDates = useMemo(() => {
    const base = new Date()
    const year = base.getFullYear()
    const month = base.getMonth()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const firstWeekDay = new Date(year, month, 1).getDay()

    return Array.from({ length: firstWeekDay + totalDays }, (_, index) => {
      if (index < firstWeekDay) return null
      return index - firstWeekDay + 1
    })
  }, [])

  const monthLabel = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [],
  )

  const importStudentsFromRows = (rows: string[][]) => {
    if (rows.length === 0) return

    const className = activeClass || studentForm.className || ''

    const importedStudents = rows
      .map((row, index) => ({
        id: Date.now() + index,
        name: row[0] || `Aluno importado ${index + 1}`,
        className,
        grades: [0, 0, 0],
        note: row[1] || '',
      }))
      .filter((student) => student.name.trim().length > 0)

    if (importedStudents.length > 0) {
      setStudents((prev) => [...prev, ...importedStudents])
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return

    const parsedFiles = await Promise.all(
      Array.from(files).map(async (file) => {
        const isCsv = file.name.toLowerCase().endsWith('.csv')
        if (isCsv) {
          const text = await file.text()
          const rows = parseCsv(text)
          return {
            name: file.name,
            type: 'CSV' as const,
            size: fileSizeLabel(file.size),
            rows,
          }
        }

        return {
          name: file.name,
          type: 'PDF' as const,
          size: fileSizeLabel(file.size),
        }
      }),
    )

    setUploadedFiles((prev) => [...parsedFiles, ...prev])

    const csvRows = parsedFiles
      .filter((file) => file.type === 'CSV' && file.rows && file.rows.length > 0)
      .flatMap((file) => file.rows ?? [])

    importStudentsFromRows(csvRows)
  }

  const updateGrade = (studentId: number, gradeIndex: number, value: string) => {
    const parsed = Number(value)
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? {
              ...student,
              grades: student.grades.map((grade, index) =>
                index === gradeIndex && !Number.isNaN(parsed) ? parsed : grade,
              ),
            }
          : student,
      ),
    )
  }

  const updateNote = (studentId: number, value: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, note: value } : student,
      ),
    )
  }

  const addClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!classForm.name || !classForm.school) return

    const newClass: ClassItem = {
      name: classForm.name,
      school: classForm.school,
      shift: classForm.shift,
    }

    setClasses((prev) => [newClass, ...prev])
    setClassForm({ name: '', school: '', shift: 'Manhã' })

    if (!activeClass) {
      setActiveClass(newClass.name)
      setStudentForm((prev) => ({ ...prev, className: newClass.name }))
      setEvaluationForm((prev) => ({
        ...prev,
        className: newClass.name,
        school: newClass.school,
      }))
    }
  }

  const addStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!studentForm.name) return

    const className = studentForm.className || activeClass
    const newStudent: Student = {
      id: Date.now(),
      name: studentForm.name,
      className,
      grades: [0, 0, 0],
      note: studentForm.note,
    }

    setStudents((prev) => [newStudent, ...prev])
    setStudentForm((prev) => ({ ...prev, name: '', note: '' }))
  }

  const addHoliday = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!holidayForm.name || !holidayForm.date) return

    setHolidays((prev) => [
      ...prev,
      { name: holidayForm.name, date: holidayForm.date, type: holidayForm.type },
    ])

    setHolidayForm({ name: '', date: '', type: 'Municipal' })
  }

  const addEvaluation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !evaluationForm.name ||
      !evaluationForm.className ||
      !evaluationForm.school ||
      !evaluationForm.date
    ) {
      return
    }

    const newEvaluation: Evaluation = {
      id: Date.now(),
      name: evaluationForm.name,
      className: evaluationForm.className,
      school: evaluationForm.school,
      date: evaluationForm.date,
      status: 'Agendada',
    }

    setEvaluations((prev) => [newEvaluation, ...prev])
    setEvaluationForm((prev) => ({ ...prev, name: '', description: '', date: '' }))
  }

  const connectProvider = async (provider: IntegrationProvider) => {
    try {
      await connectIntegration(provider, agentConfig)

      if (provider === 'drive') {
        setDriveConnected(true)
        setIntegrationMessage('Drive conectado com sucesso.')
        return
      }

      setOfficialSystemConnected(true)
      setIntegrationMessage('Sistema oficial conectado.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao conectar integração.'
      setIntegrationMessage(message)
    }
  }

  const fetchFilesFromDriveAction = async () => {
    if (!driveConnected) {
      setIntegrationMessage('Conecte o Drive antes de buscar arquivos.')
      return
    }

    try {
      const files = await fetchDriveFiles(agentConfig)
      setDriveFiles(files)
      setSelectedDriveFileId(files[0]?.id ?? '')
      setIntegrationMessage(`${files.length} arquivos encontrados no Drive.`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao buscar arquivos no Drive.'
      setIntegrationMessage(message)
    }
  }

  const importSelectedDriveFile = () => {
    const selectedFile = driveFiles.find((file) => file.id === selectedDriveFileId)
    if (!selectedFile) {
      setIntegrationMessage('Selecione um arquivo do Drive para importar.')
      return
    }

    if (selectedFile.type === 'CSV' && selectedFile.content) {
      const rows = parseCsv(selectedFile.content)
      importStudentsFromRows(rows)

      setUploadedFiles((prev) => [
        {
          name: selectedFile.name,
          type: 'CSV',
          size: fileSizeLabel(selectedFile.size),
          rows,
        },
        ...prev,
      ])
      setIntegrationMessage(`Arquivo ${selectedFile.name} importado com sucesso.`)
      return
    }

    setUploadedFiles((prev) => [
      {
        name: selectedFile.name,
        type: 'PDF',
        size: fileSizeLabel(selectedFile.size),
      },
      ...prev,
    ])
    setIntegrationMessage(`Arquivo ${selectedFile.name} anexado ao histórico.`)
  }

  const publishGradesToOfficialSystem = async () => {
    if (!officialSystemConnected) {
      setIntegrationMessage('Conecte o sistema oficial para publicar notas.')
      return
    }

    if (!activeClass) {
      setIntegrationMessage('Cadastre e selecione uma turma para publicar notas.')
      return
    }

    try {
      const newRecord = await publishGrades(agentConfig, {
        className: activeClass,
        students: studentsByActiveClass.length,
      })
      setPublicationRecords((prev) => [newRecord, ...prev])
      setIntegrationMessage(
        `Notas da turma ${activeClass} publicadas para ${studentsByActiveClass.length} alunos.`,
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao publicar notas.'
      setIntegrationMessage(message)
    }
  }

  const handleSignIn = async () => {
    try {
      setAuthError('')
      await signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no login Google.'
      setAuthError(message)
    }
  }

  const handleSignOut = async () => {
    try {
      setAuthError('')
      await signOutFromGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao sair da conta.'
      setAuthError(message)
    }
  }

  const renderContent = () => {
    if (activeSection === 'Início') {
      return (
        <>
          <div className="welcome card fade-in">
            <div>
              <h2>Bem-vindo(a), {user?.displayName || user?.email || 'Professor(a)'}</h2>
              <p className="muted">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="summary-grid fade-in">
            <article className="card summary-card">
              <p>Turmas ativas</p>
              <strong>{classes.length}</strong>
            </article>
            <article className="card summary-card">
              <p>Avaliações na semana</p>
              <strong>{upcomingEvaluations.length}</strong>
            </article>
            <article className="card summary-card">
              <p>Avisos pendentes</p>
              <strong>{upcomingEvaluations.length}</strong>
            </article>
            <article className="card summary-card">
              <p>Total de alunos</p>
              <strong>{students.length}</strong>
            </article>
          </div>

          <div className="main-grid fade-in">
            <section className="card">
              <h3>Turmas cadastradas</h3>
              {classes.length === 0 ? (
                <p className="muted">Nenhuma turma cadastrada ainda.</p>
              ) : (
                <div className="schedule-list">
                  {classes.map((item) => (
                    <div key={`${item.name}-${item.school}`} className="schedule-item">
                      <span className="tag">{item.school}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <p className="muted">Turno: {item.shift}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <h3>Alertas e Notificações</h3>
              {upcomingEvaluations.length === 0 ? (
                <p className="muted">Nenhum alerta pendente.</p>
              ) : (
                <div className="alert-list">
                  {upcomingEvaluations.map((evaluation) => (
                    <div key={evaluation.id} className="alert-item">
                      <p>📝 {evaluation.name}</p>
                      <small>{formatDate(evaluation.date)}</small>
                      <button className="btn">Ver avaliação</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )
    }

    if (activeSection === 'Calendário') {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1

      return (
        <div className="two-column fade-in">
          <section className="card">
            <div className="section-heading">
              <h3>{monthLabel}</h3>
              <div className="legend">
                <span>🟦 Aula</span>
                <span>🟥 Feriado/Parada</span>
              </div>
            </div>
            <div className="month-grid">
              {monthDates.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="day muted" />
                }

                const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const holiday = holidays.find((item) => item.date === iso)
                return (
                  <button
                    key={day}
                    className={`day ${selectedDay === day ? 'day-active' : ''} ${holiday ? 'day-holiday' : ''}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <strong>{day}</strong>
                    {holiday ? <small>{holiday.name}</small> : <small>Sem evento</small>}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="card">
            <h3>Detalhes do dia {selectedDay ? selectedDay : '-'}</h3>
            {selectedDay ? (
              <p className="muted">Cadastre avaliações e feriados para visualizar compromissos aqui.</p>
            ) : (
              <p className="muted">Clique em um dia para abrir os detalhes.</p>
            )}

            <form className="form" onSubmit={addHoliday}>
              <h4>Adicionar feriado/evento</h4>
              <input
                required
                value={holidayForm.name}
                onChange={(event) =>
                  setHolidayForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Nome"
              />
              <input
                required
                type="date"
                value={holidayForm.date}
                onChange={(event) =>
                  setHolidayForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
              <select
                value={holidayForm.type}
                onChange={(event) =>
                  setHolidayForm((prev) => ({
                    ...prev,
                    type: event.target.value as Holiday['type'],
                  }))
                }
              >
                <option>Municipal</option>
                <option>Estadual</option>
                <option>Nacional</option>
                <option>Pedagógica</option>
              </select>
              <button className="btn btn-accent" type="submit">
                Salvar
              </button>
            </form>
          </section>
        </div>
      )
    }

    if (activeSection === 'Turmas') {
      return (
        <>
          <div className="two-column fade-in">
            <section className="card">
              <h3>Nova turma</h3>
              <form className="form" onSubmit={addClass}>
                <input
                  required
                  placeholder="Nome da turma (ex.: 7º A)"
                  value={classForm.name}
                  onChange={(event) =>
                    setClassForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <input
                  required
                  placeholder="Escola"
                  value={classForm.school}
                  onChange={(event) =>
                    setClassForm((prev) => ({ ...prev, school: event.target.value }))
                  }
                />
                <select
                  value={classForm.shift}
                  onChange={(event) =>
                    setClassForm((prev) => ({ ...prev, shift: event.target.value }))
                  }
                >
                  <option>Manhã</option>
                  <option>Tarde</option>
                  <option>Noite</option>
                </select>
                <button className="btn btn-accent" type="submit">
                  Adicionar turma
                </button>
              </form>
            </section>

            <section className="card">
              <h3>Novo aluno</h3>
              <form className="form" onSubmit={addStudent}>
                <input
                  required
                  placeholder="Nome do aluno"
                  value={studentForm.name}
                  onChange={(event) =>
                    setStudentForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <select
                  value={studentForm.className}
                  onChange={(event) =>
                    setStudentForm((prev) => ({ ...prev, className: event.target.value }))
                  }
                  disabled={classes.length === 0}
                >
                  <option value="">Selecione a turma</option>
                  {classes.map((classItem) => (
                    <option key={`${classItem.name}-${classItem.school}`} value={classItem.name}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Observação"
                  value={studentForm.note}
                  onChange={(event) =>
                    setStudentForm((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
                <button className="btn btn-accent" type="submit" disabled={classes.length === 0}>
                  Adicionar aluno
                </button>
              </form>
            </section>
          </div>

          <div className="cards-row fade-in">
            {classes.length === 0 ? (
              <article className="card class-card">
                <p className="muted">Cadastre uma turma para começar.</p>
              </article>
            ) : (
              classes.map((classItem) => (
                <button
                  key={`${classItem.name}-${classItem.school}`}
                  className={`card class-card ${activeClass === classItem.name ? 'active-outline' : ''}`}
                  onClick={() => setActiveClass(classItem.name)}
                >
                  <h3>{classItem.name}</h3>
                  <p className="muted">{classItem.school}</p>
                  <p>{classItem.shift}</p>
                </button>
              ))
            )}
          </div>

          <section className="card fade-in">
            <h3>{activeClass || 'Sem turma selecionada'} • Lançamento de notas</h3>
            {studentsByActiveClass.length === 0 ? (
              <p className="muted">Nenhum aluno para a turma selecionada.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Avaliação 1</th>
                      <th>Avaliação 2</th>
                      <th>Avaliação 3</th>
                      <th>Média</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsByActiveClass.map((student) => {
                      const average =
                        student.grades.reduce((sum, grade) => sum + grade, 0) /
                        student.grades.length
                      const statusClass = average >= 7 ? 'ok' : 'attention'

                      return (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          {student.grades.map((grade, index) => (
                            <td key={`${student.id}-${index}`}>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={grade}
                                onChange={(event) =>
                                  updateGrade(student.id, index, event.target.value)
                                }
                              />
                            </td>
                          ))}
                          <td>
                            <span className={`pill ${statusClass}`}>{average.toFixed(1)}</span>
                          </td>
                          <td>
                            <input
                              placeholder="Adicionar nota"
                              value={student.note}
                              onChange={(event) =>
                                updateNote(student.id, event.target.value)
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )
    }

    if (activeSection === 'Avaliações') {
      return (
        <div className="two-column fade-in">
          <section className="card">
            <h3>Avaliações criadas</h3>
            {evaluations.length === 0 ? (
              <p className="muted">Nenhuma avaliação cadastrada ainda.</p>
            ) : (
              <div className="alert-list">
                {evaluations.map((evaluation) => (
                  <div key={evaluation.id} className="alert-item">
                    <strong>{evaluation.name}</strong>
                    <p className="muted">
                      {evaluation.className} • {evaluation.school}
                    </p>
                    <small>
                      {formatDate(evaluation.date)} • {evaluation.status}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h3>Nova avaliação</h3>
            <form className="form" onSubmit={addEvaluation}>
              <input
                required
                placeholder="Nome da avaliação"
                value={evaluationForm.name}
                onChange={(event) =>
                  setEvaluationForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <textarea
                placeholder="Descrição"
                value={evaluationForm.description}
                onChange={(event) =>
                  setEvaluationForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
              <select
                required
                value={evaluationForm.className}
                onChange={(event) => {
                  const selectedClass = classes.find(
                    (classItem) => classItem.name === event.target.value,
                  )

                  setEvaluationForm((prev) => ({
                    ...prev,
                    className: event.target.value,
                    school: selectedClass?.school ?? prev.school,
                  }))
                }}
                disabled={classes.length === 0}
              >
                <option value="">Selecione a turma</option>
                {classes.map((classItem) => (
                  <option key={`${classItem.name}-${classItem.school}`} value={classItem.name}>
                    {classItem.name}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="Escola"
                value={evaluationForm.school}
                onChange={(event) =>
                  setEvaluationForm((prev) => ({ ...prev, school: event.target.value }))
                }
              />
              <input
                required
                type="date"
                value={evaluationForm.date}
                onChange={(event) =>
                  setEvaluationForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
              <input
                type="number"
                min={1}
                max={30}
                value={evaluationForm.warningDays}
                onChange={(event) =>
                  setEvaluationForm((prev) => ({
                    ...prev,
                    warningDays: Number(event.target.value),
                  }))
                }
                placeholder="Dias antes do aviso"
              />
              <input
                type="number"
                min={1}
                max={30}
                value={evaluationForm.printWarningDays}
                onChange={(event) =>
                  setEvaluationForm((prev) => ({
                    ...prev,
                    printWarningDays: Number(event.target.value),
                  }))
                }
                placeholder="Dias antes da impressão"
              />
              {warningPreview && printWarningPreview ? (
                <p className="muted">
                  Aviso da avaliação: {warningPreview.toLocaleDateString('pt-BR')} • Aviso de
                  impressão: {printWarningPreview.toLocaleDateString('pt-BR')}
                </p>
              ) : (
                <p className="muted">Defina a data da avaliação para calcular os avisos.</p>
              )}
              <button className="btn btn-accent" type="submit" disabled={classes.length === 0}>
                Salvar avaliação
              </button>
            </form>
          </section>
        </div>
      )
    }

    if (activeSection === 'Alunos') {
      return (
        <div className="two-column fade-in">
          <UploadPanel
            title="Importação de listas de alunos ou informações"
            items={uploadedFiles}
            onUpload={handleFileUpload}
          />
          <section className="card">
            <h3>Alunos cadastrados</h3>
            {students.length === 0 ? (
              <p className="muted">Nenhum aluno cadastrado ainda.</p>
            ) : (
              <div className="student-list">
                {students.map((student) => (
                  <div key={student.id} className="student-item">
                    <strong>{student.name}</strong>
                    <p className="muted">
                      Turma: {student.className || 'Não definida'} •{' '}
                      {student.note || 'Sem observações'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )
    }

    if (activeSection === 'Relatórios') {
      const allAverages = students.map(
        (student) =>
          student.grades.reduce((sum, grade) => sum + grade, 0) / student.grades.length,
      )
      const average =
        allAverages.length > 0
          ? allAverages.reduce((sum, value) => sum + value, 0) / allAverages.length
          : 0
      const studentsInAttention = allAverages.filter((value) => value < 7).length

      return (
        <section className="card fade-in">
          <h3>Relatórios rápidos</h3>
          <div className="summary-grid">
            <article className="summary-card">
              <p>Média geral da turma</p>
              <strong>{average.toFixed(1)}</strong>
            </article>
            <article className="summary-card">
              <p>Alunos em atenção</p>
              <strong>{studentsInAttention}</strong>
            </article>
            <article className="summary-card">
              <p>Atividades pendentes</p>
              <strong>{upcomingEvaluations.length}</strong>
            </article>
          </div>
        </section>
      )
    }

    return (
      <div className="content-stack fade-in">
        <div className="two-column">
          <section className="card">
            <h3>Integrações do agente</h3>
            <div className="integration-row">
              <button
                className={`btn ${driveConnected ? 'btn-accent' : ''}`}
                type="button"
                onClick={() => {
                  if (driveConnected) {
                    setDriveConnected(false)
                    setIntegrationMessage('Drive desconectado.')
                    return
                  }

                  void connectProvider('drive')
                }}
              >
                {driveConnected ? 'Drive conectado' : 'Conectar Drive'}
              </button>
              <button
                className={`btn ${officialSystemConnected ? 'btn-accent' : ''}`}
                type="button"
                onClick={() => {
                  if (officialSystemConnected) {
                    setOfficialSystemConnected(false)
                    setIntegrationMessage('Sistema oficial desconectado.')
                    return
                  }

                  void connectProvider('official-system')
                }}
              >
                {officialSystemConnected
                  ? 'Sistema oficial conectado'
                  : 'Conectar sistema oficial'}
              </button>
            </div>

            <div className="integration-row">
              <button
                className="btn"
                type="button"
                onClick={() => void fetchFilesFromDriveAction()}
              >
                Buscar arquivos no Drive
              </button>
              <button
                className="btn btn-accent"
                type="button"
                onClick={importSelectedDriveFile}
              >
                Importar arquivo selecionado
              </button>
            </div>

            {driveFiles.length > 0 && (
              <div className="drive-file-list">
                {driveFiles.map((file) => (
                  <label key={file.id} className="drive-file-item">
                    <input
                      type="radio"
                      name="drive-file"
                      checked={selectedDriveFileId === file.id}
                      onChange={() => setSelectedDriveFileId(file.id)}
                    />
                    <div>
                      <strong>{file.name}</strong>
                      <p className="muted">
                        {file.type} • {fileSizeLabel(file.size)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="integration-row">
              <button
                className="btn btn-accent"
                type="button"
                onClick={() => void publishGradesToOfficialSystem()}
              >
                Publicar notas no sistema oficial
              </button>
            </div>

            <div className="form integration-config">
              <h4>Configuração da API</h4>
              <select
                value={agentConfig.mode}
                onChange={(event) =>
                  setAgentConfig((prev) => ({
                    ...prev,
                    mode: event.target.value as AgentIntegrationConfig['mode'],
                  }))
                }
              >
                <option value="mock">Modo simulado (atual)</option>
                <option value="api">Modo API</option>
              </select>
              <input
                placeholder="Base URL da API"
                value={agentConfig.baseUrl}
                onChange={(event) =>
                  setAgentConfig((prev) => ({ ...prev, baseUrl: event.target.value }))
                }
              />
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={agentConfig.aiApiEnabled}
                  onChange={(event) =>
                    setAgentConfig((prev) => ({
                      ...prev,
                      aiApiEnabled: event.target.checked,
                    }))
                  }
                />
                Ativar agente por API de IA
              </label>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={agentConfig.apiKeyConfigured}
                  onChange={(event) =>
                    setAgentConfig((prev) => ({
                      ...prev,
                      apiKeyConfigured: event.target.checked,
                    }))
                  }
                />
                Chave de API configurada
              </label>
            </div>

            <p className="muted">{integrationMessage || 'Sem operações recentes.'}</p>
          </section>

          <section className="card">
            <h3>Histórico de publicações</h3>
            {publicationRecords.length === 0 ? (
              <p className="muted">Nenhuma publicação realizada ainda.</p>
            ) : (
              <div className="alert-list">
                {publicationRecords.map((record) => (
                  <div key={record.id} className="alert-item">
                    <strong>{record.className}</strong>
                    <p className="muted">
                      {record.students} alunos • {record.timestamp}
                    </p>
                    <small>{record.status}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="card">
          <h3>Feriados manuais</h3>
          {holidays.length === 0 ? (
            <p className="muted">Nenhum feriado cadastrado.</p>
          ) : (
            <div className="alert-list">
              {holidays.map((holiday) => (
                <div key={`${holiday.name}-${holiday.date}`} className="alert-item">
                  <strong>{holiday.name}</strong>
                  <p className="muted">{holiday.type}</p>
                  <small>{formatDate(holiday.date)}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="login-layout">
        <section className="card login-card">
          <h2>Carregando sessão...</h2>
        </section>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="login-layout">
        <section className="card login-card">
          <h1>Teacher Hub</h1>
          <p className="muted">
            Entre com Google para acessar o dashboard e começar com dados limpos.
          </p>
          <button className="btn btn-accent" type="button" onClick={() => void handleSignIn()}>
            Entrar com Google
          </button>
          {!isFirebaseConfigured && (
            <p className="muted">
              Firebase não configurado. Defina as variáveis VITE_FIREBASE_* no Render ou no
              arquivo .env.local.
            </p>
          )}
          {authError && <p className="muted">{authError}</p>}
        </section>
      </div>
    )
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Teacher Hub</h1>
        <p className="muted sidebar-user">{user.displayName || user.email}</p>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.section}
              className={`nav-item ${activeSection === item.section ? 'nav-active' : ''}`}
              onClick={() => setActiveSection(item.section)}
            >
              <span>{item.icon}</span>
              {item.section}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn" type="button" onClick={() => void handleSignOut()}>
            Sair
          </button>
          {authError && <p className="muted">{authError}</p>}
        </div>
      </aside>

      <main className="content">{renderContent()}</main>
    </div>
  )
}

export default App
