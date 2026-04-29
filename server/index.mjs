import cors from 'cors'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const app = express()
const port = Number(process.env.PORT || 3000)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fallbackDataPath = path.join(__dirname, 'data', 'state.json')

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const defaultState = {
  classes: [],
  activeClass: '',
  students: [],
  uploadedFiles: [],
  holidays: [],
  evaluations: [],
  publicationRecords: [],
}

function sanitizeState(value) {
  if (!value || typeof value !== 'object') return defaultState

  const next = value
  return {
    classes: Array.isArray(next.classes) ? next.classes : [],
    activeClass: typeof next.activeClass === 'string' ? next.activeClass : '',
    students: Array.isArray(next.students) ? next.students : [],
    uploadedFiles: Array.isArray(next.uploadedFiles) ? next.uploadedFiles : [],
    holidays: Array.isArray(next.holidays) ? next.holidays : [],
    evaluations: Array.isArray(next.evaluations) ? next.evaluations : [],
    publicationRecords: Array.isArray(next.publicationRecords)
      ? next.publicationRecords
      : [],
  }
}

const usePostgres = Boolean(process.env.DATABASE_URL)
const sslEnabled = process.env.DATABASE_SSL !== 'false'
const pgPool = usePostgres
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    })
  : null

async function ensureSchema() {
  if (!pgPool) return

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id SMALLINT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function readFallbackState() {
  try {
    const content = await fs.readFile(fallbackDataPath, 'utf-8')
    return sanitizeState(JSON.parse(content))
  } catch {
    return defaultState
  }
}

async function writeFallbackState(state) {
  const safeState = sanitizeState(state)
  await fs.mkdir(path.dirname(fallbackDataPath), { recursive: true })
  await fs.writeFile(fallbackDataPath, JSON.stringify(safeState, null, 2), 'utf-8')
  return safeState
}

async function readState() {
  if (!pgPool) return readFallbackState()

  await ensureSchema()
  const result = await pgPool.query('SELECT payload FROM app_state WHERE id = 1')

  if (!result.rows[0]?.payload) {
    await writeState(defaultState)
    return defaultState
  }

  return sanitizeState(result.rows[0].payload)
}

async function writeState(state) {
  const safeState = sanitizeState(state)

  if (!pgPool) {
    return writeFallbackState(safeState)
  }

  await ensureSchema()
  await pgPool.query(
    `
    INSERT INTO app_state (id, payload, updated_at)
    VALUES (1, $1::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
  `,
    [JSON.stringify(safeState)],
  )

  return safeState
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: usePostgres ? 'postgres' : 'file' })
})

app.get('/api/state', async (_req, res) => {
  try {
    const state = await readState()
    res.json(state)
  } catch (error) {
    res.status(500).json({ message: 'Falha ao carregar estado.' })
  }
})

app.put('/api/state', async (req, res) => {
  try {
    const state = await writeState(req.body)
    res.json(state)
  } catch {
    res.status(500).json({ message: 'Falha ao salvar estado.' })
  }
})

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API pronta na porta ${port}`)
})
