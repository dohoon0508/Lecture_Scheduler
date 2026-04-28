import { useMemo } from 'react'
import {
  getScheduleStatus,
  getRemainingSeconds,
  parseLocalDateOnly,
} from '../utils/schedule.js'
import { formatSecondsHuman } from '../utils/time.js'

function todayWeekday() {
  return new Date().getDay()
}

export default function SubjectDashboard({ subjects }) {
  const stats = useMemo(() => {
    const list = Array.isArray(subjects) ? subjects : []
    const tw = todayWeekday()

    let totalRemaining = 0
    const todayList = []
    let okCount = 0
    let shortCount = 0

    const withTarget = []

    for (const s of list) {
      if (!s) continue
      const rem = getRemainingSeconds(s)
      totalRemaining += rem

      const st = getScheduleStatus(s)
      if (rem <= 0) {
        okCount += 1
      } else if (st.calculable && st.canFinish) {
        okCount += 1
      } else if (st.calculable && !st.canFinish) {
        shortCount += 1
      }

      const days = Array.isArray(s.schedule?.studyDays)
        ? s.schedule.studyDays
        : []
      if (rem > 0 && days.includes(tw)) {
        todayList.push(s)
      }

      const td = s.schedule?.targetDate
      if (typeof td === 'string' && td) {
        const d = parseLocalDateOnly(td)
        if (d) withTarget.push({ subject: s, date: d, rem })
      }
    }

    withTarget.sort((a, b) => a.date - b.date)
    const nearest = withTarget.slice(0, 5).map((x) => x.subject)

    return {
      subjectCount: list.length,
      totalRemaining,
      todayList,
      nearest,
      okCount,
      shortCount,
    }
  }, [subjects])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">전체 요약</h2>
        <p className="mt-1 text-sm text-slate-600">
          왼쪽에서 과목을 선택하면 상세·챕터·스케줄을 관리할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">전체 과목 수</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">
            {stats.subjectCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            전체 남은 강의 시간 (원본)
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {formatSecondsHuman(stats.totalRemaining)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-900">완료 가능</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{stats.okCount}</p>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-900">일정상 부족</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{stats.shortCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">
          오늘 학습하면 좋은 과목
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          오늘 요일이 학습일로 설정되어 있고, 남은 챕터가 있는 과목입니다.
        </p>
        <ul className="mt-3 space-y-2">
          {stats.todayList.length === 0 ? (
            <li className="text-sm text-slate-500">해당 과목이 없습니다.</li>
          ) : (
            stats.todayList.map((s) => (
              <li
                key={s.id}
                className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{s.title}</span>
                <span className="shrink-0 text-slate-600">
                  남음 {formatSecondsHuman(getRemainingSeconds(s))}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">
          목표일이 가까운 과목
        </h3>
        <ul className="mt-3 space-y-2">
          {stats.nearest.length === 0 ? (
            <li className="text-sm text-slate-500">
              목표 완료일이 설정된 과목이 없습니다.
            </li>
          ) : (
            stats.nearest.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{s.title}</span>
                <span className="text-slate-600">
                  목표 {s.schedule?.targetDate || '—'} · 남음{' '}
                  {formatSecondsHuman(getRemainingSeconds(s))}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
