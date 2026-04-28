import { useState } from 'react'
import { apiUrl } from '../utils/apiUrl.js'
import { generateId } from '../utils/storage.js'
import { formatSecondsHuman } from '../utils/time.js'

function normKey(title, sectionTitle) {
  const t = (title || '').replace(/\s+/g, ' ').trim()
  const s = (sectionTitle || '').replace(/\s+/g, ' ').trim()
  return `${t}|||${s}`
}

function flatToChapters(flatItems, sourceUrl) {
  if (!Array.isArray(flatItems)) return []
  return flatItems.map((it) => ({
    id: generateId('chapter'),
    title: typeof it.title === 'string' ? it.title : '',
    durationSeconds: Number(it.durationSeconds) || 0,
    completed: false,
    contentType:
      ['video', 'document', 'assignment', 'unknown'].includes(it.contentType)
        ? it.contentType
        : 'unknown',
    sectionTitle:
      typeof it.sectionTitle === 'string' ? it.sectionTitle : '',
    source: 'inflearn',
    sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : '',
  }))
}

export default function InflearnImportCard({ subject, onMergeChapters }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 4500)
  }

  async function handleFetch() {
    setError('')
    setResult(null)
    const u = url.trim()
    if (!u) {
      setError('인프런 대시보드 URL을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/import/inflearn'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        const serverMsg =
          typeof data.message === 'string' && data.message.trim()
            ? data.message.trim()
            : ''
        const msg = serverMsg
          ? `${serverMsg}${data.code ? ` (${data.code})` : ''}`
          : res.status === 429
            ? '요청이 너무 잦습니다. 서버 안내를 확인하거나 잠시 후 다시 시도해주세요.'
            : '가져오기에 실패했습니다.'
        setError(msg)
        return
      }
      setResult(data)
    } catch (e) {
      const hint =
        import.meta.env.VITE_API_BASE_URL?.trim()
          ? '백엔드(VITE_API_BASE_URL)에 연결되지 않았습니다.'
          : '로컬은 npm run dev(프록시)로 서버를 켜 주세요. Vercel 등 배포 시 .env에 VITE_API_BASE_URL을 백엔드 주소로 넣어 주세요.'
      setError(e?.message || hint)
    } finally {
      setLoading(false)
    }
  }

  function handleAddToSubject() {
    if (!subject || typeof onMergeChapters !== 'function' || !result?.flatItems) {
      return
    }
    const flat = result.flatItems
    const sourceUrl = url.trim()
    const newOnes = flatToChapters(flat, sourceUrl)
    const existing = Array.isArray(subject.chapters) ? subject.chapters : []
    const keys = new Set(
      existing.map((c) => normKey(c.title, c.sectionTitle || '')),
    )
    let skipped = 0
    const merged = []
    for (const ch of newOnes) {
      const k = normKey(ch.title, ch.sectionTitle)
      if (keys.has(k)) {
        skipped += 1
        continue
      }
      keys.add(k)
      merged.push(ch)
    }
    onMergeChapters(merged)
    showToast(
      `추가 ${merged.length}개 · 건너뜀 ${skipped}개 (동일 제목·섹션)`,
    )
    setResult(null)
    setUrl('')
  }

  const sum = result?.summary

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-indigo-950">
        인프런 강의 목차 가져오기
      </h3>
      <p className="mt-1 text-xs text-indigo-900/70">
        본인이 수강 중인 강의라면{' '}
        <strong>대시보드</strong> URL을 쓰는 것이 가장 확실합니다. 강의 소개
        페이지 주소(`/course/...#curriculum`)를 넣으면 자동으로 대시보드 주소로
        바꿉니다. 첫 실행 시 브라우저에서 로그인하면 세션이 저장됩니다.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.inflearn.com/course/... 또는 .../dashboard?cid=..."
          className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          type="button"
          disabled={loading}
          onClick={handleFetch}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '가져오는 중…' : '인프런 목차 가져오기'}
        </button>
      </div>
      {!subject ? (
        <p className="mt-2 text-xs text-indigo-900/70">
          목차만 먼저 보려면 URL 입력 후 가져오기만 누르면 됩니다.{' '}
          <strong>과목에 넣으려면</strong> 왼쪽에서 과목을 선택하세요.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {toast ? (
        <p className="mt-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </p>
      ) : null}

      {result && sum ? (
        <div className="mt-4 rounded-lg border border-indigo-100 bg-white p-4 text-sm">
          <p className="font-medium text-slate-800">
            {result.courseTitle || '강의'}
          </p>
          <ul className="mt-2 space-y-1 text-slate-700">
            <li>영상 {sum.videoCount ?? 0}개</li>
            <li>
              문서·과제{' '}
              {(Number(sum.documentCount) || 0) +
                (Number(sum.assignmentCount) || 0)}
              개
              {sum.unknownCount > 0
                ? ` · 확인 필요 ${sum.unknownCount}개`
                : ''}
            </li>
            <li>
              총 영상 시간{' '}
              {formatSecondsHuman(Number(sum.totalVideoSeconds) || 0)}
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            시간이 없는 항목은 <strong>공부량(시간) 계산에서 제외</strong>되고,
            완료 체크에는 포함됩니다.
          </p>
          <button
            type="button"
            disabled={!subject}
            onClick={handleAddToSubject}
            title={!subject ? '과목을 선택한 뒤 추가할 수 있습니다.' : undefined}
            className="mt-3 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
          >
            현재 과목에 추가
          </button>
          <details className="mt-3 rounded border border-slate-100 bg-slate-50/80 p-2 text-xs">
            <summary className="cursor-pointer text-slate-600">
              미리보기 (최대 15줄)
            </summary>
            <ul className="mt-2 max-h-40 overflow-y-auto font-mono text-[11px] text-slate-700">
              {(result.flatItems || []).slice(0, 15).map((it, i) => (
                <li key={`${i}-${it.title?.slice(0, 12)}`}>
                  [{it.contentType}] {it.title}
                  {it.durationText ? ` ${it.durationText}` : ''}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  )
}
