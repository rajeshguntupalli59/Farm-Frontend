'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getTasks, createTask, updateTask, deleteTask, getEmployees } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const PRIORITIES = ['HIGH', 'NORMAL', 'LOW']
const PRIORITY_STYLE = {
  HIGH:   { bg: '#fee2e2', color: '#dc2626' },
  NORMAL: { bg: '#dbeafe', color: '#1d4ed8' },
  LOW:    { bg: '#f3f4f6', color: '#6b7280' },
}
const ROLE_STYLE = {
  OWNER:    { bg: '#ede9fe', color: '#7c3aed' },
  MANAGER:  { bg: '#dbeafe', color: '#1d4ed8' },
  EMPLOYEE: { bg: '#dcfce7', color: '#166534' },
}
const COLUMNS = ['PENDING', 'IN_PROGRESS', 'DONE']
const COLUMN_ICONS = { PENDING: '🕐', IN_PROGRESS: '⚡', DONE: '✅' }
const COLUMN_COLORS = {
  PENDING:     { header: '#fef9c3', headerText: '#854d0e', border: '#fde68a' },
  IN_PROGRESS: { header: '#dbeafe', headerText: '#1d4ed8', border: '#93c5fd' },
  DONE:        { header: '#dcfce7', headerText: '#166534', border: '#86efac' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

export default function TasksPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER'

  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterAssignee, setFilterAssignee] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [movingId, setMovingId] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', assignedToId: '', dueDate: '', priority: 'NORMAL' })

  const fetchTasks = useCallback(async () => {
    try {
      const params = {}
      if (filterAssignee) params.assignedToId = filterAssignee
      const r = await getTasks(params)
      setTasks(r.data.tasks || r.data)
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }, [filterAssignee, router])

  const fetchEmployees = useCallback(async () => {
    try { const r = await getEmployees(); setEmployees(r.data.employees || r.data) } catch {}
  }, [])

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    fetchEmployees()
  }, [router, fetchEmployees])

  useEffect(() => {
    if (!getToken()) return
    fetchTasks()
  }, [fetchTasks])

  const openAdd = () => {
    setForm({ title: '', description: '', assignedToId: '', dueDate: '', priority: 'NORMAL' })
    setShowAdd(true)
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await createTask({
        ...form,
        assignedToId: form.assignedToId ? parseInt(form.assignedToId) : undefined,
      })
      setShowAdd(false)
      fetchTasks()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task')
    } finally { setSaving(false) }
  }

  const handleMove = async (task) => {
    const next = task.status === 'PENDING' ? 'IN_PROGRESS' : 'DONE'
    setMovingId(task.id)
    try { await updateTask(task.id, { status: next }); fetchTasks() }
    catch (err) { alert(err.response?.data?.message || 'Failed to update task') }
    finally { setMovingId(null) }
  }

  const handleDelete = async () => {
    try { await deleteTask(deleteId); setDeleteId(null); fetchTasks() }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete task') }
  }

  const columnTasks = (status) => tasks.filter(tk => tk.status === status)

  const COLUMN_LABELS = {
    PENDING: t.pending,
    IN_PROGRESS: t.inProgress,
    DONE: t.done,
  }
  const EMPTY_MSGS = {
    PENDING: '🕐 ' + t.noTasks,
    IN_PROGRESS: '⚡ ' + t.noTasks,
    DONE: '✅ ' + t.noTasks,
  }

  if (loading) return (
    <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>🐐</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            📋 {isManager ? t.tasks : t.myTasks} ({tasks.length})
          </h1>
          {isManager && (
            <button onClick={openAdd} className="btn-primary">+ {t.addTask}</button>
          )}
        </div>

        {/* Filter by assignee — managers only */}
        {isManager && employees.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--gray-600)', fontWeight: 600 }}>{t.assignTo}:</span>
            <button
              onClick={() => setFilterAssignee('')}
              style={{
                padding: '5px 14px', borderRadius: 20, border: '1px solid',
                borderColor: !filterAssignee ? '#166534' : 'var(--gray-200)',
                background: !filterAssignee ? '#166534' : '#fff',
                color: !filterAssignee ? '#fff' : 'var(--gray-600)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600
              }}
            >{t.all}</button>
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setFilterAssignee(emp.id === filterAssignee ? '' : emp.id)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1px solid',
                  borderColor: filterAssignee === emp.id ? '#166534' : 'var(--gray-200)',
                  background: filterAssignee === emp.id ? '#166534' : '#fff',
                  color: filterAssignee === emp.id ? '#fff' : 'var(--gray-600)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}
              >{emp.name}</button>
            ))}
          </div>
        )}

        {/* Kanban board */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}>
          {COLUMNS.map(col => {
            const colTasks = columnTasks(col)
            const cs = COLUMN_COLORS[col]
            return (
              <div key={col} style={{
                borderRadius: 14,
                border: `1px solid ${cs.border}`,
                background: '#fff',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}>
                {/* Column header */}
                <div style={{
                  background: cs.header,
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ fontSize: 16 }}>{COLUMN_ICONS[col]}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: cs.headerText, flex: 1 }}>
                    {COLUMN_LABELS[col]}
                  </span>
                  <span style={{
                    background: cs.headerText, color: '#fff',
                    borderRadius: 20, fontSize: 11, fontWeight: 800,
                    padding: '1px 8px', minWidth: 22, textAlign: 'center'
                  }}>{colTasks.length}</span>
                </div>

                {/* Task cards */}
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', minHeight: 80 }}>
                  {colTasks.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '2rem 1rem',
                      color: 'var(--gray-400)', fontSize: 13
                    }}>
                      {EMPTY_MSGS[col]}
                    </div>
                  ) : colTasks.map(tk => {
                    const ps = PRIORITY_STYLE[tk.priority] || PRIORITY_STYLE.NORMAL
                    const rs = ROLE_STYLE[tk.assignedTo?.role] || ROLE_STYLE.EMPLOYEE
                    const overdue = isOverdue(tk.dueDate) && tk.status !== 'DONE'
                    return (
                      <div key={tk.id} style={{
                        background: '#fff',
                        border: '1px solid var(--gray-200)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}>
                        {/* Title row + priority + delete */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, flex: 1, lineHeight: 1.3 }}>{tk.title}</span>
                          <span style={{
                            background: ps.bg, color: ps.color,
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap'
                          }}>
                            {tk.priority === 'HIGH' ? t.high : tk.priority === 'LOW' ? t.low : t.normal}
                          </span>
                          {isManager && (
                            <button
                              onClick={() => setDeleteId(tk.id)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--gray-400)', fontSize: 14, padding: '0 2px', lineHeight: 1
                              }}
                              title={t.delete}
                            >🗑️</button>
                          )}
                        </div>

                        {/* Description */}
                        {tk.description && (
                          <p style={{ fontSize: 12, color: 'var(--gray-600)', margin: '0 0 8px', lineHeight: 1.4 }}>
                            {tk.description}
                          </p>
                        )}

                        {/* Assignee */}
                        {tk.assignedTo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: rs.bg, color: rs.color,
                              fontSize: 11, fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {tk.assignedTo.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 600 }}>
                              {tk.assignedTo.name}
                            </span>
                            <span style={{
                              background: rs.bg, color: rs.color,
                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20
                            }}>
                              {tk.assignedTo.role}
                            </span>
                          </div>
                        )}

                        {/* Due date */}
                        {tk.dueDate && (
                          <div style={{
                            fontSize: 11, fontWeight: 600,
                            color: overdue ? '#dc2626' : 'var(--gray-400)',
                            marginBottom: 8,
                          }}>
                            📅 {formatDate(tk.dueDate)}{overdue ? ' ⚠️' : ''}
                          </div>
                        )}

                        {/* Move button */}
                        {tk.status !== 'DONE' && (
                          <button
                            onClick={() => handleMove(tk)}
                            disabled={movingId === tk.id}
                            style={{
                              width: '100%',
                              background: tk.status === 'PENDING' ? '#dbeafe' : '#dcfce7',
                              color: tk.status === 'PENDING' ? '#1d4ed8' : '#166534',
                              border: 'none', borderRadius: 7,
                              padding: '6px', cursor: 'pointer',
                              fontSize: 12, fontWeight: 700,
                              opacity: movingId === tk.id ? 0.6 : 1,
                            }}
                          >
                            {tk.status === 'PENDING' ? `▶ Start` : `✓ ${t.done}`}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>📋 {t.addTask}</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div>
              <label>{t.name} *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title..."
              />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.description} ({t.optional})</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Task details..."
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.assignTo} ({t.optional})</label>
              <select value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">-- {t.assignTo} --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label>{t.dueDate} ({t.optional})</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label>{t.priority}</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {PRIORITIES.map(p => {
                    const ps = PRIORITY_STYLE[p]
                    const label = p === 'HIGH' ? t.high : p === 'LOW' ? t.low : t.normal
                    return (
                      <button
                        key={p}
                        onClick={() => setForm(f => ({ ...f, priority: p }))}
                        style={{
                          flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid',
                          borderColor: form.priority === p ? ps.color : 'var(--gray-200)',
                          background: form.priority === p ? ps.bg : '#fff',
                          color: form.priority === p ? ps.color : 'var(--gray-600)',
                          cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        }}
                      >{label}</button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleCreate} disabled={saving || !form.title.trim()} className="btn-primary" style={{ flex: 1 }}>
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.deleteConfirm}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setDeleteId(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleDelete} style={{
                flex: 1, background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: 8, padding: '0.625rem',
                cursor: 'pointer', fontWeight: 700
              }}>{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
