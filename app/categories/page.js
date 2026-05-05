'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import { suggestTelugu } from '../../lib/teluguDict'
import Navbar from '../components/Navbar'

const EMOJIS = ['📦','🐐','🥦','🌾','🐓','🥛','🧈','🍅','🧅','🌿','🌽','🍌','🍋','🐄','🐖','🥚','🍎','🍇','🫛','🥕']
const EMPTY = { name: '', nameTelugu: '', emoji: '📦', description: '', parentId: '', sortOrder: 0 }

export default function CategoriesPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()
  const canEdit = ['OWNER', 'MANAGER'].includes(user?.role)

  const [categories, setCategories] = useState([])
  const [flatCategories, setFlatCategories] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    fetchAll()
  }, [router])

  const fetchAll = async () => {
    const [tree, flat] = await Promise.all([
      getCategories().then(r => r.data.categories),
      getCategories({ flat: 'true' }).then(r => r.data.categories)
    ])
    setCategories(tree)
    setFlatCategories(flat)
  }

  const openAdd = (parentId) => {
    setForm({ ...EMPTY, parentId: parentId ? parentId.toString() : '' })
    setModal('add')
  }
  const openEdit = (cat) => {
    setForm({
      name: cat.name, nameTelugu: cat.nameTelugu || '',
      emoji: cat.emoji || '📦', description: cat.description || '',
      parentId: cat.parentId ? cat.parentId.toString() : '',
      sortOrder: cat.sortOrder || 0
    })
    setModal(cat)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const payload = {
        name: form.name, nameTelugu: form.nameTelugu, emoji: form.emoji,
        description: form.description, sortOrder: form.sortOrder,
        ...(form.parentId && { parentId: parseInt(form.parentId) })
      }
      if (modal === 'add') await addCategory(payload)
      else await updateCategory(modal.id, payload)
      setModal(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteCategory(deleteId)
      setDeleteId(null)
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)' }}>
            {t.categories} ({flatCategories.length})
          </h1>
          {canEdit && (
            <button onClick={() => openAdd(null)} className="btn-primary">+ {t.addCategory}</button>
          )}
        </div>

        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 56 }}>🗂️</div>
            <p style={{ marginTop: 8 }}>No categories yet</p>
            {canEdit && <button onClick={() => openAdd(null)} className="btn-primary" style={{ marginTop: 16 }}>+ {t.addCategory}</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{
                background: '#fff', borderRadius: 14, overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)'
              }}>
                {/* Parent category */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '1rem 1.25rem',
                  background: 'linear-gradient(135deg, #166534, #15803d)'
                }}>
                  <span style={{ fontSize: 28 }}>{cat.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{cat.name}</div>
                    {cat.nameTelugu && <div style={{ color: '#86efac', fontSize: 13 }}>{cat.nameTelugu}</div>}
                    <div style={{ color: '#a7f3d0', fontSize: 12, marginTop: 2 }}>{cat._count?.products} products</div>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openAdd(cat.id)} style={{
                        background: 'rgba(255,255,255,0.2)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.3)', borderRadius: 7,
                        padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600
                      }}>+ Sub</button>
                      <button onClick={() => openEdit(cat)} style={{
                        background: 'rgba(255,255,255,0.2)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.3)', borderRadius: 7,
                        padding: '5px 10px', cursor: 'pointer', fontSize: 12
                      }}>✏️</button>
                      {user?.role === 'OWNER' && (
                        <button onClick={() => setDeleteId(cat.id)} style={{
                          background: 'rgba(220,38,38,0.3)', color: '#fca5a5',
                          border: '1px solid rgba(220,38,38,0.3)', borderRadius: 7,
                          padding: '5px 8px', cursor: 'pointer', fontSize: 12
                        }}>🗑️</button>
                      )}
                    </div>
                  )}
                </div>

                {/* Subcategories */}
                {cat.subcategories?.length > 0 && (
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                    {cat.subcategories.map(sub => (
                      <div key={sub.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'var(--green-50)', border: '1px solid var(--green-100)',
                        borderRadius: 8, padding: '6px 12px'
                      }}>
                        <span style={{ fontSize: 16 }}>{sub.emoji}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-900)' }}>{sub.name}</div>
                          {sub.nameTelugu && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{sub.nameTelugu}</div>}
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{sub._count?.products} products</div>
                        </div>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                            <button onClick={() => openEdit(sub)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2
                            }}>✏️</button>
                            {user?.role === 'OWNER' && (
                              <button onClick={() => setDeleteId(sub.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2
                              }}>🗑️</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {canEdit && (
                      <button onClick={() => openAdd(cat.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: '#fff', border: '1px dashed var(--gray-200)',
                        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                        fontSize: 13, color: 'var(--gray-400)'
                      }}>+ subcategory</button>
                    )}
                  </div>
                )}
                {cat.subcategories?.length === 0 && canEdit && (
                  <div style={{ padding: '0.625rem 1rem' }}>
                    <button onClick={() => openAdd(cat.id)} style={{
                      background: 'none', border: '1px dashed var(--gray-200)',
                      borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                      fontSize: 13, color: 'var(--gray-400)'
                    }}>+ Add subcategory</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>
                {modal === 'add' ? t.addCategory : 'Edit Category'}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label>{t.name} (EN) *</label><input value={form.name} onChange={e => {
                const val = e.target.value
                const suggested = suggestTelugu(val)
                setForm(f => ({ ...f, name: val, nameTelugu: f.nameTelugu || suggested }))
              }} placeholder="e.g. Animals" /></div>
              <div><label>{t.nameTelugu} {form.nameTelugu && form.nameTelugu === suggestTelugu(form.name) ? <span style={{fontSize:11,color:'#16a34a',marginLeft:4}}>✓ auto</span> : ''}</label><input value={form.nameTelugu} onChange={e => setForm(f => ({...f, nameTelugu: e.target.value}))} placeholder="పశువులు" /></div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.parentCategory} ({t.optional})</label>
              <select value={form.parentId} onChange={e => setForm(f => ({...f, parentId: e.target.value}))}>
                <option value="">None (top-level category)</option>
                {flatCategories.filter(c => !c.parentId).map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.emoji}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({...f, emoji: e}))} style={{
                    fontSize: 22, border: '2px solid',
                    borderColor: form.emoji === e ? '#166534' : 'transparent',
                    borderRadius: 8, padding: '4px 6px', cursor: 'pointer',
                    background: form.emoji === e ? '#f0fdf4' : 'transparent'
                  }}>{e}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.description} ({t.optional})</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Brief description" />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.sortOrder}</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({...f, sortOrder: parseInt(e.target.value) || 0}))} placeholder="0" style={{ width: 100 }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
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
            <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 6 }}>This will also remove all subcategories.</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setDeleteId(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleDelete} style={{
                flex: 1, background: '#dc2626', color: '#fff', border: 'none',
                borderRadius: 8, padding: '0.625rem', cursor: 'pointer', fontWeight: 700
              }}>{t.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
