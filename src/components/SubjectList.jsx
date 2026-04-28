export default function SubjectList({
  subjects,
  selectedId,
  onSelect,
  onDelete,
}) {
  if (!Array.isArray(subjects)) {
    return null
  }

  return (
    <div className="flex flex-col gap-1">
      <h2 className="mb-2 text-sm font-semibold text-slate-600">과목 목록</h2>
      <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto md:max-h-[calc(100vh-12rem)]">
        {subjects.map((s) => {
          if (!s || !s.id) return null
          const active = s.id === selectedId
          return (
            <li key={s.id}>
              <div
                className={`flex items-center gap-1 rounded-lg border transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm font-medium text-slate-800"
                >
                  <span className="line-clamp-2">{s.title || '과목'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (
                      typeof window !== 'undefined' &&
                      !window.confirm('이 과목을 삭제할까요?')
                    ) {
                      return
                    }
                    onDelete(s.id)
                  }}
                  className="mr-1 shrink-0 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                  aria-label="과목 삭제"
                >
                  삭제
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {subjects.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">
          과목이 없습니다. 과목을 추가해 보세요.
        </p>
      )}
    </div>
  )
}
