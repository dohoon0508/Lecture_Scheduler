import { isVideoChapter } from './chapterTypes.js'

/**
 * @param {string} targetDate "YYYY-MM-DD"
 * @returns {Date | null} 로컬 자정 기준
 */
export function parseLocalDateOnly(targetDate) {
  if (!targetDate || typeof targetDate !== 'string') return null
  const m = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null
  }
  dt.setHours(0, 0, 0, 0)
  return dt
}

/**
 * 오늘(포함)부터 목표 완료일(포함)까지 학습 요일에 해당하는 일수.
 * @param {string} targetDate
 * @param {number[]} studyDays 0=일 … 6=토
 */
export function countStudyDaysUntil(targetDate, studyDays) {
  const end = parseLocalDateOnly(targetDate)
  if (!end || !Array.isArray(studyDays) || studyDays.length === 0) return 0

  const set = new Set(
    studyDays
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  )
  if (set.size === 0) return 0

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  if (end < start) return 0

  let count = 0
  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    if (set.has(d.getDay())) count++
  }
  return count
}

/**
 * 남은 강의(원본 초)를 배속으로 나눈 실제 시청 초를 학습일수로 나눈 값 (올림).
 */
export function getRequiredDailySeconds(
  remainingSeconds,
  speed,
  studyDaysCount,
) {
  const rem = Number(remainingSeconds)
  const sp = Number(speed)
  const days = Number(studyDaysCount)
  if (!Number.isFinite(rem) || rem < 0) return 0
  if (!Number.isFinite(sp) || sp <= 0) return Number.POSITIVE_INFINITY
  if (!Number.isFinite(days) || days <= 0) return Number.POSITIVE_INFINITY
  const adjusted = rem / sp
  return Math.ceil(adjusted / days)
}

function sumRemainingVideoSeconds(subject) {
  if (!subject || typeof subject !== 'object') return 0
  const chapters = Array.isArray(subject.chapters) ? subject.chapters : []
  return chapters.reduce((acc, c) => {
    if (!c || c.completed || !isVideoChapter(c)) return acc
    const sec = Number(c?.durationSeconds)
    return acc + (Number.isFinite(sec) && sec > 0 ? sec : 0)
  }, 0)
}

/** @param {object} subject */
export function getRemainingSeconds(subject) {
  return sumRemainingVideoSeconds(subject)
}

/**
 * @param {object} subject
 * @returns {object} 스케줄 상태
 */
export function getScheduleStatus(subject) {
  const baseIncomplete = {
    calculable: false,
    studyDaysCount: 0,
    adjustedRemainingSeconds: 0,
    requiredDailySeconds: 0,
    availableDailySeconds: 0,
    canFinish: false,
    message: '목표일 또는 학습 요일을 설정해주세요.',
  }

  if (!subject || typeof subject !== 'object') {
    return baseIncomplete
  }

  const sched =
    subject.schedule && typeof subject.schedule === 'object'
      ? subject.schedule
      : {}
  const targetDate = sched.targetDate
  const studyDays = sched.studyDays
  const dailyMinutes = sched.dailyMinutes

  const missingConfig =
    !targetDate ||
    typeof targetDate !== 'string' ||
    !Array.isArray(studyDays) ||
    studyDays.length === 0 ||
    dailyMinutes == null ||
    dailyMinutes === '' ||
    !Number.isFinite(Number(dailyMinutes)) ||
    Number(dailyMinutes) <= 0

  if (missingConfig) {
    return { ...baseIncomplete }
  }

  const remainingSeconds = sumRemainingVideoSeconds(subject)
  let speed = Number(sched.speed)
  if (!Number.isFinite(speed) || speed <= 0) {
    speed = 1
  }

  const studyDaysCount = countStudyDaysUntil(targetDate, studyDays)
  const availableDailySeconds = Math.floor(Number(dailyMinutes) * 60)

  if (remainingSeconds <= 0) {
    const chapters = Array.isArray(subject.chapters) ? subject.chapters : []
    const hasIncompleteOther = chapters.some(
      (c) => c && !c.completed && !isVideoChapter(c),
    )
    return {
      calculable: true,
      studyDaysCount,
      adjustedRemainingSeconds: 0,
      requiredDailySeconds: 0,
      availableDailySeconds,
      canFinish: true,
      message: hasIncompleteOther
        ? '남은 영상 학습은 없습니다. 자료·과제·기타 항목은 체크리스트에서 관리할 수 있습니다.'
        : '모든 챕터를 완료했습니다.',
    }
  }

  if (studyDaysCount <= 0) {
    const adj = Math.round(remainingSeconds / speed)
    return {
      calculable: true,
      studyDaysCount: 0,
      adjustedRemainingSeconds: adj,
      requiredDailySeconds: Number.POSITIVE_INFINITY,
      availableDailySeconds,
      canFinish: false,
      message:
        '목표일이 이미 지났거나 남은 학습 가능일이 없습니다.',
    }
  }

  const adjustedRemainingSeconds = remainingSeconds / speed
  const requiredDailySeconds = getRequiredDailySeconds(
    remainingSeconds,
    speed,
    studyDaysCount,
  )
  const canFinish = requiredDailySeconds <= availableDailySeconds
  const message = canFinish
    ? '목표일까지 완료 가능합니다.'
    : `하루 학습 시간이 부족합니다. 하루에 최소 ${Math.ceil(requiredDailySeconds / 60)}분이 필요합니다.`

  return {
    calculable: true,
    studyDaysCount,
    adjustedRemainingSeconds: Math.round(adjustedRemainingSeconds),
    requiredDailySeconds,
    availableDailySeconds,
    canFinish,
    message,
  }
}
