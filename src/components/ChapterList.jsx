import { useState } from 'react'
import { formatSecondsHMS } from '../utils/time.js'
import { parseDurationToSeconds } from '../utils/time.js'
import { CONTENT_TYPE_LABELS, isVideoChapter } from '../utils/chapterTypes.js'

function badgeClass(ct) {
  switch (ct) {
    case 'video':
      return 'bg-sky-100 text-sky-800 border-sky-200'
    case 'document':
      return 'bg-amber-100 text-amber-900 border-amber-200'
    case 'assignment':
      return 'bg-orange-100 text-orange-900 border-orange-200'
    default:
      return 'bg-slate-200 text-slate-800 border-slate-300'
  }
}

export default function ChapterList({
  chapters,
  onToggleComplete,
  onDelete,
  onUpdateChapter,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editType, setEditType] = useState('video')

  if (!Array.isArray(chapters)) {
    return null
  }

  function startEdit(c) {
    if (!c?.id) return
    setEditingId(c.id)
    setEditTitle((c.title || '').trim() ? c.title : '')
    setEditDuration(c.durationSeconds > 0 ? String(c.durationSeconds) : '')
    setEditType(
      ['video', 'document', 'assignment', 'unknown'].includes(c.contentType)
        ? c.contentType
        : 'unknown',
    )
  }

  function saveEdit(id) {
    if (typeof onUpdateChapter !== 'function') return
    const t = editTitle.trim()
    if (!t) return
    const nextType = editType
    let seconds = 0
    if (nextType === 'video') {
      const raw = editDuration.trim()
      if (raw && /^\d+$/.test(raw)) {
        seconds = Math.max(0, parseInt(raw, 10))
      } else if (raw) {
        const p = parseDurationToSeconds(raw)
        if (p.ok) seconds = p.seconds
      }
    }
    onUpdateChapter(id, {
      title: t,
      contentType: nextType,
      durationSeconds: nextType === 'video' ? seconds : 0,
    })
    setEditingId(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">챕터 목록</h3>
      </div>
      <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto md:max-h-96">
        {chapters.map((c) => {
          if (!c || !c.id) return null
          const ct = c.contentType || 'video'
          const label = CONTENT_TYPE_LABELS[ct] || CONTENT_TYPE_LABELS.unknown
          const showTime = isVideoChapter(c) && Number(c.durationSeconds) > 0
          const dur = Number(c.durationSeconds)
          const isEditing = editingId === c.id

          return (
            <li
              key={c.id}
              className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50/80 sm:flex-row sm:items-start"
            >
              <div className="flex flex-1 items-start gap-3">
                <label className="flex cursor-pointer items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    checked={Boolean(c.completed)}
                    onChange={() => onToggleComplete(c.id)}
                    className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass(ct)}`}
                    >
                      {label}
                    </span>
                    <p
                      className={`text-sm font-medium ${
                        c.completed
                          ? 'text-slate-400 line-through'
                          : 'text-slate-800'
                      }`}
                    >
                      {c.title || '챕터'}
                    </p>
                  </div>
                  {c.sectionTitle ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {c.sectionTitle}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {showTime ? (
                      <>
                        {formatSecondsHMS(dur)} · {dur}초
                      </>
                    ) : isVideoChapter(c) ? (
                      '시간 없음 (영상으로 표시됨)'
                    ) : (
                      <span className="text-amber-800/90">자료 · 시간 없음</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                {isEditing ? (
                  <div className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:w-56">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="챕터 이름"
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    >
                      <option value="video">영상</option>
                      <option value="document">자료</option>
                      <option value="assignment">과제</option>
                      <option value="unknown">확인 필요</option>
                    </select>
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="초 또는 12:30"
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                      disabled={editType !== 'video'}
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => saveEdit(c.id)}
                        className="flex-1 rounded bg-slate-800 py-1 text-xs text-white"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
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
