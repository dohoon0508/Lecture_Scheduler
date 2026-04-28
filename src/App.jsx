import { useEffect, useMemo, useState } from 'react'
import SubjectList from './components/SubjectList.jsx'
import SubjectForm from './components/SubjectForm.jsx'
import SubjectDashboard from './components/SubjectDashboard.jsx'
import ChapterForm from './components/ChapterForm.jsx'
import ChapterList from './components/ChapterList.jsx'
import BulkPasteParser from './components/BulkPasteParser.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import ScheduleCard from './components/ScheduleCard.jsx'
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

  function handleAppendChapters(list) {
    if (!selected || !Array.isArray(list)) return
    updateSubjectById(selected.id, (s) => ({
      ...s,
      chapters: [...(Array.isArray(s.chapters) ? s.chapters : []), ...list],
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

  function handleScheduleChange(schedule) {
    if (!selected) return
    updateSubjectById(selected.id, (s) => {
      const prevSched = s.schedule && typeof s.schedule === 'object' ? s.schedule : {}
      const merged = { ...prevSched, ...schedule }
      let dm = merged.dailyMinutes
      if (dm === '' || dm == null) {
        dm = prevSched.dailyMinutes ?? 60
      }
      const num = Number(dm)
      const normalizedDaily =
        Number.isFinite(num) && num > 0 ? Math.min(1440, Math.floor(num)) : 60

      let sp = Number(merged.speed ?? prevSched.speed)
      if (!Number.isFinite(sp) || sp <= 0) {
        sp = 1.5
      }

      const studyDays = Array.isArray(merged.studyDays)
        ? merged.studyDays
        : Array.isArray(prevSched.studyDays)
          ? prevSched.studyDays
          : [1, 2, 3, 4, 5]

      return {
        ...s,
        schedule: {
          targetDate:
            typeof merged.targetDate === 'string'
              ? merged.targetDate
              : (typeof prevSched.targetDate === 'string'
                  ? prevSched.targetDate
                  : ''),
          dailyMinutes: normalizedDaily,
          speed: sp,
          studyDays,
        },
      }
    })
  }

  return (
    <div className="min-h-svh bg-slate-100/90">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            과목별 강의 완강 스케줄러
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            과목·챕터·목표일을 정리하고 하루 학습량을 점검하세요.
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
                />
              </div>
            </div>
          </aside>

          <section className="min-w-0 flex-1 space-y-6">
            {!selected ? (
              <SubjectDashboard subjects={subjects} />
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <label className="text-xs font-medium text-slate-500">
                        과목명
                      </label>
                      <input
                        key={selected.id}
                        type="text"
                        defaultValue={selected.title ?? ''}
                        onBlur={(e) => {
                          const t = e.target.value.trim()
                          if (!t) {
                            e.target.value = selected.title ?? ''
                            return
                          }
                          if (t !== selected.title) {
                            updateSubjectById(selected.id, (s) => ({
                              ...s,
                              title: t,
                            }))
                          }
                        }}
                        maxLength={200}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(selected.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    >
                      이 과목 삭제
                    </button>
                  </div>
                </div>

                <SummaryCards subject={selected} />

                <ScheduleCard
                  subject={selected}
                  onScheduleChange={handleScheduleChange}
                />

                <InflearnImportCard
                  subject={selected}
                  onMergeChapters={handleMergeInflearnChapters}
                />
                <ChapterForm onAddChapter={handleAddChapter} />
                <BulkPasteParser onAppendChapters={handleAppendChapters} />
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
