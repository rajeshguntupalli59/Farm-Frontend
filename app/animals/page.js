'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAnimals, addAnimal, updateAnimal, deleteAnimal, addWeightLog } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const TYPES = ['GOAT', 'SHEEP', 'CHICKEN', 'HEN']
const TYPE_EMOJI = { GOAT: '🐐', SHEEP: '🐑', CHICKEN: '🐓', HEN: '🐔' }
const STATUS_STYLE = {
  AVAILABLE: { bg: '#dcfce7', color: '#166534' },
  SOLD:      { bg: '#fee2e2', color: '#dc2626' },
  DEAD:      { bg: '#f3f4f6', color: '#6b7280' }
}
const EMPTY = { name: '', type: 'GOAT', breed: '', age: '', weight: '', price: '', description: '', status: 'AVAILABLE' }
const WEIGHT_EMPTY = { weight: '', date: new Date().toISOString().slice(0, 10), notes: '' }

export default function AnimalsPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()
  const canEdit = ['OWNER', 'MANAGER'].includes(user?.role)

  const [animals, setAnimals] = useState([])
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('AVAILABLE')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  // Weight log modal
  const [weightAnimal, setWeightAnimal] = useState(null)  // animal object or null
  const [weightForm, setWeightForm] = useState(WEIGHT_EMPTY)
  const [weightSaving, setWeightSaving] = useState(false)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    fetchAnimals()
  }, [router])

  const fetchAnimals = async () => {
    try { const r = await getAnimals(); setAnimals(r.data.animals) }
    catch { router.push('/login') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setForm(EMPTY); setPhoto(null); setModal('add') }
  const openEdit = (a) => {
    setForm({ name: a.name, type: a.type, breed: a.breed || '', age: a.age || '', weight: a.weight?.toString() || '', price: a.price.toString(), description: a.description || '', status: a.status })
    setPhoto(null); setModal(a)
  }

  const handleSave = async () => {
    if (!form.name || !form.type || !form.price) return
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (photo) fd.append('photo', photo)
      if (modal === 'add') await addAnimal(fd)
      else await updateAnimal(modal.id, fd)
      setModal(null); fetchAnimals()
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await deleteAnimal(deleteId); setDeleteId(null); fetchAnimals() }
    catch (err) { alert(err.response?.data?.message || 'Failed') }
  }

  const openWeightModal = (a) => {
    setWeightAnimal(a)
    setWeightForm({ ...WEIGHT_EMPTY, date: new Date().toISOString().slice(0, 10) })
  }

  const handleSaveWeight = async () => {
    if (!weightForm.weight) return
    setWeightSaving(true)
    try {
      await addWeightLog({
        animalId: weightAnimal.id,
        weight: Number(weightForm.weight),
        date: weightForm.date,
        notes: weightForm.notes.trim() || undefined,
      })
      setWeightAnimal(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save weight log')
    } finally {
      setWeightSaving(false)
    }
  }

  const filtered = animals.filter(a => {
    const matchType = !filter || a.type === filter
    const matchStatus = !statusFilter || a.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !search || a.name.toLowerCase().includes(q) || (a.breed || '').toLowerCase().includes(q)
    return matchType && matchStatus && matchSearch
  })

  if (loading) return (
    <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>🐐</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            {t.animals} ({filtered.length})
          </h1>
          {canEdit && <button onClick={openAdd} className="btn-primary">+ {t.addAnimal}</button>}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input placeholder={`🔍 ${t.search}`} value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          {['', ...TYPES].map(type => (
            <button key={type} onClick={() => setFilter(type)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filter === type ? '#166534' : 'var(--gray-200)',
              background: filter === type ? '#166534' : '#fff',
              color: filter === type ? '#fff' : 'var(--gray-600)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600
            }}>{type ? `${TYPE_EMOJI[type]} ${t[type.toLowerCase()] || type}` : t.all}</button>
          ))}
          {['', 'AVAILABLE', 'SOLD', 'DEAD'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '6px 12px', borderRadius: 20, border: '1px solid',
              borderColor: statusFilter === s ? '#166534' : 'var(--gray-200)',
              background: statusFilter === s ? (s === 'AVAILABLE' ? '#dcfce7' : s === 'SOLD' ? '#fee2e2' : s === 'DEAD' ? '#f3f4f6' : '#166534') : '#fff',
              color: statusFilter === s ? (s === '' ? '#fff' : s === 'AVAILABLE' ? '#166534' : s === 'SOLD' ? '#dc2626' : '#6b7280') : 'var(--gray-600)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600
            }}>{s || t.all}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 56 }}>🐐</div>
            <p style={{ marginTop: 8 }}>{t.noAnimals}</p>
            {canEdit && <button onClick={openAdd} className="btn-primary" style={{ marginTop: 16 }}>+ {t.addAnimal}</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {filtered.map(a => {
              const ss = STATUS_STYLE[a.status] || {}
              return (
                <div key={a.id} style={{
                  background: '#fff', borderRadius: 14, overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)'
                }}>
                  {a.photoUrl ? (
                    <img src={a.photoUrl} alt={a.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: 120, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                      {TYPE_EMOJI[a.type]}
                    </div>
                  )}
                  <div style={{ padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                          {TYPE_EMOJI[a.type]} {t[a.type.toLowerCase()] || a.type}
                          {a.breed && ` • ${a.breed}`}
                        </div>
                        {(a.age || a.weight) && (
                          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                            {a.age}{a.age && a.weight && ' • '}{a.weight && `${a.weight}kg`}
                          </div>
                        )}
                      </div>
                      <span style={{ background: ss.bg, color: ss.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        {t[a.status?.toLowerCase()] || a.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#166534', marginBottom: canEdit ? 8 : 0 }}>
                      ₹{a.price}
                    </div>
                    {canEdit && (
                      <>
                        {/* Edit / Delete row */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <button onClick={() => openEdit(a)} style={{
                            flex: 1, background: '#dbeafe', color: '#1d4ed8', border: 'none',
                            borderRadius: 7, padding: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600
                          }}>✏️ {t.edit}</button>
                          {user?.role === 'OWNER' && (
                            <button onClick={() => setDeleteId(a.id)} style={{
                              background: '#fee2e2', color: '#dc2626', border: 'none',
                              borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12
                            }}>🗑️</button>
                          )}
                        </div>
                        {/* Health / Weight row */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => router.push(`/health?animalId=${a.id}`)}
                            style={{
                              flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                              borderRadius: 7, padding: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600
                            }}
                          >
                            💉 {t.healthRecords}
                          </button>
                          <button
                            onClick={() => openWeightModal(a)}
                            style={{
                              flex: 1, background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a',
                              borderRadius: 7, padding: '6px', cursor: 'pointer', fontSize: 12, fontWeight: 600
                            }}
                          >
                            ⚖️ {t.addWeight}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>{modal === 'add' ? t.addAnimal : 'Edit Animal'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label>{t.name} *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label>{t.price} (₹) *</label><input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>Type *</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {TYPES.map(type => (
                  <button key={type} onClick={() => setForm(f => ({ ...f, type }))} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, border: '1px solid',
                    borderColor: form.type === type ? '#166534' : 'var(--gray-200)',
                    background: form.type === type ? '#166534' : '#fff',
                    color: form.type === type ? '#fff' : 'var(--gray-700)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}>{TYPE_EMOJI[type]}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div><label>{t.breed}</label><input value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} placeholder="e.g. Boer" /></div>
              <div><label>{t.age}</label><input value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 2 years" /></div>
              <div><label>{t.weight}</label><input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="kg" /></div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.status}</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {['AVAILABLE', 'SOLD', 'DEAD'].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} style={{
                    flex: 1, padding: '7px', borderRadius: 8, border: '1px solid',
                    borderColor: form.status === s ? '#166534' : 'var(--gray-200)',
                    background: form.status === s ? STATUS_STYLE[s].bg : '#fff',
                    color: form.status === s ? STATUS_STYLE[s].color : 'var(--gray-700)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600
                  }}>{t[s.toLowerCase()] || s}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}><label>{t.description}</label><textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} /></div>

            <div style={{ marginTop: '0.75rem' }}><label>{t.photo}</label>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />
              {modal !== 'add' && modal?.photoUrl && !photo && (
                <div style={{ marginTop: 6 }}>
                  <img src={modal.photoUrl} alt="current" style={{ height: 60, borderRadius: 6 }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setModal(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? t.saving : t.save}</button>
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
              <button onClick={handleDelete} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0.625rem', cursor: 'pointer', fontWeight: 700 }}>{t.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Log Modal */}
      {weightAnimal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWeightAnimal(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--green-900)' }}>
                ⚖️ {t.addWeight} — {weightAnimal.name}
              </h2>
              <button onClick={() => setWeightAnimal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>{t.weight} (kg) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={weightForm.weight}
                  onChange={e => setWeightForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="e.g. 24.5"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>{t.dueDate}</label>
                <input
                  type="date"
                  value={weightForm.date}
                  onChange={e => setWeightForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: 4 }}>{t.note} ({t.optional})</label>
              <textarea
                rows={2}
                value={weightForm.notes}
                onChange={e => setWeightForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any observations..."
                style={{ resize: 'vertical', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setWeightAnimal(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button
                onClick={handleSaveWeight}
                disabled={weightSaving || !weightForm.weight}
                className="btn-primary"
                style={{ flex: 1, opacity: (weightSaving || !weightForm.weight) ? 0.6 : 1 }}
              >
                {weightSaving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
