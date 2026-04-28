/**
 * @param {string | null | undefined} durationText
 * @returns {number}
 */
export function parseDurationTextToSeconds(durationText) {
  if (durationText == null || typeof durationText !== 'string') return 0
  const s = durationText.trim()
  if (!s) return 0

  const hms = s.match(/^(\d{1,3}):(\d{2}):(\d{2})$/)
  if (hms) {
    const h = Number(hms[1])
    const m = Number(hms[2])
    const sec = Number(hms[3])
    if (m > 59 || sec > 59 || !Number.isFinite(h)) return 0
    return h * 3600 + m * 60 + sec
  }

  const ms = s.match(/^(\d{1,3}):(\d{2})$/)
  if (ms) {
    const mm = Number(ms[1])
    const sec = Number(ms[2])
    if (sec > 59 || !Number.isFinite(mm)) return 0
    return mm * 60 + sec
  }

  return 0
}

/**
 * @param {string | null | undefined} title
 * @returns {string}
 */
export function normalizeTitle(title) {
  if (title == null || typeof title !== 'string') return ''
  return title
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string | null} opts.durationText
 * @param {string} opts.sectionTitle
 * @param {string} [opts.iconLabel]
 * @returns {'video'|'document'|'assignment'|'unknown'}
 */
export function detectContentType({
  title,
  durationText,
  sectionTitle,
  iconLabel = '',
}) {
  const dt =
    durationText != null && typeof durationText === 'string'
      ? durationText.trim()
      : ''
  if (dt && parseDurationTextToSeconds(dt) > 0) {
    return 'video'
  }

  const combined = `${title || ''} ${sectionTitle || ''} ${iconLabel || ''}`

  if (
    /(?:문서\s*자료|문서자료|\(문서|\b문서\b|\b자료\b|연습문제|\(Materials Only\)|\(Data Only\)|only\s*자료|Materials Only|Data Only)/i.test(
      combined,
    )
  ) {
    return 'document'
  }

  if (/(?:퀴즈|과제|테스트|실습)/.test(combined)) {
    return 'assignment'
  }

  return 'unknown'
}

/**
 * 줄 끝에서 지속 시간 문자열 추출 (MM:SS 또는 HH:MM:SS)
 * @param {string} line
 * @returns {{ cleanTitle: string, durationText: string | null }}
 */
export function extractDurationFromLineEnd(line) {
  const raw = normalizeTitle(line)
  if (!raw) return { cleanTitle: '', durationText: null }

  const hms = raw.match(/^(.+?)\s+(\d{1,2}:\d{2}:\d{2})\s*$/)
  if (hms) {
    const cleanTitle = normalizeTitle(hms[1])
    return { cleanTitle, durationText: hms[2] }
  }

  const ms = raw.match(/^(.+?)\s+(\d{1,3}:\d{2})\s*$/)
  if (ms) {
    const cleanTitle = normalizeTitle(ms[1])
    const d = ms[2]
    const parts = d.split(':')
    if (parts.length === 2) {
      const mm = Number(parts[0])
      const ss = Number(parts[1])
      if (ss <= 59 && mm >= 0 && mm <= 999) {
        return { cleanTitle, durationText: d }
      }
    }
  }

  return { cleanTitle: raw, durationText: null }
}
