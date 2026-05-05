'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBreedingRecords, addBreedingRecord, updateBreedingRecord, deleteBreedingRecord, getAnimals } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const TYPE_EMOJI = { GOAT: '🐐', SHEEP: '🐑', CHICKEN: '🐓', HEN: '🐔' }

const FEMALE_TYPES = ['GOAT', 'SHEEP']

const STATUS_BADGE = {
  PREGNANT:  { bg: '#dcfce7', color: '#166534' },
  DELIVERED: { bg: '#dbeafe', color: '#1d4ed8' },
  FAILED:    { bg: '#fee2e2', color: '#dc2626' },
}

const GESTATION_DAYS = 150

function daysDiff(dateStr) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.round((d - now) / 86400000)
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  femaleId: '',
  maleName: '',
  matingDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

const EMPTY_UPDATE = {
  status: 'DELIVERED',
  litterCount: '',
  actualDueDate: new Date().toISOString().slice(0, 10),
}

export default function BreedingPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()

  const [records, setRecords] = useState([])
  const [animals, setAnimals] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [updateModal, setUpdateModal] = useState(null) // record to update status
  const [updateForm, setUpdateForm] = useState(EMPTY_UPDATE)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (!['OWNER', 'MANAGER'].includes(user?.role)) { router.push('/dashboard'); return }
    fetchAll()
  }, [router])

  const fetchAll = async () => {
    try {
      const [breedRes, animRes] = await Promise.all([getBreedingRecords(), getAnimals()])
      setRecords(breedRes.data.records ?? breedRes.data)
      setAnimals(animRes.data.animals ?? animRes.data)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const femaleAnimals = animals.filter(a => FEMALE_TYPES.includes(a.type))

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, femaleId: femaleAnimals[0]?.id?.toString() ?? '' })
    setAddModal(true)
  }

  const handleAdd = async () => {
    if (!form.femaleId || !form.matingDate) return
    setSaving(true)
    try {
      const expectedDueDate = addDays(form.matingDate, GESTATION_DAYS)
      await addBreedingRecord({
        femaleId: Number(form.femaleId),
        maleName: form.maleName,
        matingDate: form.matingDate,
        expectedDue: expectedDueDate,
        notes: form.notes,
      })
      setAddModal(false)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const openUpdate = (rec) => {
    setUpdateForm({ status: 'DELIVERED', litterCount: '', actualDueDate: new Date().toISOString().slice(0, 10) })
    setUpdateModal(rec)
  }

  const handleUpdate = async () => {
    if (!updateModal) return
    setSaving(true)
    try {
      const payload = {
        status: updateForm.status,
        ...(updateForm.status === 'DELIVERED' && {
          litterCount: updateForm.litterCount ? Number(updateForm.litterCount) : null,
          actualDue: updateForm.actualDueDate,
        }),
      }
      await updateBreedingRecord(updateModal.id, payload)
      setUpdateModal(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBreedingRecord(deleteId)
      setDeleteId(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed')
    }
  }

  const filtered = statusFilter
    ? records.filter(r => r.status === statusFilter)
    : records

  const animalById = (id) => animals.find(a => a.id === Number(id))

  const statusLabel = (s) => {
    const map = { PREGNANT: t.pregnant, DELIVERED: t.delivered, FAILED: t.failed || 'Failed' }
    return map[s] || s
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
            🐣 {t.breeding} ({filtered.length})
          </h1>
          <button onClick={openAdd} className="btn-primary">+ {t.addBreeding}</button>
        </div>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['', 'PREGNANT', 'DELIVERED', 'FAILED'].map(s => {
            const active = statusFilter === s
            const badge = STATUS_BADGE[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: '1px solid',
                  borderColor: active ? (badge ? badge.color : '#166534') : 'var(--gray-200)',
                  background: active ? (badge ? badge.bg : '#166534') : '#fff',
                  color: active ? (badge ? badge.color : '#fff') : 'var(--gray-600)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s'
                }}
              >
                {s ? statusLabel(s) : t.all}
              </button>
            )
          })}
        </div>

        {/* Records grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 56 }}>🐣</div>
            <p style={{ marginTop: 8 }}>No breeding records yet</p>
            <button onClick={openAdd} className="btn-primary" style={{ marginTop: 16 }}>+ {t.addBreeding}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filtered.map(rec => {
              const female = animalById(rec.femaleId)
              const badge = STATUS_BADGE[rec.status] || { bg: '#f3f4f6', color: '#6b7280' }
              const dueDate = rec.expectedDueDate
              const dueDiff = dueDate ? daysDiff(dueDate) : null
              const isPregnant = rec.status === 'PREGNANT'
              const isOverdue = isPregnant && dueDiff !== null && dueDiff < 0

              return (
                <div key={rec.id} className="card" style={{ padding: '1rem' }}>
                  {/* Top row: animal info + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 28 }}>{TYPE_EMOJI[female?.type] || '🐾'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--green-900)' }}>
                          {female?.name || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          {female?.type || ''}{female?.breed ? ` · ${female.breed}` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: badge.bg, color: badge.color,
                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20
                    }}>
                      {statusLabel(rec.status)}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    {rec.maleName && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--gray-400)', minWidth: 90 }}>{t.maleName}:</span>
                        <span style={{ fontWeight: 600 }}>{rec.maleName}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--gray-400)', minWidth: 90 }}>{t.matingDate}:</span>
                      <span>{rec.matingDate ? new Date(rec.matingDate).toLocaleDateString() : '—'}</span>
                    </div>
                    {dueDate && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: 'var(--gray-400)', minWidth: 90 }}>{t.expectedDue}:</span>
                        <span style={{ fontWeight: 600 }}>
                          {new Date(dueDate).toLocaleDateString()}
                        </span>
                        {/* Countdown badge */}
                        {isPregnant && dueDiff !== null && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: isOverdue ? '#fee2e2' : '#dcfce7',
                            color: isOverdue ? '#dc2626' : '#166534',
                          }}>
                            {isOverdue ? `OVERDUE ${Math.abs(dueDiff)}d` : dueDiff === 0 ? 'Today!' : `${dueDiff}d left`}
                          </span>
                        )}
                      </div>
                    )}
                    {rec.status === 'DELIVERED' && rec.litterCount != null && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--gray-400)', minWidth: 90 }}>{t.litterCount}:</span>
                        <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{rec.litterCount} offspring</span>
                      </div>
                    )}
                    {rec.notes && (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2, fontStyle: 'italic' }}>
                        {rec.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {rec.status === 'PREGNANT' && (
                      <button
                        onClick={() => openUpdate(rec)}
                        style={{ flex: 1, background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 7, padding: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        ✅ Update Status
                      </button>
                    )}
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

      {/* Add Record Modal */}
      {addModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAddModal(false)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>🐣 {t.addBreeding}</h2>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            {/* Female animal */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label>Female Animal * (Goat / Sheep)</label>
              <select
                value={form.femaleId}
                onChange={e => setForm(f => ({ ...f, femaleId: e.target.value }))}
                style={{ width: '100%', marginTop: 4 }}
              >
                <option value="">— Select Female —</option>
                {femaleAnimals.map(a => (
                  <option key={a.id} value={a.id}>
                    {TYPE_EMOJI[a.type]} {a.name} {a.breed ? `(${a.breed})` : ''}
                  </option>
                ))}
              </select>
              {femaleAnimals.length === 0 && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>No female Goat/Sheep animals found.</p>
              )}
            </div>

            {/* Male name */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label>{t.maleName}</label>
              <input
                value={form.maleName}
                onChange={e => setForm(f => ({ ...f, maleName: e.target.value }))}
                placeholder="e.g. Raja (optional)"
              />
            </div>

            {/* Mating date */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label>{t.matingDate} *</label>
              <input
                type="date"
                value={form.matingDate}
                onChange={e => setForm(f => ({ ...f, matingDate: e.target.value }))}
              />
              {form.matingDate && (
                <p style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                  Expected due: {new Date(addDays(form.matingDate, GESTATION_DAYS)).toLocaleDateString()} (+{GESTATION_DAYS} days)
                </p>
              )}
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
              <button onClick={() => setAddModal(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {updateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setUpdateModal(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>
                ✅ Update Status — {animalById(updateModal?.femaleId)?.name}
              </h2>
              <button onClick={() => setUpdateModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            {/* Status choice */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label>New Status</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {['DELIVERED', 'FAILED'].map(s => {
                  const b = STATUS_BADGE[s]
                  const active = updateForm.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => setUpdateForm(f => ({ ...f, status: s }))}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8, border: '2px solid',
                        borderColor: active ? b.color : 'var(--gray-200)',
                        background: active ? b.bg : '#fff',
                        color: active ? b.color : 'var(--gray-600)',
                        cursor: 'pointer', fontSize: 13, fontWeight: 700
                      }}
                    >
                      {statusLabel(s)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Delivered: litter count + actual date */}
            {updateForm.status === 'DELIVERED' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label>{t.litterCount}</label>
                    <input
                      type="number"
                      min="0"
                      value={updateForm.litterCount}
                      onChange={e => setUpdateForm(f => ({ ...f, litterCount: e.target.value }))}
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div>
                    <label>Delivery Date</label>
                    <input
                      type="date"
                      value={updateForm.actualDueDate}
                      onChange={e => setUpdateForm(f => ({ ...f, actualDueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => setUpdateModal(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleUpdate} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
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
