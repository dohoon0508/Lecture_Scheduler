/**
 * 강의 시간 다양한 입력 형식을 초 단위로 변환합니다.
 * @param {string} raw
 * @returns {{ ok: true, seconds: number } | { ok: false, error: string }}
 */
export function parseDurationToSeconds(raw) {
  if (raw == null || typeof raw !== 'string') {
    return { ok: false, error: '입력이 비어 있습니다.' }
  }
  const input = raw.trim()
  if (!input) {
    return { ok: false, error: '입력이 비어 있습니다.' }
  }

  // 01:12:30 (hh:mm:ss)
  const hms = input.match(/^(\d{1,3}):(\d{2}):(\d{2})$/)
  if (hms) {
    const h = Number(hms[1])
    const m = Number(hms[2])
    const s = Number(hms[3])
    if (m > 59 || s > 59) {
      return { ok: false, error: '분/초 범위가 올바르지 않습니다.' }
    }
    return { ok: true, seconds: h * 3600 + m * 60 + s }
  }

  // 12:30 (mm:ss) — 강의 길이 맥락
  const ms = input.match(/^(\d{1,3}):(\d{2})$/)
  if (ms) {
    const mm = Number(ms[1])
    const ss = Number(ms[2])
    if (ss > 59) {
      return { ok: false, error: '초는 59 이하여야 합니다.' }
    }
    return { ok: true, seconds: mm * 60 + ss }
  }

  // N분
  const onlyMin = input.match(/^(\d+)\s*분\s*$/)
  if (onlyMin) {
    const n = Number(onlyMin[1])
    if (!Number.isFinite(n) || n < 0 || n > 99999) {
      return { ok: false, error: '분 값이 올바르지 않습니다.' }
    }
    return { ok: true, seconds: n * 60 }
  }

  // 더 넓은 "N시간 M분" 패턴 (공백 허용)
  const kr2 = input.match(/^(\d+)\s*시간\s*(\d+)\s*분\s*$/)
  if (kr2) {
    const h = Number(kr2[1])
    const m = Number(kr2[2])
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0 || m > 99999) {
      return { ok: false, error: '시간/분 값이 올바르지 않습니다.' }
    }
    return { ok: true, seconds: h * 3600 + m * 60 }
  }

  const krHourOnly = input.match(/^(\d+)\s*시간\s*$/)
  if (krHourOnly) {
    const h = Number(krHourOnly[1])
    if (!Number.isFinite(h) || h < 0 || h > 9999) {
      return { ok: false, error: '시간 값이 올바르지 않습니다.' }
    }
    return { ok: true, seconds: h * 3600 }
  }

  return { ok: false, error: '지원하지 않는 시간 형식입니다.' }
}

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatSecondsHMS(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '0:00'
  }
  const s = Math.floor(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatSecondsHuman(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '0분'
  }
  const s = Math.round(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const parts = []
  if (h > 0) parts.push(`${h}시간`)
  if (m > 0) parts.push(`${m}분`)
  if (r > 0 && h === 0) parts.push(`${r}초`)
  return parts.length ? parts.join(' ') : '0분'
}
