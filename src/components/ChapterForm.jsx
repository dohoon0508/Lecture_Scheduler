import { useState } from 'react'
import { parseDurationToSeconds } from '../utils/time.js'

export default function ChapterForm({ onAddChapter }) {
  const [title, setTitle] = useState('')
  const [timeInput, setTimeInput] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const t = typeof title === 'string' ? title.trim() : ''
    if (!t) {
      setError('챕터명을 입력해주세요.')
      return
    }
    const parsed = parseDurationToSeconds(timeInput)
    if (!parsed.ok) {
      setError(parsed.error || '시간 형식을 확인해주세요.')
      return
    }
    if (parsed.seconds <= 0) {
      setError('시간은 0보다 커야 합니다.')
      return
    }
    onAddChapter({ title: t, durationSeconds: parsed.seconds })
    setTitle('')
    setTimeInput('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-700">챕터 추가</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">챕터명</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 1강 요구사항 확인"
            maxLength={300}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            시간 (12:30, 01:12:30, 80분 …)
          </label>
          <input
            type="text"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            placeholder="25:10"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      ) : null}
      <button
        type="submit"
        className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
      >
        챕터 추가
      </button>
    </form>
  )
}
