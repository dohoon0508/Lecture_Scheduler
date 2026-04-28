import { useMemo } from 'react'
import { formatSecondsHuman } from '../utils/time.js'
import { isVideoChapter } from '../utils/chapterTypes.js'

const SPEED_PRESETS = [1, 1.25, 1.5, 1.75, 2]

/**
 * @param {object | null | undefined} subject
 */
function computeStats(subject) {
  const chapters = Array.isArray(subject?.chapters) ? subject.chapters : []
  let totalItems = 0
  let videoCount = 0
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

export default function SummaryCards({ subject }) {
  const stats = useMemo(() => computeStats(subject), [subject])
  const speed = Number(subject?.schedule?.speed)
  const currentSpeed =
    Number.isFinite(speed) && speed > 0 ? speed : 1

  const adjustedCurrent = stats.remainingVideoSeconds / currentSpeed

  if (!subject) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">전체 항목 수</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {stats.totalItems}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">영상 강의 수</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {stats.videoCount}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">문서·과제 수</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {stats.docLikeCount}
          {stats.unknownCount > 0 ? (
            <span className="ml-1 text-sm font-normal text-amber-700">
              (확인 필요 {stats.unknownCount})
            </span>
          ) : null}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">전체 영상 시간</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {formatSecondsHuman(stats.totalVideoSeconds)}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">완료한 영상 시간</p>
        <p className="mt-1 text-lg font-semibold text-emerald-700">
          {formatSecondsHuman(stats.doneVideoSeconds)}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">남은 영상 시간</p>
        <p className="mt-1 text-lg font-semibold text-amber-700">
          {formatSecondsHuman(stats.remainingVideoSeconds)}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">완료한 항목 수</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {stats.doneItems} / {stats.totalItems}
        </p>
      </div>
      <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm sm:col-span-2">
        <p className="text-xs font-medium text-violet-900/80">진행률</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-violet-950">
          <span>
            <span className="font-semibold">시간 기준</span> (영상):{' '}
            {stats.timeProgress}%
          </span>
          <span>
            <span className="font-semibold">항목 기준</span> (전체):{' '}
            {stats.itemProgress}%
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm sm:col-span-2 lg:col-span-3">
        <p className="text-xs font-medium text-blue-800/80">
          현재 설정 배속 ({currentSpeed}×) 기준 실제 남은 시청 시간 (영상만)
        </p>
        <p className="mt-1 text-lg font-semibold text-blue-900">
          {formatSecondsHuman(adjustedCurrent)}
        </p>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold text-slate-600">
            배속별 남은 시청 시간 (영상{' '}
            {formatSecondsHuman(stats.remainingVideoSeconds)} 기준)
          </p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            {SPEED_PRESETS.map((sp) => (
              <div
                key={sp}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <p className="text-xs text-slate-500">{sp}×</p>
                <p className="text-sm font-medium text-slate-800">
                  {formatSecondsHuman(stats.remainingVideoSeconds / sp)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
