import { useEffect, useRef, useState } from 'react'

export default function SubjectList({
  subjects,
  selectedId,
  onSelect,
  onDelete,
  onRename,
}) {
  const [editingId, setEditingId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  if (!Array.isArray(subjects)) {
    return null
  }

  function startEdit(s) {
    setEditingId(s.id)
    setDraftTitle(s.title ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftTitle('')
  }

  function confirmEdit(id) {
    const t = draftTitle.trim()
    if (!t) return
    if (typeof onRename === 'function') {
      onRename(id, t)
    }
    setEditingId(null)
    setDraftTitle('')
  }

  return (
    <div className="flex flex-col gap-1">
      <h2 className="mb-2 text-sm font-semibold text-slate-600">과목 목록</h2>
      <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto md:max-h-[calc(100vh-12rem)]">
        {subjects.map((s) => {
          if (!s || !s.id) return null
          const active = s.id === selectedId
          const editing = editingId === s.id

          if (editing) {
            return (
              <li key={s.id}>
                <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-2 shadow-sm">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    maxLength={200}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        confirmEdit(s.id)
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEdit()
                      }
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="mt-2 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmEdit(s.id)}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      확인
                    </button>
                  </div>
                </div>
              </li>
            )
          }

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
                    startEdit(s)
                  }}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  aria-label="과목명 수정"
                >
                  수정
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
                    if (editingId === s.id) cancelEdit()
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
