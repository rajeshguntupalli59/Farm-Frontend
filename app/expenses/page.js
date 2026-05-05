'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const CATEGORIES = [
  { key: 'FEED',      emoji: '🌾', labelKey: 'feed' },
  { key: 'MEDICINE',  emoji: '💊', labelKey: 'medicine' },
  { key: 'LABOUR',    emoji: '👷', labelKey: 'labour' },
  { key: 'TRANSPORT', emoji: '🚛', labelKey: 'transport' },
  { key: 'EQUIPMENT', emoji: '🔧', labelKey: 'equipment' },
  { key: 'OTHER',     emoji: '📋', labelKey: 'other' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

const DATE_RANGES = ['week', 'month', 'year']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

const S = {
  page:       { paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' },
  content:    { padding: '1.5rem', maxWidth: 900, margin: '0 auto' },
  heading:    { fontSize: 22, fontWeight: 800, color: 'var(--green-900)', margin: 0 },
  subText:    { fontSize: 13, color: 'var(--gray-400)', marginTop: 2 },
  section:    { background: '#fff', borderRadius: 14, padding: '1.25rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)', marginBottom: '1.25rem' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--green-900)', marginBottom: '0.875rem' },
  pillRow:    { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  pill:       (active) => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? '#166534' : '#f3f4f6',
    color:      active ? '#fff'    : '#374151',
    transition: 'all 0.15s',
  }),
  totalCard:  {
    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    borderRadius: 14, padding: '1.25rem 1.5rem',
    color: '#fff', marginBottom: '1.25rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 13, opacity: 0.85, marginBottom: 4 },
  totalAmt:   { fontSize: 30, fontWeight: 800 },
  expRow:     {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)',
    gap: '0.75rem',
  },
  catBadge:   (cat) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
    background: CAT_COLORS[cat]?.bg || '#f3f4f6',
    color:      CAT_COLORS[cat]?.fg || '#374151',
  }),
  amount:     { fontSize: 16, fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap' },
  metaText:   { fontSize: 12, color: 'var(--gray-400)', marginTop: 2 },
  iconBtn:    (color) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 15, color: color, padding: '4px 6px', borderRadius: 6,
  }),
  // Modal
  label:      { fontSize: 13, fontWeight: 600, color: 'var(--green-900)', marginBottom: 4, display: 'block' },
  input:      {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--gray-200)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  },
  chipRow:    { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  chip:       (active) => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: '2px solid',
    borderColor: active ? '#166534' : '#e5e7eb',
    background:  active ? '#f0fdf4' : '#fff',
    color:       active ? '#166534' : '#6b7280',
    transition: 'all 0.15s',
  }),
}

const CAT_COLORS = {
  FEED:      { bg: '#fef9c3', fg: '#854d0e' },
  MEDICINE:  { bg: '#dbeafe', fg: '#1d4ed8' },
  LABOUR:    { bg: '#dcfce7', fg: '#166534' },
  TRANSPORT: { bg: '#f3e8ff', fg: '#7c3aed' },
  EQUIPMENT: { bg: '#ffedd5', fg: '#c2410c' },
  OTHER:     { bg: '#f3f4f6', fg: '#374151' },
}

const EMPTY_FORM = { category: 'FEED', description: '', amount: '', paidTo: '', date: todayStr() }

export default function ExpensesPage() {
  const router  = useRouter()
  const { t }   = useLang()
  const user    = getUser()

  const [expenses,   setExpenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [catFilter,  setCatFilter]  = useState('ALL')
  const [dateRange,  setDateRange]  = useState('month')
  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)   // expense being edited
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(null)   // id being deleted

  const isOwner   = user?.role === 'OWNER'
  const isManager = ['OWNER', 'MANAGER'].includes(user?.role)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (!isManager) { router.push('/dashboard'); return }
    fetchExpenses()
  }, [router, dateRange])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res = await getExpenses({ period: dateRange })
      setExpenses(res.data.expenses || res.data || [])
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (exp) => {
    setEditTarget(exp)
    setForm({
      category:    exp.category,
      description: exp.description || '',
      amount:      exp.amount,
      paidTo:      exp.paidTo || '',
      date:        exp.date ? exp.date.split('T')[0] : todayStr(),
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      if (editTarget) {
        await updateExpense(editTarget.id, payload)
      } else {
        await addExpense(payload)
      }
      setShowModal(false)
      fetchExpenses()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return
    setDeleting(id)
    try {
      await deleteExpense(id)
      fetchExpenses()
    } catch {
      alert('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = useMemo(() => {
    if (catFilter === 'ALL') return expenses
    return expenses.filter(e => e.category === catFilter)
  }, [expenses, catFilter])

  const total = useMemo(
    () => filtered.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
    [filtered]
  )

  const fmtDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  const dateRangeLabel = { week: t.thisWeek, month: t.thisMonth, year: t.thisYear }

  if (loading) return (
    <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>🐐</span>
    </div>
  )

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.content}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={S.heading}>💸 {t.expenses}</h1>
            <p style={S.subText}>{dateRangeLabel[dateRange]}</p>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            + {t.addExpense}
          </button>
        </div>

        {/* Date range tabs */}
        <div style={{ ...S.section, padding: '0.875rem 1.25rem' }}>
          <div style={S.pillRow}>
            {DATE_RANGES.map(r => (
              <button key={r} style={S.pill(dateRange === r)} onClick={() => setDateRange(r)}>
                {dateRangeLabel[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Total summary card */}
        <div style={S.totalCard}>
          <div>
            <div style={S.totalLabel}>{t.totalExpenses}</div>
            <div style={S.totalAmt}>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{filtered.length} entries</div>
          </div>
          <span style={{ fontSize: 48 }}>📊</span>
        </div>

        {/* Category filter */}
        <div style={{ ...S.section, padding: '0.875rem 1.25rem' }}>
          <div style={S.pillRow}>
            <button style={S.pill(catFilter === 'ALL')} onClick={() => setCatFilter('ALL')}>
              {t.all}
            </button>
            {CATEGORIES.map(c => (
              <button key={c.key} style={S.pill(catFilter === c.key)} onClick={() => setCatFilter(c.key)}>
                {c.emoji} {t[c.labelKey]}
              </button>
            ))}
          </div>
        </div>

        {/* Expense list */}
        <div style={S.section}>
          <div style={S.sectionTitle}>{t.expenses}</div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)', fontSize: 14 }}>
              📋 No expenses found
            </div>
          ) : (
            filtered.map(exp => {
              const cat = CAT_MAP[exp.category] || CAT_MAP.OTHER
              return (
                <div key={exp.id} style={S.expRow}>
                  {/* Left: date + category */}
                  <div style={{ minWidth: 64, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>
                      {fmtDate(exp.date)}
                    </div>
                  </div>

                  {/* Middle: info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={S.catBadge(exp.category)}>
                        {cat.emoji} {t[cat.labelKey]}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-900)' }}>
                        {exp.description}
                      </span>
                    </div>
                    <div style={S.metaText}>
                      {exp.paidTo && <span>{t.paidTo}: <strong>{exp.paidTo}</strong> · </span>}
                      {exp.addedBy?.name && <span>By {exp.addedBy.name}</span>}
                    </div>
                  </div>

                  {/* Right: amount + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={S.amount}>₹{parseFloat(exp.amount).toLocaleString('en-IN')}</span>
                    <button
                      style={S.iconBtn('#1d4ed8')}
                      onClick={() => openEdit(exp)}
                      title={t.edit}
                    >✏️</button>
                    {isOwner && (
                      <button
                        style={S.iconBtn('#dc2626')}
                        onClick={() => handleDelete(exp.id)}
                        disabled={deleting === exp.id}
                        title={t.delete}
                      >
                        {deleting === exp.id ? '…' : '🗑️'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)', margin: 0 }}>
                {editTarget ? t.edit : t.addExpense}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--gray-400)' }}
              >×</button>
            </div>

            {/* Category chips */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>{t.category}</label>
              <div style={S.chipRow}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    style={S.chip(form.category === c.key)}
                    onClick={() => setForm(f => ({ ...f, category: c.key }))}
                  >
                    {c.emoji} {t[c.labelKey]}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>{t.description} *</label>
              <input
                style={S.input}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t.description}
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>{t.price} / Amount (₹) *</label>
              <input
                style={S.input}
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Paid To */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>{t.paidTo}</label>
              <input
                style={S.input}
                value={form.paidTo}
                onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))}
                placeholder={t.optional}
              />
            </div>

            {/* Date */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={S.label}>{t.dueDate ?? 'Date'}</label>
              <input
                style={S.input}
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                {t.cancel}
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !form.description.trim() || !form.amount}
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
