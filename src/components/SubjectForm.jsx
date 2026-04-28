import { useState } from 'react'

export default function SubjectForm({ onAdd }) {
  const [title, setTitle] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const t = typeof title === 'string' ? title.trim() : ''
    if (!t) return
    onAdd(t)
    setTitle('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <label
        htmlFor="new-subject-title"
        className="text-xs font-medium text-slate-500"
      >
        새 과목
      </label>
      <div className="flex gap-2">
        <input
          id="new-subject-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="과목명"
          maxLength={200}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          과목 추가
        </button>
      </div>
    </form>
  )
}
