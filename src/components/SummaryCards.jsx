import { useMemo } from 'react'
import { formatSecondsHuman } from '../utils/time.js'

const SPEED_PRESETS = [1, 1.25, 1.5, 1.75, 2]

function chapterTotals(subject) {
  const chapters = Array.isArray(subject?.chapters) ? subject.chapters : []
  let total = 0
  let completed = 0
  for (const c of chapters) {
    if (!c) continue
    const sec = Number(c.durationSeconds)
    const d = Number.isFinite(sec) && sec > 0 ? sec : 0
    total += d
    if (c.completed) completed += d
  }
  const remaining = Math.max(0, total - completed)
  const progress = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0
  return { total, completed, remaining, progress }
}

export default function SummaryCards({ subject }) {
  const stats = useMemo(() => chapterTotals(subject), [subject])
  const speed = Number(subject?.schedule?.speed)
  const currentSpeed =
    Number.isFinite(speed) && speed > 0 ? speed : 1

  const adjustedCurrent = stats.remaining / currentSpeed

  if (!subject) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">전체 강의 시간</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {formatSecondsHuman(stats.total)}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">완료한 강의 시간</p>
        <p className="mt-1 text-lg font-semibold text-emerald-700">
          {formatSecondsHuman(stats.completed)}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">남은 원본 강의 시간</p>
        <p className="mt-1 text-lg font-semibold text-amber-700">
          {formatSecondsHuman(stats.remaining)}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">진행률</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {stats.progress}%
        </p>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm sm:col-span-2 lg:col-span-2">
        <p className="text-xs font-medium text-blue-800/80">
          현재 설정 배속 ({currentSpeed}×) 기준 실제 남은 시청 시간
        </p>
        <p className="mt-1 text-lg font-semibold text-blue-900">
          {formatSecondsHuman(adjustedCurrent)}
        </p>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold text-slate-600">
            배속별 남은 시청 시간 (원본 {formatSecondsHuman(stats.remaining)} 기준)
          </p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            {SPEED_PRESETS.map((sp) => (
              <div
                key={sp}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <p className="text-xs text-slate-500">{sp}×</p>
                <p className="text-sm font-medium text-slate-800">
                  {formatSecondsHuman(stats.remaining / sp)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
