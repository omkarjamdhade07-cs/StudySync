import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Trash2, Loader2, BookOpen,
  ArrowRight, Wand2, ChevronDown, ChevronUp, Check, PlusCircle, X,
} from 'lucide-react'
import PageWrapper from '@/components/layout/PageWrapper'
import { useAuth } from '@/hooks/useAuth'
import { getSubjects, upsertTopic, upsertSubject, deleteSubjectWithTopics } from '@/lib/supabase/queries'
import type { SubjectRow } from '@/lib/supabase/types'
import { addDays, format } from 'date-fns'

interface ParsedTopic {
  name: string
  difficulty: number
  confidence: number
  estimatedMinutes: number
}

interface SyllabusBlock {
  id: number
  subjectId: string
  rawText: string
  topics: ParsedTopic[]
  parsed: boolean
  saved: boolean
  saving: boolean
  expanded: boolean
  error: string | null
}

const SUBJECT_COLORS = ['#6C5CE7','#FF6B9D','#2DD4BF','#FFD43B','#FF7043','#00B4D8','#8B5CF6','#EC4899']

function parseSyllabusText(text: string): ParsedTopic[] {
  return text
    .split('\n')
    .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())   // strip bullets/numbering
    .filter(l => l.length > 2)
    .map(name => ({ name, difficulty: 3, confidence: 3, estimatedMinutes: 60 }))
}

let nextId = 1

export default function SyllabusPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [subjects,        setSubjects]        = useState<SubjectRow[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [blocks,          setBlocks]          = useState<SyllabusBlock[]>([])
  const [allSaved,        setAllSaved]        = useState(false)

  /* ── New subject form state ── */
  const [showAddSubject,  setShowAddSubject]  = useState(false)
  const [newSubjectName,  setNewSubjectName]  = useState('')
  const [newSubjectDate,  setNewSubjectDate]  = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0])
  const [addingSubject,   setAddingSubject]   = useState(false)
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null)

  /* Load subjects once */
  useEffect(() => {
    if (!user) return
    getSubjects(user.id).then(({ data }) => {
      if (data && data.length > 0) {
        setSubjects(data)
        // Create one default block per subject
        setBlocks(data.map(sub => ({
          id: nextId++,
          subjectId: sub.id,
          rawText: '',
          topics: [],
          parsed: false,
          saved: false,
          saving: false,
          expanded: true,
          error: null,
        })))
      }
      setLoadingSubjects(false)
    })
  }, [user])

  /* ── Block helpers ── */
  const updateBlock = (id: number, patch: Partial<SyllabusBlock>) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))

  const addBlock = () => {
    setBlocks(prev => [...prev, {
      id: nextId++,
      subjectId: subjects[0]?.id ?? '',
      rawText: '',
      topics: [],
      parsed: false,
      saved: false,
      saving: false,
      expanded: true,
      error: null,
    }])
  }

  const removeBlock = (id: number) =>
    setBlocks(prev => prev.filter(b => b.id !== id))

  const handleParse = (id: number) => {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    if (!block.rawText.trim()) { updateBlock(id, { error: 'Paste some syllabus text first.' }); return }
    const topics = parseSyllabusText(block.rawText)
    if (topics.length === 0) { updateBlock(id, { error: 'No topics found — make sure each topic is on its own line.' }); return }
    updateBlock(id, { topics, parsed: true, error: null })
  }

  const updateTopic = (blockId: number, topicIdx: number, field: keyof ParsedTopic, value: string | number) => {
    setBlocks(prev => prev.map(b => b.id === blockId
      ? { ...b, topics: b.topics.map((t, i) => i === topicIdx ? { ...t, [field]: value } : t) }
      : b
    ))
  }

  const removeTopic = (blockId: number, topicIdx: number) => {
    setBlocks(prev => prev.map(b => b.id === blockId
      ? { ...b, topics: b.topics.filter((_, i) => i !== topicIdx) }
      : b
    ))
  }

  const addBlankTopic = (blockId: number) => {
    setBlocks(prev => prev.map(b => b.id === blockId
      ? { ...b, topics: [...b.topics, { name: '', difficulty: 3, confidence: 3, estimatedMinutes: 60 }] }
      : b
    ))
  }

  const handleSaveBlock = async (id: number) => {
    if (!user) return
    const block = blocks.find(b => b.id === id)
    if (!block || !block.subjectId) return
    if (block.topics.some(t => !t.name.trim())) { updateBlock(id, { error: 'All topics need a name.' }); return }

    updateBlock(id, { saving: true, error: null })
    try {
      for (const topic of block.topics) {
        const { error: err } = await upsertTopic({
          user_id: user.id,
          subject_id: block.subjectId,
          name: topic.name,
          difficulty: topic.difficulty,
          confidence: topic.confidence,
          estimated_minutes: topic.estimatedMinutes,
          coverage: 0,
          missed_count: 0,
          last_studied_at: null,
          revision_stage: 0,
        })
        if (err) throw new Error(JSON.stringify(err))
      }
      updateBlock(id, { saved: true, saving: false, expanded: false })
    } catch (e) {
      updateBlock(id, { saving: false, error: `Failed to save: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  const handleSaveAll = async () => {
    const unsaved = blocks.filter(b => b.parsed && !b.saved)
    for (const b of unsaved) await handleSaveBlock(b.id)
    setAllSaved(true)
  }

  /* ── Add a brand new subject ── */
  const handleAddSubject = async () => {
    if (!user) return
    if (!newSubjectName.trim()) { setAddSubjectError('Subject name is required.'); return }
    if (!newSubjectDate) { setAddSubjectError('Exam date is required.'); return }
    if (new Date(newSubjectDate) <= new Date()) { setAddSubjectError('Exam date must be in the future.'); return }

    setAddingSubject(true)
    setAddSubjectError(null)
    const { data, error } = await upsertSubject({
      user_id: user.id,
      name: newSubjectName.trim(),
      color: newSubjectColor,
      exam_date: newSubjectDate,
    })
    if (error || !data) {
      setAddSubjectError(`Failed to add subject: ${error ? JSON.stringify(error) : 'unknown error'}`)
      setAddingSubject(false)
      return
    }
    // Add to local subjects list
    const updated = [...subjects, data]
    setSubjects(updated)
    // Auto-create a syllabus block for the new subject
    setBlocks(prev => [...prev, {
      id: nextId++,
      subjectId: data.id,
      rawText: '',
      topics: [],
      parsed: false,
      saved: false,
      saving: false,
      expanded: true,
      error: null,
    }])
    // Reset form
    setNewSubjectName('')
    setNewSubjectDate('')
    setNewSubjectColor(SUBJECT_COLORS[updated.length % SUBJECT_COLORS.length])
    setShowAddSubject(false)
    setAddingSubject(false)
  }

  const savedCount  = blocks.filter(b => b.saved).length
  const parsedCount = blocks.filter(b => b.parsed).length

  /* ── Remove a subject and all its topics/tasks ── */
  const [removingSubjectId,  setRemovingSubjectId]  = useState<string | null>(null)
  const [confirmRemoveId,    setConfirmRemoveId]    = useState<string | null>(null)
  const [removeSubjectError, setRemoveSubjectError] = useState<string | null>(null)

  const handleRemoveSubject = async (subjectId: string) => {
    setRemovingSubjectId(subjectId)
    setRemoveSubjectError(null)
    const { error } = await deleteSubjectWithTopics(subjectId)
    if (error) {
      setRemoveSubjectError(`Failed to remove: ${JSON.stringify(error)}`)
      setRemovingSubjectId(null)
      setConfirmRemoveId(null)
      return
    }
    setSubjects(prev => prev.filter(s => s.id !== subjectId))
    setBlocks(prev => prev.filter(b => b.subjectId !== subjectId))
    setRemovingSubjectId(null)
    setConfirmRemoveId(null)
  }

  /* ── All done state ── */
  if (allSaved && savedCount > 0) {
    return (
      <PageWrapper>
        <div className="max-w-lg mx-auto text-center py-16 space-y-5">
          <div className="w-16 h-16 mx-auto rounded-brutal border-2 border-ink flex items-center justify-center"
            style={{ background: 'var(--teal)', boxShadow: '4px 4px 0 var(--ink)' }}>
            <Check className="h-8 w-8 text-ink" aria-hidden="true" />
          </div>
          <h1 className="font-heading font-bold text-2xl">Syllabuses saved!</h1>
          <p className="text-sm" style={{ opacity: 0.6 }}>
            All topics have been added to your subjects.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => { setAllSaved(false); setBlocks(prev => prev.map(b => ({ ...b, saved: false, parsed: false, rawText: '', topics: [] }))) }}
              className="btn-brutal btn-secondary px-5">
              Import more
            </button>
            <button onClick={() => navigate('/today')} className="btn-brutal btn-primary px-5">
              Go to Today <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-brutal border-2 border-ink flex items-center justify-center shrink-0"
              style={{ background: 'var(--violet)', boxShadow: '3px 3px 0 var(--ink)' }}>
              <FileText className="h-5 w-5 text-paper" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl">Import Syllabus</h1>
              <p className="text-sm" style={{ opacity: 0.6 }}>Add topics for one or multiple subjects at once.</p>
            </div>
          </div>
          {/* Save all button */}
          {parsedCount > 1 && (
            <button onClick={handleSaveAll} className="btn-brutal btn-done text-sm px-4 shrink-0">
              <Check className="h-4 w-4" aria-hidden="true" />
              Save all
            </button>
          )}
        </div>

        {/* Loading */}
        {loadingSubjects && (
          <div className="flex items-center gap-2 text-sm" style={{ opacity: 0.6 }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
          </div>
        )}

        {/* No subjects */}
        {!loadingSubjects && subjects.length === 0 && (
          <div className="brutal-card p-8 text-center space-y-3">
            <p className="font-heading font-bold">No subjects yet</p>
            <p className="text-sm" style={{ opacity: 0.6 }}>Complete onboarding first to add subjects.</p>
            <button onClick={() => navigate('/onboarding')} className="btn-brutal btn-primary px-5">
              Go to onboarding
            </button>
          </div>
        )}

        {/* Syllabus blocks */}
        {blocks.map((block) => {
          const subjectData = subjects.find(s => s.id === block.subjectId)

          return (
            <div key={block.id} className="brutal-card overflow-hidden">

              {/* Block header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b-2 border-ink cursor-pointer"
                style={{ background: block.saved ? 'var(--teal)' : subjectData?.color ?? 'var(--violet)' }}
                onClick={() => updateBlock(block.id, { expanded: !block.expanded })}
              >
                <div className="flex items-center gap-2">
                  {block.saved
                    ? <Check className="h-4 w-4 text-ink" aria-hidden="true" />
                    : <FileText className="h-4 w-4 text-paper" aria-hidden="true" />
                  }
                  <span className="font-heading font-bold text-sm text-paper">
                    {block.saved ? '✓ Saved — ' : ''}{subjectData?.name ?? 'Select subject'}
                    {block.parsed && !block.saved ? ` (${block.topics.length} topics)` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {blocks.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); removeBlock(block.id) }}
                      className="text-paper/70 hover:text-paper text-xs underline"
                      aria-label="Remove this syllabus block"
                    >
                      Remove
                    </button>
                  )}
                  {/* Remove entire subject */}
                  {subjectData && (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmRemoveId(block.subjectId); setRemoveSubjectError(null) }}
                      className="text-paper/70 hover:text-paper text-xs underline"
                      aria-label={`Remove subject ${subjectData.name} and all its data`}
                    >
                      🗑 Remove subject
                    </button>
                  )}
                  {block.expanded
                    ? <ChevronUp className="h-4 w-4 text-paper" aria-hidden="true" />
                    : <ChevronDown className="h-4 w-4 text-paper" aria-hidden="true" />
                  }
                </div>
              </div>

              {block.expanded && (
                <div className="p-5 space-y-4">

                  {/* Error */}
                  {block.error && (
                    <div role="alert" className="text-xs px-3 py-2 rounded-brutal border-2 border-red"
                      style={{ background: 'var(--red)', color: '#fff', boxShadow: '2px 2px 0 var(--ink)' }}>
                      ⚠ {block.error}
                    </div>
                  )}

                  {/* Subject selector */}
                  {!block.saved && (
                    <div className="space-y-2">
                      <p className="text-xs font-heading font-semibold">Subject</p>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => updateBlock(block.id, { subjectId: sub.id })}
                            className="chip cursor-pointer transition-all text-xs"
                            style={{
                              background: block.subjectId === sub.id ? sub.color : 'var(--paper)',
                              borderColor: sub.color,
                              color: block.subjectId === sub.id ? '#fff' : sub.color,
                              boxShadow: block.subjectId === sub.id ? '2px 2px 0 var(--ink)' : 'none',
                            }}
                            aria-pressed={block.subjectId === sub.id}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Paste area — shown before parsing */}
                  {!block.parsed && !block.saved && (
                    <div className="space-y-3">
                      <p className="text-xs" style={{ opacity: 0.6 }}>
                        Paste the syllabus below. Each line becomes one topic.
                      </p>
                      <textarea
                        value={block.rawText}
                        onChange={e => updateBlock(block.id, { rawText: e.target.value })}
                        rows={8}
                        placeholder={`Unit 1: Mechanics\nUnit 2: Thermodynamics\nUnit 3: Optics\n...`}
                        className="input-brutal resize-y font-mono text-sm"
                        aria-label={`Syllabus text for ${subjectData?.name}`}
                      />
                      <button
                        onClick={() => handleParse(block.id)}
                        disabled={!block.subjectId || !block.rawText.trim()}
                        className="btn-brutal btn-primary w-full"
                      >
                        <Wand2 className="h-4 w-4" aria-hidden="true" />
                        Parse topics
                      </button>
                    </div>
                  )}

                  {/* Topic editor — shown after parsing */}
                  {block.parsed && !block.saved && (
                    <div className="space-y-3">
                      {/* Column headers */}
                      <div className="grid grid-cols-12 gap-2 text-xs font-heading font-semibold px-1" style={{ opacity: 0.5 }}>
                        <span className="col-span-5">Topic name</span>
                        <span className="col-span-2 text-center">Diff</span>
                        <span className="col-span-2 text-center">Conf</span>
                        <span className="col-span-2 text-center">Mins</span>
                        <span className="col-span-1" />
                      </div>

                      {block.topics.map((topic, ti) => (
                        <div key={ti} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <input
                              value={topic.name}
                              onChange={e => updateTopic(block.id, ti, 'name', e.target.value)}
                              className="input-brutal text-sm py-1.5"
                              placeholder="Topic name"
                            />
                          </div>
                          <div className="col-span-2">
                            <input type="number" min={1} max={5} value={topic.difficulty}
                              onChange={e => updateTopic(block.id, ti, 'difficulty', Number(e.target.value))}
                              className="input-brutal text-sm py-1.5 text-center font-mono" />
                          </div>
                          <div className="col-span-2">
                            <input type="number" min={1} max={5} value={topic.confidence}
                              onChange={e => updateTopic(block.id, ti, 'confidence', Number(e.target.value))}
                              className="input-brutal text-sm py-1.5 text-center font-mono" />
                          </div>
                          <div className="col-span-2">
                            <input type="number" min={15} max={600} value={topic.estimatedMinutes}
                              onChange={e => updateTopic(block.id, ti, 'estimatedMinutes', Number(e.target.value))}
                              className="input-brutal text-sm py-1.5 text-center font-mono" />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => removeTopic(block.id, ti)}
                              className="w-7 h-7 rounded-[6px] border-2 border-ink flex items-center justify-center hover:bg-red hover:text-white transition-colors"
                              aria-label={`Remove ${topic.name}`}
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add topic + re-paste row */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => addBlankTopic(block.id)}
                          className="btn-brutal btn-secondary text-xs px-3 min-h-[36px] flex-1"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add topic
                        </button>
                        <button
                          onClick={() => updateBlock(block.id, { parsed: false, topics: [] })}
                          className="btn-brutal btn-secondary text-xs px-3 min-h-[36px]"
                        >
                          ← Re-paste
                        </button>
                      </div>

                      {/* Save this block */}
                      <button
                        onClick={() => handleSaveBlock(block.id)}
                        disabled={block.saving || block.topics.length === 0}
                        className="btn-brutal btn-done w-full"
                      >
                        {block.saving
                          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          : <BookOpen className="h-4 w-4" aria-hidden="true" />
                        }
                        Save {block.topics.length} topic{block.topics.length !== 1 ? 's' : ''} to {subjectData?.name}
                      </button>
                    </div>
                  )}

                  {/* Saved state inside block */}
                  {block.saved && (
                    <div className="text-center py-4 space-y-2">
                      <p className="font-heading font-bold text-sm" style={{ color: 'var(--teal)' }}>
                        ✓ {block.topics.length} topics saved to {subjectData?.name}
                      </p>
                      <button
                        onClick={() => updateBlock(block.id, { saved: false, parsed: false, rawText: '', topics: [] })}
                        className="text-xs hover:underline" style={{ opacity: 0.6 }}
                      >
                        Re-import this subject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* ── Add Subject form ── */}
        {!loadingSubjects && (
          <>
            {showAddSubject ? (
              <div className="brutal-card overflow-hidden">
                <div className="title-strip flex items-center justify-between">
                  <span>Add New Subject</span>
                  <button onClick={() => { setShowAddSubject(false); setAddSubjectError(null) }}
                    aria-label="Close">
                    <X className="h-4 w-4 text-paper" aria-hidden="true" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {addSubjectError && (
                    <div role="alert" className="text-xs px-3 py-2 rounded-brutal border-2 border-red"
                      style={{ background: 'var(--red)', color: '#fff', boxShadow: '2px 2px 0 var(--ink)' }}>
                      ⚠ {addSubjectError}
                    </div>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[160px] space-y-1.5">
                      <label className="text-xs font-heading font-semibold">Subject name</label>
                      <input
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        placeholder="e.g. Physics"
                        className="input-brutal"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-heading font-semibold">Exam date</label>
                      <input
                        type="date"
                        value={newSubjectDate}
                        min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                        onChange={e => setNewSubjectDate(e.target.value)}
                        className="input-brutal"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-heading font-semibold mb-2">Colour</p>
                    <div className="flex gap-2 flex-wrap">
                      {SUBJECT_COLORS.map(c => (
                        <button key={c} type="button"
                          onClick={() => setNewSubjectColor(c)}
                          className="w-7 h-7 rounded-[6px] border-2 transition-transform"
                          style={{
                            backgroundColor: c,
                            borderColor: newSubjectColor === c ? 'var(--ink)' : 'transparent',
                            transform: newSubjectColor === c ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: newSubjectColor === c ? '2px 2px 0 var(--ink)' : 'none',
                          }}
                          aria-label={`Select colour ${c}`}
                          aria-pressed={newSubjectColor === c}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSubject}
                      disabled={addingSubject}
                      className="btn-brutal btn-primary flex-1"
                    >
                      {addingSubject
                        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        : <PlusCircle className="h-4 w-4" aria-hidden="true" />}
                      {addingSubject ? 'Adding…' : 'Add subject & import syllabus'}
                    </button>
                    <button onClick={() => { setShowAddSubject(false); setAddSubjectError(null) }}
                      className="btn-brutal btn-secondary px-4">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSubject(true)}
                className="btn-brutal w-full text-sm min-h-[48px]"
                style={{ background: 'var(--violet)', color: '#fff' }}
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Add new subject &amp; import its syllabus
              </button>
            )}
          </>
        )}

        {/* Add another syllabus block for existing subjects */}
        {!loadingSubjects && subjects.length > 0 && (
          <button
            onClick={addBlock}
            className="btn-brutal btn-secondary w-full text-sm min-h-[48px]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add another syllabus for existing subject
          </button>
        )}

        {/* Remove subject error */}
        {removeSubjectError && (
          <div role="alert" className="text-xs px-3 py-2 rounded-brutal border-2"
            style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--ink)', boxShadow: '2px 2px 0 var(--ink)' }}>
            ⚠ {removeSubjectError}
          </div>
        )}

        {/* Confirm remove subject modal */}
        {confirmRemoveId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(17,17,17,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget) setConfirmRemoveId(null) }}>
            <div className="brutal-panel w-full max-w-sm overflow-hidden animate-fade-rise"
              style={{ boxShadow: '8px 8px 0 var(--ink)' }}>
              <div className="title-strip flex items-center gap-2" style={{ background: 'var(--red)' }}>
                <Trash2 className="h-4 w-4 text-paper" aria-hidden="true" />
                <span className="font-heading font-bold text-sm text-paper">Remove Subject</span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm font-medium">
                  This will permanently delete <strong>{subjects.find(s => s.id === confirmRemoveId)?.name}</strong> and all its topics and scheduled tasks. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRemoveSubject(confirmRemoveId)}
                    disabled={removingSubjectId === confirmRemoveId}
                    className="btn-brutal btn-missed flex-1"
                  >
                    {removingSubjectId === confirmRemoveId
                      ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    Yes, remove it
                  </button>
                  <button onClick={() => setConfirmRemoveId(null)} className="btn-brutal btn-secondary px-4">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom save all */}
        {parsedCount >= 1 && (          <div className="brutal-card p-4 flex items-center justify-between gap-4">
            <p className="text-sm font-heading font-semibold">
              {savedCount} of {blocks.length} saved
              {parsedCount > savedCount ? ` · ${parsedCount - savedCount} ready to save` : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSaveAll}
                disabled={parsedCount === 0 || parsedCount === savedCount}
                className="btn-brutal btn-done text-sm px-5 min-h-[40px]"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Save all & continue
              </button>
              <button
                onClick={() => navigate('/today')}
                className="btn-brutal btn-primary text-sm px-5 min-h-[40px]"
              >
                Go to Today <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
