import { formatSecondsHMS } from '../utils/time.js'

export default function ChapterList({ chapters, onToggleComplete, onDelete }) {
  if (!Array.isArray(chapters)) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">챕터 목록</h3>
      </div>
      <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto md:max-h-96">
        {chapters.map((c) => {
          if (!c || !c.id) return null
          const sec = Number(c.durationSeconds)
          const dur =
            Number.isFinite(sec) && sec >= 0 ? sec : 0
          return (
            <li
              key={c.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/80"
            >
              <label className="flex cursor-pointer items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  checked={Boolean(c.completed)}
                  onChange={() => onToggleComplete(c.id)}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    c.completed ? 'text-slate-400 line-through' : 'text-slate-800'
                  }`}
                >
                  {c.title || '챕터'}
                </p>
                <p className="text-xs text-slate-500">
                  {formatSecondsHMS(dur)} · {dur}초
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="shrink-0 text-xs text-rose-600 hover:underline"
              >
                삭제
              </button>
            </li>
          )
        })}
      </ul>
      {chapters.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          챕터가 없습니다.
        </p>
      )}
    </div>
  )
}
