import { parseDurationToSeconds } from './time.js'

/** 줄 끝에서 시간 문자열 추출용 패턴 (긴 형식부터) */
const LINE_TIME_PATTERNS = [
  /\s+(\d{1,3}:\d{2}:\d{2})\s*$/,
  /\s+(\d{1,3}:\d{2})\s*$/,
  /\s+(\d+\s*시간\s*\d+\s*분)\s*$/,
  /\s+(\d+\s*시간)\s*$/,
  /\s+(\d+\s*분)\s*$/,
]

/**
 * 한 줄에서 제목과 duration 초를 분리합니다.
 * @param {string} line
 * @returns {{ ok: true, title: string, durationSeconds: number } | { ok: false }}
 */
export function parseBulkLine(line) {
  if (typeof line !== 'string') {
    return { ok: false }
  }
  const trimmed = line.trim()
  if (!trimmed) {
    return { ok: false }
  }

  for (const re of LINE_TIME_PATTERNS) {
    const m = trimmed.match(re)
    if (!m) continue
    const timeStr = m[1].trim()
    const titleEnd = trimmed.slice(0, m.index).trim()
    if (!titleEnd) {
      return { ok: false }
    }
    const parsed = parseDurationToSeconds(timeStr)
    if (!parsed.ok) {
      return { ok: false }
    }
    return { ok: true, title: titleEnd, durationSeconds: parsed.seconds }
  }

  return { ok: false }
}

/**
 * 여러 줄 붙여넣기 → 성공 목록 + 실패 목록
 * @param {string} text
 * @returns {{ chapters: Array<{ title: string, durationSeconds: number }>, failedLines: string[] }}
 */
export function parseBulkPaste(text) {
  if (text == null || typeof text !== 'string') {
    return { chapters: [], failedLines: [] }
  }
  const chapters = []
  const failedLines = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const r = parseBulkLine(line)
    if (r.ok) {
      chapters.push({ title: r.title, durationSeconds: r.durationSeconds })
    } else {
      failedLines.push(line.trim())
    }
  }
  return { chapters, failedLines }
}
