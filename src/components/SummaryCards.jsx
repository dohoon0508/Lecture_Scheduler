import { useMemo, useState } from 'react'
import { formatSecondsHuman } from '../utils/time.js'
import { isVideoChapter } from '../utils/chapterTypes.js'

const SPEED_MIN = 1
const SPEED_MAX = 3
const SPEED_STEP = 0.05

/** @param {number} x */
function formatSpeedLabel(x) {
  if (!Number.isFinite(x) || x <= 0) return '1×'
  const s = x.toFixed(2).replace(/\.?0+$/, '')
  return `${s}×`
}

/**
 * @param {object | null | undefined} subject
 */
function computeStats(subject) {
  const chapters = Array.isArray(subject?.chapters) ? subject.chapters : []
  let totalItems = 0
  let videoCount = 0
  let incompleteVideoCount = 0
  let docLikeCount = 0
  let unknownCount = 0
  let totalVideoSeconds = 0
  let doneVideoSeconds = 0
  let doneItems = 0

  for (const c of chapters) {
    if (!c) continue
    totalItems += 1
    const ct = c.contentType || 'video'
    if (ct === 'document' || ct === 'assignment') {
      docLikeCount += 1
    } else if (ct === 'unknown') {
      unknownCount += 1
    }

    if (isVideoChapter(c)) {
      videoCount += 1
      if (!c.completed) {
        incompleteVideoCount += 1
      }
      const sec = Number(c.durationSeconds)
      const d = Number.isFinite(sec) && sec > 0 ? sec : 0
      totalVideoSeconds += d
      if (c.completed) {
        doneVideoSeconds += d
        doneItems += 1
      }
    } else {
      if (c.completed) doneItems += 1
    }
  }

  const remainingVideoSeconds = Math.max(0, totalVideoSeconds - doneVideoSeconds)
  const timeProgress =
    totalVideoSeconds > 0
      ? Math.round((doneVideoSeconds / totalVideoSeconds) * 1000) / 10
      : 0
  const itemProgress =
    totalItems > 0 ? Math.round((doneItems / totalItems) * 1000) / 10 : 0

  return {
    totalItems,
    videoCount,
    incompleteVideoCount,
    docLikeCount,
    unknownCount,
    totalVideoSeconds,
    doneVideoSeconds,
    remainingVideoSeconds,
    doneItems,
    timeProgress,
    itemProgress,
  }
}

/** @param {{ label: string; percent: number }} props */
function ProgressBarRow({ label, percent }) {
  const p = Math.min(100, Math.max(0, percent))
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm text-slate-600">
        <span>{label}</span>
        <span className="shrink-0 tabular-nums font-medium text-slate-800">
          {p}%
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-200/90"
        role="progressbar"
        aria-valuenow={p}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-slate-700 transition-[width] duration-300 ease-out"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

/** @param {string} t @param {number} max */
function truncateTitle(t, max) {
  const s = (t || '').replace(/\s+/g, ' ').trim() || '제목 없음'
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/**
 * 완료한 영상은 제외한 rows만 사용. 남은 분량 T를 D일로 균등(n빵) 나눈 경계(강 단위).
 * @param {{ title: string, durationSeconds: number }[]} rows
 * @param {number} dayCount
 */
function buildLectureDayPlan(rows, dayCount) {
  const detailLines = []
  const n = rows.length
  const D = Math.floor(Number(dayCount))
  if (!Number.isFinite(D) || D < 1) {
    return { lines: [], detailLines: [] }
  }
  if (n === 0) {
    detailLines.push('미완료 영상 강의가 없습니다.')
    return { lines: [], detailLines }
  }

  const cum = []
  let s = 0
  for (const r of rows) {
    s += Number(r.durationSeconds) || 0
    cum.push(s)
  }
  const T = cum[n - 1]
  if (T <= 0) {
    detailLines.push('남은 영상 길이가 0입니다. (강 수만 참고하세요)')
  }

  const fair = T > 0 ? T / D : 0
  let prevEnd = -1

  for (let day = 1; day <= D; day++) {
    const start = prevEnd + 1
    if (start > n - 1) {
      detailLines.push(`${day}일차 — 추가로 들을 미완료 영상 없음`)
      continue
    }

    if (day === D) {
      const a = start + 1
      const b = n
      const tail =
        a === b
          ? `${b}강 (${truncateTitle(rows[start].title, 28)})`
          : `${a}~${b}강 (${truncateTitle(rows[start].title, 22)} … ${truncateTitle(rows[n - 1].title, 22)})`
      detailLines.push(`${day}일차 ~ 완강 · ${tail}`)
      break
    }

    const target = T > 0 ? (T * day) / D : 0
    let end = start
    if (T > 0) {
      while (end < n && cum[end] < target) {
        end += 1
      }
      if (end >= n) end = n - 1
      // 목표 분량보다 하루 치가 짧으면 다음 강까지
      while (end < n - 1) {
        const base = start > 0 ? cum[start - 1] : 0
        const slice = cum[end] - base
        if (slice + 1e-9 < fair) {
          end += 1
        } else {
          break
        }
      }
    } else {
      // 길이 0강들만 있을 때: 가능한 한 균등하게 갯수 나눔
      const remainingDays = D - day + 1
      const remainingCount = n - start
      const chunk = Math.ceil(remainingCount / remainingDays)
      end = Math.min(n - 1, start + chunk - 1)
    }

    const a = start + 1
    const b = end + 1
    if (a === b) {
      detailLines.push(
        `${day}일차 ~ ${b}강 (${truncateTitle(rows[end].title, 32)})`,
      )
    } else {
      detailLines.push(
        `${day}일차 ~ ${b}강까지 (${a}~${b}강, ${truncateTitle(rows[start].title, 22)} … ${truncateTitle(rows[end].title, 22)})`,
      )
    }
    prevEnd = end
  }

  return { lines: [], detailLines }
}

/**
 * @param {{
 *   savedSpeed: number
 *   incompleteContentSeconds: number
 *   incompleteVideoRows: { title: string, durationSeconds: number }[]
 * }} props
 */
function PlaybackSpeedPreview({
  savedSpeed,
  incompleteContentSeconds,
  incompleteVideoRows,
}) {
  const [sliderSpeed, setSliderSpeed] = useState(savedSpeed)
  const [planOpen, setPlanOpen] = useState(false)
  const [planDays, setPlanDays] = useState('7')
  const [planError, setPlanError] = useState('')
  /** @type {{ summary: string[]; dayLines: string[] } | null} */
  const [planResult, setPlanResult] = useState(null)

  const clamped = Math.min(SPEED_MAX, Math.max(SPEED_MIN, sliderSpeed))
  const adjustedPreview =
    incompleteContentSeconds > 0 ? incompleteContentSeconds / clamped : 0

  function runPlan() {
    setPlanError('')
    setPlanResult(null)
    const raw = String(planDays).trim().replace(/,/g, '')
    const d = Number(raw)
    if (!Number.isFinite(d) || d < 1 || d > 3650) {
      setPlanError('1~3650 사이의 일수를 입력해 주세요.')
      return
    }
    const dInt = Math.floor(d)
    if (incompleteVideoRows.length === 0) {
      setPlanResult({
        summary: [
          '미완료 영상 강의가 없습니다. (이미 본 강은 일정에서 빼고 계산합니다.)',
        ],
        dayLines: [],
      })
      return
    }
    const wall =
      incompleteContentSeconds > 0 ? incompleteContentSeconds / clamped : 0
    if (wall <= 0) {
      const summary = [
        '남은 영상 길이 합이 0입니다. 아래는 미완료 강 개수만 균등하게 나눕니다.',
      ]
      const { detailLines } = buildLectureDayPlan(incompleteVideoRows, dInt)
      setPlanResult({ summary, dayLines: detailLines })
      return
    }
    const perDay = wall / dInt
    const summary = [
      `완료한 영상은 제외했습니다. 남은 영상 길이 ${formatSecondsHuman(incompleteContentSeconds)}을 ${dInt}일로 n빵 나누면, 슬라이더 배속 ${formatSpeedLabel(clamped)} 기준 하루 평균 약 ${formatSecondsHuman(perDay)} 시청이면 됩니다.`,
      '일차별 목표는 같은 남은 분량만 강 순서대로 나눈 것입니다. 한 날 분량이 딱 맞지 않으면 다음 강까지 듣도록 묶었습니다.',
    ]
    const { detailLines } = buildLectureDayPlan(incompleteVideoRows, dInt)
    setPlanResult({ summary, dayLines: detailLines })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        배속 조절 시 예상 남은 시청 시간 (영상만)
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        미완료 영상 길이 합 {formatSecondsHuman(incompleteContentSeconds)} (완료한
        영상 제외) · 저장된 배속 {formatSpeedLabel(savedSpeed)}
        {Math.abs(clamped - savedSpeed) > 0.001 ? (
          <span className="text-slate-600"> (슬라이더는 미리보기입니다)</span>
        ) : null}
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <p className="text-2xl font-semibold tabular-nums text-slate-900">
          {incompleteContentSeconds > 0
            ? formatSecondsHuman(adjustedPreview)
            : incompleteVideoRows.length > 0
              ? '길이 0 · 강만 남음'
              : '—'}
        </p>

        <div className="w-full">
          {!planOpen ? (
            <button
              type="button"
              onClick={() => {
                setPlanOpen(true)
                setPlanError('')
                setPlanResult(null)
              }}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 sm:max-w-md"
            >
              며칠 안에 끝내려면?
            </button>
          ) : (
            <div className="w-full space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:max-w-none">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    목표 일수
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    inputMode="numeric"
                    value={planDays}
                    onChange={(e) => setPlanDays(e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={runPlan}
                  className="shrink-0 rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900"
                >
                  계산
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlanOpen(false)
                    setPlanError('')
                    setPlanResult(null)
                  }}
                  className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 hover:bg-slate-100"
                >
                  닫기
                </button>
              </div>
              {planError ? (
                <p className="text-xs text-rose-600">{planError}</p>
              ) : null}
              {planResult ? (
                <div className="mt-2 space-y-3">
                  <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700">
                    {planResult.summary.map((line, i) => (
                      <li key={`s-${i}`}>{line}</li>
                    ))}
                  </ul>
                  {planResult.dayLines.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600">
                        일차별 (완료 제외·미완료 영상만 1강부터 순서대로)
                      </p>
                      <ol className="mt-1.5 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-800">
                        {planResult.dayLines.map((line, i) => (
                          <li key={`d-${i}`} className="pl-0.5">
                            {line}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>재생 배속</span>
          <span className="font-semibold tabular-nums text-slate-800">
            {formatSpeedLabel(clamped)}
          </span>
        </div>
        <input
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={SPEED_STEP}
          value={clamped}
          onChange={(e) => setSliderSpeed(Number(e.target.value))}
          aria-label="재생 배속"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-700"
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-400">
          <span>{SPEED_MIN}×</span>
          <span>{SPEED_MAX}×</span>
        </div>
      </div>
    </div>
  )
}

export default function SummaryCards({ subject }) {
  const stats = useMemo(() => computeStats(subject), [subject])
  const incompleteVideoRows = useMemo(() => {
    const ch = Array.isArray(subject?.chapters) ? subject.chapters : []
    const rows = []
    for (const c of ch) {
      if (!c || !isVideoChapter(c) || c.completed) continue
      const sec = Number(c.durationSeconds)
      const d = Number.isFinite(sec) && sec >= 0 ? Math.floor(sec) : 0
      rows.push({
        title: (c.title || '').trim() || `강의 ${rows.length + 1}`,
        durationSeconds: d,
      })
    }
    return rows
  }, [subject])
  const incompleteContentSeconds = useMemo(
    () =>
      incompleteVideoRows.reduce(
        (a, r) => a + (Number(r.durationSeconds) || 0),
        0,
      ),
    [incompleteVideoRows],
  )
  const speed = Number(subject?.schedule?.speed)
  const savedSpeed =
    Number.isFinite(speed) && speed > 0 ? speed : 1

  if (!subject) return null

  const detailsLine1 = [
    `전체 ${stats.totalItems}개`,
    `영상 ${stats.videoCount}개`,
    `자료/과제 ${stats.docLikeCount}개`,
  ]
  if (stats.unknownCount > 0) {
    detailsLine1.push(`확인 필요 ${stats.unknownCount}개`)
  }

  const detailsLine2 = [
    `전체 영상 ${formatSecondsHuman(stats.totalVideoSeconds)}`,
    `완료한 영상 ${formatSecondsHuman(stats.doneVideoSeconds)}`,
    `남은 영상 ${formatSecondsHuman(stats.remainingVideoSeconds)}`,
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">남은 영상 시간</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-amber-700">
            {formatSecondsHuman(stats.remainingVideoSeconds)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">시간 기준 진행률</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {stats.timeProgress}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">완료 항목</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {stats.doneItems} / {stats.totalItems}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-6 shadow-sm">
        <p className="mb-5 text-sm font-semibold text-slate-800">진행률</p>
        <div className="space-y-6">
          <ProgressBarRow
            label="영상 시간 기준"
            percent={stats.timeProgress}
          />
          <ProgressBarRow
            label="전체 항목 기준"
            percent={stats.itemProgress}
          />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          세부 정보
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {detailsLine1.join(' · ')}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {detailsLine2.join(' · ')}
        </p>
      </div>

      <PlaybackSpeedPreview
        key={`${subject.id}-${savedSpeed}`}
        savedSpeed={savedSpeed}
        incompleteContentSeconds={incompleteContentSeconds}
        incompleteVideoRows={incompleteVideoRows}
      />
    </div>
  )
}
