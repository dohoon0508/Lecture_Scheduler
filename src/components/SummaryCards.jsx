import { useEffect, useMemo, useState } from 'react'
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
  const savedSpeed =
    Number.isFinite(speed) && speed > 0 ? speed : 1

  const [sliderSpeed, setSliderSpeed] = useState(savedSpeed)

  useEffect(() => {
    setSliderSpeed(savedSpeed)
  }, [subject?.id, savedSpeed])

  const clampedSlider = Math.min(
    SPEED_MAX,
    Math.max(SPEED_MIN, sliderSpeed),
  )
  const adjustedPreview = stats.remainingVideoSeconds / clampedSlider

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
          배속 조절 시 예상 남은 시청 시간 (영상만)
        </p>
        <p className="mt-0.5 text-[11px] text-blue-900/65">
          원본 남은 영상 {formatSecondsHuman(stats.remainingVideoSeconds)} · 스케줄에
          저장된 배속 {formatSpeedLabel(savedSpeed)}
          {Math.abs(clampedSlider - savedSpeed) > 0.001 ? (
            <span className="text-amber-800">
              {' '}
              (슬라이더는 미리보기, 일정에는 아래 수강 배속이 반영됩니다)
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-blue-950">
          {formatSecondsHuman(adjustedPreview)}
        </p>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-blue-900/80">
            <span>재생 배속</span>
            <span className="font-semibold tabular-nums text-blue-950">
              {formatSpeedLabel(clampedSlider)}
            </span>
          </div>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            value={clampedSlider}
            onChange={(e) => setSliderSpeed(Number(e.target.value))}
            aria-label="재생 배속"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-blue-200/80 accent-blue-600"
          />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-blue-900/50">
            <span>{SPEED_MIN}×</span>
            <span>{SPEED_MAX}×</span>
          </div>
        </div>
      </div>
    </div>
  )
}
