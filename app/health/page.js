'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllHealthRecords, addHealthRecord, updateHealthRecord, deleteHealthRecord, getAnimals } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const TYPE_EMOJI = { GOAT: '🐐', SHEEP: '🐑', CHICKEN: '🐓', HEN: '🐔' }

const RECORD_TYPES = ['VACCINATION', 'DEWORMING', 'VET_VISIT', 'TREATMENT']

const TYPE_BADGE = {
  VACCINATION: { bg: '#dbeafe', color: '#1d4ed8' },
  DEWORMING:   { bg: '#dcfce7', color: '#166534' },
  VET_VISIT:   { bg: '#fef3c7', color: '#92400e' },
  TREATMENT:   { bg: '#fee2e2', color: '#dc2626' },
}

const EMPTY_FORM = {
  animalId: '',
  type: 'VACCINATION',
  medicine: '',
  dose: '',
  notes: '',
  date: new Date().toISOString().slice(0, 10),
  nextDueDate: '',
}

function daysDiff(dateStr) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - now) / 86400000)
}

export default function HealthPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()

  const [records, setRecords] = useState([])
  const [animals, setAnimals] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | record-object (edit)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (!['OWNER', 'MANAGER'].includes(user?.role)) { router.push('/dashboard'); return }
    fetchAll()
  }, [router])

  const fetchAll = async () => {
    try {
      const [recRes, animRes] = await Promise.all([getAllHealthRecords(), getAnimals()])
      setRecords(recRes.data.records ?? recRes.data)
      setAnimals(animRes.data.animals ?? animRes.data)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, animalId: animals[0]?.id?.toString() ?? '' })
    setModal('add')
  }

  const openEdit = (rec) => {
    setForm({
      animalId: rec.animalId?.toString() ?? '',
      type: rec.type,
      medicine: rec.medicine ?? '',
      dose: rec.dose ?? '',
      notes: rec.notes ?? '',
      date: rec.date ? rec.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      nextDueDate: rec.nextDueDate ? rec.nextDueDate.slice(0, 10) : '',
    })
    setModal(rec)
  }

  const handleSave = async () => {
    if (!form.animalId || !form.type) return
    setSaving(true)
    try {
      const payload = {
        animalId: Number(form.animalId),
        type: form.type,
        medicine: form.medicine,
        dose: form.dose,
        notes: form.notes,
        date: form.date,
        nextDueDate: form.nextDueDate || null,
      }
      if (modal === 'add') {
        await addHealthRecord(payload)
      } else {
        await updateHealthRecord(modal.id, payload)
      }
      setModal(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteHealthRecord(deleteId)
      setDeleteId(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    }
  }

  const filtered = typeFilter
    ? records.filter(r => r.type === typeFilter)
    : records

  // Upcoming due within 7 days (not yet overdue)
  const upcomingDue = records.filter(r => {
    if (!r.nextDueDate) return false
    const diff = daysDiff(r.nextDueDate)
    return diff >= 0 && diff <= 7
  })

  const animalById = (id) => animals.find(a => a.id === Number(id))

  const typeLabel = (type) => {
    const map = { VACCINATION: t.vaccination, DEWORMING: t.deworming, VET_VISIT: t.vetVisit, TREATMENT: t.treatment }
    return map[type] || type
  }

  if (loading) return (
    <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>🐐</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            💊 {t.healthRecords} ({filtered.length})
          </h1>
          <button onClick={openAdd} className="btn-primary">+ {t.addHealthRecord}</button>
        </div>

        {/* Upcoming due alert */}
        {upcomingDue.length > 0 && (
          <div style={{
            background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10,
            padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: 10
          }}>
            <span style={{ fontSize: 20 }}>⏰</span>
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>
                {t.upcomingDue} — {upcomingDue.length} record{upcomingDue.length > 1 ? 's' : ''} due within 7 days
              </div>
              <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
                {upcomingDue.map(r => {
                  const animal = animalById(r.animalId)
                  const diff = daysDiff(r.nextDueDate)
                  return (
                    <span key={r.id} style={{ marginRight: 12 }}>
                      {TYPE_EMOJI[animal?.type] || '🐾'} {animal?.name || '—'} · {typeLabel(r.type)} · {diff === 0 ? 'Today' : `${diff}d`}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Type filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['', ...RECORD_TYPES].map(type => {
            const active = typeFilter === type
            const badge = TYPE_BADGE[type]
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: '1px solid',
                  borderColor: active ? '#166534' : 'var(--gray-200)',
                  background: active ? (badge ? badge.bg : '#166534') : '#fff',
                  color: active ? (badge ? badge.color : '#fff') : 'var(--gray-600)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s'
                }}
              >
                {type ? typeLabel(type) : t.all}
              </button>
            )
          })}
        </div>

        {/* Records grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 56 }}>💊</div>
            <p style={{ marginTop: 8 }}>{t.noHealthRecords}</p>
            <button onClick={openAdd} className="btn-primary" style={{ marginTop: 16 }}>+ {t.addHealthRecord}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filtered.map(rec => {
              const animal = animalById(rec.animalId)
              const badge = TYPE_BADGE[rec.type] || { bg: '#f3f4f6', color: '#374151' }
              let dueDiff = rec.nextDueDate ? daysDiff(rec.nextDueDate) : null
              const dueDateColor = dueDiff === null ? 'var(--gray-400)'
                : dueDiff < 0 ? '#dc2626'
                : dueDiff <= 7 ? '#d97706'
                : '#166534'

              return (
                <div key={rec.id} className="card" style={{ padding: '1rem' }}>
                  {/* Animal + type badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 28 }}>{TYPE_EMOJI[animal?.type] || '🐾'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--green-900)' }}>
                          {animal?.name || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          {animal?.type || ''}{animal?.breed ? ` · ${animal.breed}` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: badge.bg, color: badge.color,
                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20
                    }}>
                      {typeLabel(rec.type)}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {rec.medicine && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--gray-400)', minWidth: 60 }}>{t.medicine}:</span>
                        <span style={{ fontWeight: 600 }}>{rec.medicine}</span>
                      </div>
                    )}
                    {rec.dose && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--gray-400)', minWidth: 60 }}>{t.dose}:</span>
                        <span>{rec.dose}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--gray-400)', minWidth: 60 }}>Date:</span>
                      <span>{rec.date ? new Date(rec.date).toLocaleDateString() : '—'}</span>
                    </div>
                    {rec.nextDueDate && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: 'var(--gray-400)', minWidth: 60 }}>{t.nextDue}:</span>
                        <span style={{ fontWeight: 700, color: dueDateColor }}>
                          {new Date(rec.nextDueDate).toLocaleDateString()}
                          {dueDiff !== null && (
                            <span style={{ fontSize: 11, marginLeft: 6 }}>
                              {dueDiff < 0 ? `(${Math.abs(dueDiff)}d overdue)` : dueDiff === 0 ? '(Today!)' : `(in ${dueDiff}d)`}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {rec.notes && (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2, fontStyle: 'italic' }}>
                        {rec.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button
                      onClick={() => openEdit(rec)}
                      style={{ flex: 1, background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 7, padding: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      ✏️ {t.edit}
                    </button>
                    <button
                      onClick={() => setDeleteId(rec.id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>
                {modal === 'add' ? t.addHealthRecord : `✏️ ${t.edit} ${t.healthRecords}`}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            {/* Animal select */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label>Animal *</label>
              <select
                value={form.animalId}
                onChange={e => setForm(f => ({ ...f, animalId: e.target.value }))}
                style={{ width: '100%', marginTop: 4 }}
              >
                <option value="">— Select Animal —</option>
                {animals.map(a => (
                  <option key={a.id} value={a.id}>
                    {TYPE_EMOJI[a.type]} {a.name} {a.breed ? `(${a.breed})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Record type */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label>Type *</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {RECORD_TYPES.map(type => {
                  const b = TYPE_BADGE[type]
                  const active = form.type === type
                  return (
                    <button
                      key={type}
                      onClick={() => setForm(f => ({ ...f, type }))}
                      style={{
                        flex: '1 1 40%', padding: '8px 6px', borderRadius: 8, border: '2px solid',
                        borderColor: active ? b.color : 'var(--gray-200)',
                        background: active ? b.bg : '#fff',
                        color: active ? b.color : 'var(--gray-600)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 700
                      }}
                    >
                      {typeLabel(type)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Medicine + Dose */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label>{t.medicine}</label>
                <input value={form.medicine} onChange={e => setForm(f => ({ ...f, medicine: e.target.value }))} placeholder="e.g. PPR Vaccine" />
              </div>
              <div>
                <label>{t.dose}</label>
                <input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="e.g. 2ml" />
              </div>
            </div>

            {/* Date + Next Due */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label>{t.nextDue}</label>
                <input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1rem' }}>
              <label>Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setModal(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>{t.deleteConfirm}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setDeleteId(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button
                onClick={handleDelete}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.625rem', cursor: 'pointer', fontWeight: 700 }}
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
