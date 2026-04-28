import { getScheduleStatus } from '../utils/schedule.js'
import { formatSecondsHuman } from '../utils/time.js'

const WEEK = [
  { v: 0, l: '일' },
  { v: 1, l: '월' },
  { v: 2, l: '화' },
  { v: 3, l: '수' },
  { v: 4, l: '목' },
  { v: 5, l: '금' },
  { v: 6, l: '토' },
]

function formatRequired(sec) {
  if (!Number.isFinite(sec)) return '—'
  if (sec === Number.POSITIVE_INFINITY) return '계산 불가'
  return formatSecondsHuman(sec)
}

export default function ScheduleCard({ subject, onScheduleChange }) {
  if (!subject) return null

  const sched = subject.schedule || {}
  const status = getScheduleStatus(subject)

  function patchSchedule(partial) {
    if (typeof onScheduleChange !== 'function') return
    onScheduleChange({
      ...sched,
      ...partial,
    })
  }

  function toggleDay(day) {
    const cur = Array.isArray(sched.studyDays) ? [...sched.studyDays] : []
    const n = Number(day)
    const set = new Set(cur.map(Number))
    if (set.has(n)) set.delete(n)
    else set.add(n)
    patchSchedule({
      studyDays: [...set].sort((a, b) => a - b),
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            목표 완료일
          </label>
          <input
            type="date"
            value={typeof sched.targetDate === 'string' ? sched.targetDate : ''}
            onChange={(e) => patchSchedule({ targetDate: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            하루 학습 가능 시간 (분)
          </label>
          <input
            type="number"
            min={1}
            max={1440}
            value={sched.dailyMinutes ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value)
              patchSchedule({
                dailyMinutes: Number.isFinite(n) && n > 0 ? Math.min(1440, Math.floor(n)) : '',
              })
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            학습 요일
          </span>
          <div className="flex flex-wrap gap-2">
            {WEEK.map(({ v, l }) => {
              const checked = Array.isArray(sched.studyDays) && sched.studyDays.includes(v)
              return (
                <label
                  key={v}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${
                    checked
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDay(v)}
                    className="size-3.5 rounded border-slate-300 text-emerald-600"
                  />
                  {l}
                </label>
              )
            })}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            수강 배속
          </label>
          <select
            value={String(sched.speed ?? 1.5)}
            onChange={(e) => {
              const n = Number(e.target.value)
              patchSchedule({ speed: Number.isFinite(n) && n > 0 ? n : 1 })
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {[1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`rounded-lg border p-4 ${
          !status.calculable
            ? 'border-slate-200 bg-slate-50'
            : status.canFinish
              ? 'border-emerald-200 bg-emerald-50/80'
              : 'border-amber-300 bg-amber-50/90'
        }`}
      >
        <p className="text-xs font-semibold text-slate-600">스케줄 진단</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">목표일까지 남은 학습 가능일</dt>
            <dd className="font-medium text-slate-800">{status.studyDaysCount}일</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">배속 적용 후 실제 남은 시간</dt>
            <dd className="font-medium text-slate-800">
              {formatSecondsHuman(status.adjustedRemainingSeconds)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">목표까지 하루에 필요한 시간</dt>
            <dd className="font-medium text-slate-800">
              {formatRequired(status.requiredDailySeconds)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">현재 계획으로 가능 여부</dt>
            <dd
              className={`font-semibold ${
                !status.calculable
                  ? 'text-slate-600'
                  : status.canFinish
                    ? 'text-emerald-700'
                    : 'text-amber-800'
              }`}
            >
              {!status.calculable
                ? '계산 불가'
                : status.canFinish
                  ? '완료 가능'
                  : '시간 부족'}
            </dd>
          </div>
        </dl>
        <p
          className={`mt-3 text-sm ${
            !status.calculable
              ? 'text-slate-600'
              : status.canFinish
                ? 'text-emerald-800'
                : 'text-amber-900'
          }`}
        >
          {status.message}
        </p>
      </div>
    </div>
  )
}
