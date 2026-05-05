'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getEmployees, getAttendance, getAttendanceSummary, markAttendance } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE']
const STATUS_STYLE = {
  PRESENT:  { bg: '#dcfce7', color: '#166534', dot: '#22c55e', label: 'present' },
  ABSENT:   { bg: '#fee2e2', color: '#dc2626', dot: '#ef4444', label: 'absent' },
  HALF_DAY: { bg: '#ffedd5', color: '#c2410c', dot: '#f97316', label: 'halfDay' },
  LEAVE:    { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6', label: 'leave' },
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function buildDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function AttendancePage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER'

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const [employees, setEmployees] = useState([])
  const [summary, setSummary] = useState([]) // [{employeeId, present, absent, halfDay, leave, total}]
  const [records, setRecords] = useState({}) // { "empId_YYYY-MM-DD": status }

  const [loading, setLoading] = useState(true)
  const [markModal, setMarkModal] = useState(null) // { employeeId, employeeName, date }
  const [markForm, setMarkForm] = useState({ status: 'PRESENT', note: '' })
  const [saving, setSaving] = useState(false)

  const daysInMonth = getDaysInMonth(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = { year, month: month + 1 }
      const [empRes, attRes, sumRes] = await Promise.all([
        getEmployees(),
        getAttendance(params),
        getAttendanceSummary(params),
      ])
      const emps = empRes.data.employees || empRes.data || []
      setEmployees(emps.filter(e => e.role !== 'OWNER'))

      // Build lookup map from records array
      const att = attRes.data.records || attRes.data || []
      const map = {}
      att.forEach(r => {
        const dateStr = r.date ? r.date.slice(0, 10) : ''
        if (dateStr) map[`${r.userId}_${dateStr}`] = r.status
      })
      setRecords(map)

      setSummary(sumRes.data.summary || sumRes.data || [])
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }, [year, month, router])

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (!isManager) { router.push('/dashboard'); return }
    fetchAll()
  }, [router, isManager, fetchAll])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const openMarkModal = (emp, dateStr) => {
    const existing = records[`${emp.id}_${dateStr}`]
    setMarkForm({ status: existing || 'PRESENT', note: '' })
    setMarkModal({ employeeId: emp.id, employeeName: emp.name, date: dateStr })
  }

  const openMarkToday = (emp) => {
    openMarkModal(emp, todayString())
  }

  const handleMark = async () => {
    if (!markModal) return
    setSaving(true)
    try {
      await markAttendance({
        userId: markModal.employeeId,
        date: markModal.date,
        status: markForm.status,
        notes: markForm.note || undefined,
      })
      setMarkModal(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance')
    } finally { setSaving(false) }
  }

  const getSummaryFor = (empId) => {
    return summary.find(s => s.id === empId) || { present: 0, absent: 0, halfDay: 0, leave: 0, total: 0 }
  }

  if (loading) return (
    <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>🐐</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1300, margin: '0 auto' }}>

        {/* Header + month navigator */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            📅 {t.attendance}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={prevMonth}
              style={{
                background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8,
                width: 34, height: 34, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >←</button>
            <span style={{
              fontWeight: 700, fontSize: 15, color: 'var(--green-900)',
              minWidth: 160, textAlign: 'center',
              background: '#fff', borderRadius: 8, padding: '6px 14px',
              border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)'
            }}>
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              style={{
                background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8,
                width: 34, height: 34, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >→</button>
          </div>
        </div>

        {/* Summary table */}
        {employees.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--gray-200)', background: '#f0fdf4' }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--green-900)' }}>Monthly Summary — {monthLabel}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 700, color: 'var(--gray-600)', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap' }}>Employee</th>
                    {[
                      { key: 'present', s: STATUS_STYLE.PRESENT },
                      { key: 'absent', s: STATUS_STYLE.ABSENT },
                      { key: 'halfDay', s: STATUS_STYLE.HALF_DAY },
                      { key: 'leave', s: STATUS_STYLE.LEAVE },
                    ].map(({ key, s }) => (
                      <th key={key} style={{ padding: '10px 16px', fontWeight: 700, color: s.color, borderBottom: '1px solid var(--gray-200)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                          {t[key]}
                        </span>
                      </th>
                    ))}
                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--gray-600)', borderBottom: '1px solid var(--gray-200)', textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => {
                    const s = getSummaryFor(emp.id)
                    return (
                      <tr key={emp.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--gray-900)', borderBottom: '1px solid var(--gray-100)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: '#dcfce7', color: '#166534',
                              fontSize: 12, fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>{emp.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{emp.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{s.present || 0}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)' }}>
                          <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{s.absent || 0}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)' }}>
                          <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{s.halfDay || 0}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid var(--gray-100)' }}>
                          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{s.leave || 0}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-100)' }}>
                          {s.total || 0}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily attendance grid */}
        {employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)', background: '#fff', borderRadius: 14 }}>
            <div style={{ fontSize: 48 }}>👷</div>
            <p style={{ marginTop: 8 }}>No employees found</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--gray-200)', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--green-900)', flex: 1 }}>Daily Grid — {monthLabel}</span>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_STYLE).map(([key, s]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-600)', fontWeight: 600 }}>{t[s.label]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{
                      textAlign: 'left', padding: '10px 14px',
                      fontWeight: 700, color: 'var(--gray-600)',
                      borderBottom: '1px solid var(--gray-200)',
                      borderRight: '1px solid var(--gray-200)',
                      whiteSpace: 'nowrap', minWidth: 160, position: 'sticky', left: 0,
                      background: 'var(--gray-50)', zIndex: 1,
                    }}>Employee</th>
                    <th style={{
                      padding: '10px 8px', fontWeight: 700, color: 'var(--gray-600)',
                      borderBottom: '1px solid var(--gray-200)',
                      borderRight: '1px solid var(--gray-200)',
                      whiteSpace: 'nowrap', textAlign: 'center', fontSize: 11
                    }}>Today</th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1
                      const dateStr = buildDateKey(year, month, d)
                      const isToday = dateStr === todayString()
                      const dayOfWeek = new Date(year, month, d).getDay()
                      const isSun = dayOfWeek === 0
                      return (
                        <th key={d} style={{
                          padding: '8px 6px', fontWeight: isToday ? 800 : 600,
                          color: isToday ? '#166534' : isSun ? '#dc2626' : 'var(--gray-600)',
                          borderBottom: '1px solid var(--gray-200)',
                          borderRight: '1px solid var(--gray-100)',
                          textAlign: 'center', minWidth: 34,
                          background: isToday ? '#f0fdf4' : isSun ? '#fff5f5' : 'var(--gray-50)',
                        }}>
                          <div>{d}</div>
                          <div style={{ fontSize: 9, fontWeight: 500 }}>
                            {new Date(year, month, d).toLocaleString('en', { weekday: 'narrow' })}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, ei) => (
                    <tr key={emp.id} style={{ background: ei % 2 === 0 ? '#fff' : '#fafafa' }}>
                      {/* Sticky name cell */}
                      <td style={{
                        padding: '8px 14px',
                        borderBottom: '1px solid var(--gray-100)',
                        borderRight: '1px solid var(--gray-200)',
                        whiteSpace: 'nowrap',
                        position: 'sticky', left: 0,
                        background: ei % 2 === 0 ? '#fff' : '#fafafa',
                        zIndex: 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: '#dcfce7', color: '#166534',
                            fontSize: 11, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>{emp.name.charAt(0).toUpperCase()}</div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-900)' }}>{emp.name}</span>
                        </div>
                      </td>

                      {/* Mark Today quick button */}
                      <td style={{
                        padding: '8px',
                        borderBottom: '1px solid var(--gray-100)',
                        borderRight: '1px solid var(--gray-200)',
                        textAlign: 'center',
                      }}>
                        <button
                          onClick={() => openMarkToday(emp)}
                          style={{
                            background: '#166534', color: '#fff',
                            border: 'none', borderRadius: 6,
                            padding: '4px 10px', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                          }}
                        >+ {t.markAttendance}</button>
                      </td>

                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1
                        const dateStr = buildDateKey(year, month, d)
                        const status = records[`${emp.id}_${dateStr}`]
                        const ss = status ? STATUS_STYLE[status] : null
                        const isToday = dateStr === todayString()
                        const dayOfWeek = new Date(year, month, d).getDay()
                        const isSun = dayOfWeek === 0
                        return (
                          <td
                            key={d}
                            onClick={() => openMarkModal(emp, dateStr)}
                            title={status ? `${emp.name} — ${dateStr}: ${status}` : `Click to mark ${emp.name} on ${dateStr}`}
                            style={{
                              padding: '6px 4px',
                              textAlign: 'center',
                              borderBottom: '1px solid var(--gray-100)',
                              borderRight: '1px solid var(--gray-100)',
                              cursor: 'pointer',
                              background: isToday
                                ? (ss ? ss.bg : '#f0fdf4')
                                : isSun
                                  ? (ss ? ss.bg : '#fff5f5')
                                  : ss ? ss.bg : 'transparent',
                              transition: 'background 0.1s',
                            }}
                          >
                            {ss ? (
                              <span style={{
                                display: 'inline-block',
                                width: 12, height: 12,
                                borderRadius: '50%',
                                background: ss.dot,
                              }} />
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                width: 10, height: 10,
                                borderRadius: '50%',
                                background: 'var(--gray-200)',
                                opacity: 0.4,
                              }} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Mark Attendance Modal */}
      {markModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMarkModal(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--green-900)' }}>
                📅 {t.markAttendance}
              </h2>
              <button onClick={() => setMarkModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--green-50)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green-900)' }}>{markModal.employeeName}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 2 }}>{markModal.date}</div>
            </div>

            <div style={{ marginBottom: '0.875rem' }}>
              <label style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-700)', marginBottom: 6, display: 'block' }}>{t.status}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {STATUSES.map(s => {
                  const ss = STATUS_STYLE[s]
                  return (
                    <button
                      key={s}
                      onClick={() => setMarkForm(f => ({ ...f, status: s }))}
                      style={{
                        padding: '10px 8px', borderRadius: 9, border: '2px solid',
                        borderColor: markForm.status === s ? ss.color : 'var(--gray-200)',
                        background: markForm.status === s ? ss.bg : '#fff',
                        color: markForm.status === s ? ss.color : 'var(--gray-600)',
                        cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all 0.1s',
                      }}
                    >
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: markForm.status === s ? ss.dot : 'var(--gray-300)',
                        display: 'inline-block', flexShrink: 0
                      }} />
                      {t[ss.label]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-700)', marginBottom: 4, display: 'block' }}>
                {t.note} ({t.optional})
              </label>
              <input
                value={markForm.note}
                onChange={e => setMarkForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Optional note..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setMarkModal(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleMark} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
