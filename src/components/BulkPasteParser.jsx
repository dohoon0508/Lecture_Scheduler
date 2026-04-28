import { useState } from 'react'
import { parseBulkPaste } from '../utils/parser.js'
import { generateId } from '../utils/storage.js'

export default function BulkPasteParser({ onAppendChapters }) {
  const [text, setText] = useState('')
  const [failedLines, setFailedLines] = useState([])

  function handleParse() {
    const { chapters, failedLines: fl } = parseBulkPaste(text)
    setFailedLines(Array.isArray(fl) ? fl : [])
    if (!chapters.length) return
    const withIds = chapters.map((ch) => ({
      id: generateId('chapter'),
      title: ch.title,
      durationSeconds: ch.durationSeconds,
      completed: false,
    }))
    onAppendChapters(withIds)
    setText('')
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-amber-900/90">
        목차 붙여넣기
      </h3>
      <p className="mb-2 text-xs text-amber-900/70">
        각 줄 끝에 시간이 있으면 자동으로 챕터로 추가됩니다.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={`1강 오리엔테이션 12:30\n2강 변수와 자료형 25:10`}
        className="mb-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <button
        type="button"
        onClick={handleParse}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        파싱 후 챕터로 추가
      </button>
      {failedLines.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="mb-2 text-xs font-semibold text-rose-800">
            파싱 실패 목록 ({failedLines.length}줄)
          </p>
          <ul className="max-h-32 overflow-y-auto text-xs text-rose-900">
            {failedLines.map((line, i) => (
              <li key={`${i}-${line.slice(0, 20)}`} className="border-b border-rose-100 py-1 last:border-0">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
