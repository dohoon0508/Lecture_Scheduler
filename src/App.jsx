import { useEffect, useMemo, useState } from 'react'
import SubjectList from './components/SubjectList.jsx'
import SubjectForm from './components/SubjectForm.jsx'
import SubjectDashboard from './components/SubjectDashboard.jsx'
import ChapterForm from './components/ChapterForm.jsx'
import ChapterList from './components/ChapterList.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import InflearnImportCard from './components/InflearnImportCard.jsx'
import {
  loadSubjects,
  saveSubjects,
  createEmptySubject,
  generateId,
} from './utils/storage.js'

function App() {
  const [subjects, setSubjects] = useState(() => {
    try {
      return loadSubjects()
    } catch {
      return []
    }
  })
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    try {
      saveSubjects(subjects)
    } catch {
      /* ignore */
    }
  }, [subjects])

  const selected = useMemo(
    () => subjects.find((s) => s && s.id === selectedId) ?? null,
    [subjects, selectedId],
  )

  function handleAddSubject(title) {
    const sub = createEmptySubject(title)
    setSubjects((prev) => [...prev, sub])
    setSelectedId(sub.id)
  }

  function handleDeleteSubject(id) {
    setSubjects((prev) => {
      const next = prev.filter((s) => s && s.id !== id)
      setSelectedId((sel) => (sel === id ? next[0]?.id ?? null : sel))
      return next
    })
  }

  function handleRenameSubject(id, title) {
    const t = (title || '').trim()
    if (!t) return
    updateSubjectById(id, (s) => ({ ...s, title: t }))
  }

  function updateSubjectById(id, fn) {
    setSubjects((prev) =>
      prev.map((s) => {
        if (!s || s.id !== id) return s
        return fn(s)
      }),
    )
  }

  function handleAddChapter(payload) {
    if (!selected) return
    const ch = {
      id: generateId('chapter'),
      title: payload.title,
      durationSeconds: payload.durationSeconds,
      completed: false,
      contentType: 'video',
      sectionTitle: '',
      source: '',
      sourceUrl: '',
    }
    updateSubjectById(selected.id, (s) => ({
      ...s,
      chapters: [...(Array.isArray(s.chapters) ? s.chapters : []), ch],
    }))
  }

  function handleMergeInflearnChapters(newChapters) {
    if (!selected || !Array.isArray(newChapters)) return
    updateSubjectById(selected.id, (s) => ({
      ...s,
      chapters: [...(Array.isArray(s.chapters) ? s.chapters : []), ...newChapters],
    }))
  }

  function handleUpdateChapter(chapterId, partial) {
    if (!selected || !partial || typeof partial !== 'object') return
    updateSubjectById(selected.id, (s) => ({
      ...s,
      chapters: (Array.isArray(s.chapters) ? s.chapters : []).map((c) => {
        if (!c || c.id !== chapterId) return c
        const next = { ...c, ...partial }
        if (next.contentType !== 'video') {
          next.durationSeconds = 0
        }
        return next
      }),
    }))
  }

  function handleToggleChapter(chapterId) {
    if (!selected) return
    updateSubjectById(selected.id, (s) => ({
      ...s,
      chapters: (Array.isArray(s.chapters) ? s.chapters : []).map((c) =>
        c && c.id === chapterId ? { ...c, completed: !c.completed } : c,
      ),
    }))
  }

  function handleDeleteChapter(chapterId) {
    if (!selected) return
    updateSubjectById(selected.id, (s) => ({
      ...s,
      chapters: (Array.isArray(s.chapters) ? s.chapters : []).filter(
        (c) => c && c.id !== chapterId,
      ),
    }))
  }

  return (
    <div className="min-h-svh bg-slate-100/90">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            과목별 강의 완강 스케줄러
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            과목·챕터 진행을 정리하고 완강까지 관리하세요.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <aside className="w-full shrink-0 md:sticky md:top-4 md:w-72">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <SubjectForm onAdd={handleAddSubject} />
              <div className="mt-4 border-t border-slate-100 pt-4">
                <SubjectList
                  subjects={subjects}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onDelete={handleDeleteSubject}
                  onRename={handleRenameSubject}
                />
              </div>
            </div>
          </aside>

          <section className="min-w-0 flex-1 space-y-6">
            {!selected ? (
              <SubjectDashboard subjects={subjects} />
            ) : (
              <>
                <SummaryCards subject={selected} />

                <InflearnImportCard
                  subject={selected}
                  onMergeChapters={handleMergeInflearnChapters}
                />
                <ChapterForm onAddChapter={handleAddChapter} />
                <ChapterList
                  chapters={selected.chapters}
                  onToggleComplete={handleToggleChapter}
                  onDelete={handleDeleteChapter}
                  onUpdateChapter={handleUpdateChapter}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
