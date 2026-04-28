const STORAGE_KEY = 'lecture-scheduler-subjects'
const LEGACY_KEY = 'lecture-scheduler-lectures'

export function generateId(prefix) {
  const p = typeof prefix === 'string' && prefix ? prefix : 'id'
  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return `${p}_${crypto.randomUUID()}`
    }
  } catch {
      /* ignore */
  }
  return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function defaultSchedule() {
  return {
    targetDate: '',
    dailyMinutes: 60,
    speed: 1.5,
    studyDays: [1, 2, 3, 4, 5],
  }
}

function normalizeChapter(c) {
  if (!c || typeof c !== 'object') return null
  const id = typeof c.id === 'string' && c.id ? c.id : generateId('chapter')
  const title = typeof c.title === 'string' ? c.title : '챕터'
  const durationSeconds = Number(c.durationSeconds)
  return {
    id,
    title,
    durationSeconds:
      Number.isFinite(durationSeconds) && durationSeconds >= 0
        ? Math.floor(durationSeconds)
        : 0,
    completed: Boolean(c.completed),
  }
}

function normalizeSubject(s) {
  if (!s || typeof s !== 'object') return null
  const id = typeof s.id === 'string' && s.id ? s.id : generateId('subject')
  const title = typeof s.title === 'string' ? s.title : '과목'
  let createdAt =
    typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString()
  try {
    if (Number.isNaN(Date.parse(createdAt))) {
      createdAt = new Date().toISOString()
    }
  } catch {
    createdAt = new Date().toISOString()
  }

  const rawChapters = Array.isArray(s.chapters) ? s.chapters : []
  const chapters = rawChapters.map(normalizeChapter).filter(Boolean)

  const schedIn =
    s.schedule && typeof s.schedule === 'object' ? s.schedule : {}
  const schedule = {
    ...defaultSchedule(),
    targetDate:
      typeof schedIn.targetDate === 'string' ? schedIn.targetDate : '',
    dailyMinutes: (() => {
      const n = Number(schedIn.dailyMinutes)
      return Number.isFinite(n) && n > 0 ? n : 60
    })(),
    speed: (() => {
      const n = Number(schedIn.speed)
      return Number.isFinite(n) && n > 0 ? n : 1.5
    })(),
    studyDays: (() => {
      if (!Array.isArray(schedIn.studyDays)) return [1, 2, 3, 4, 5]
      const days = schedIn.studyDays
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      return days.length
        ? [...new Set(days)].sort((a, b) => a - b)
        : [1, 2, 3, 4, 5]
    })(),
  }

  return { id, title, createdAt, chapters, schedule }
}

function tryMigrateLegacy(raw) {
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    if (first && typeof first === 'object' && 'chapters' in first) {
      return null
    }
    const chapters = data
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const t = typeof row.title === 'string' ? row.title : '챕터'
        const sec = Number(row.durationSeconds ?? row.duration ?? 0)
        return {
          id: generateId('chapter'),
          title: t,
          durationSeconds:
            Number.isFinite(sec) && sec >= 0 ? Math.floor(sec) : 0,
          completed: Boolean(row.completed),
        }
      })
      .filter(Boolean)

    return [
      {
        id: generateId('subject'),
        title: '가져온 과목',
        createdAt: new Date().toISOString(),
        chapters,
        schedule: defaultSchedule(),
      },
    ]
  } catch {
    return null
  }
}

export function loadSubjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (!Array.isArray(data)) return []
      return data.map(normalizeSubject).filter(Boolean)
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const migrated = tryMigrateLegacy(legacy)
      if (migrated && migrated.length) {
        saveSubjects(migrated)
        localStorage.removeItem(LEGACY_KEY)
        return migrated
      }
    }
  } catch {
    /* ignore */
  }
  return []
}

export function saveSubjects(subjects) {
  try {
    if (!Array.isArray(subjects)) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects))
  } catch {
    /* ignore */
  }
}

export function createEmptySubject(title = '새 과목') {
  return {
    id: generateId('subject'),
    title:
      typeof title === 'string' && title.trim() ? title.trim() : '새 과목',
    createdAt: new Date().toISOString(),
    chapters: [],
    schedule: defaultSchedule(),
  }
}
