'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, addCategory, updateCategory, deleteCategory } from '../../lib/api'
import { getUser, getToken } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import { suggestTelugu } from '../../lib/teluguDict'
import Navbar from '../components/Navbar'

const UNITS = ['KG', 'piece', 'animal', 'dozen', 'litre', 'packet', 'bag', 'gram', 'bundle']
const EMPTY_FORM = {
  name: '', nameTelugu: '', categoryId: '', unit: 'KG',
  price: '', stock: '', minStock: '', description: '', descTelugu: '', isAvailable: true
}
const EMPTY_CAT = { name: '', nameTelugu: '', emoji: '📦', parentId: '' }
const CAT_EMOJIS = ['📦','🐐','🥦','🌾','🐓','🥛','🧈','🍅','🧅','🌿','🌽','🍌','🥩','🐄','🐖','🥚','🍎','🍇','🫛','🥕']

export default function ProductsPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()
  const canEdit = ['OWNER', 'MANAGER'].includes(user?.role)
  const isOwner = user?.role === 'OWNER'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])       // flat list for dropdowns
  const [catTree, setCatTree] = useState([])             // tree for category panel
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCats, setShowCats] = useState(false)

  // product modal
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const fileRef = useRef()

  // category modal
  const [catModal, setCatModal] = useState(null)
  const [catForm, setCatForm] = useState(EMPTY_CAT)
  const [savingCat, setSavingCat] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState(null)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    Promise.all([fetchProducts(), fetchCategories()])
  }, [router])

  const fetchProducts = async () => {
    try {
      const res = await getProducts()
      setProducts(res.data.products)
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }

  const fetchCategories = async () => {
    try {
      const [flat, tree] = await Promise.all([
        getCategories({ flat: 'true' }).then(r => r.data.categories),
        getCategories().then(r => r.data.categories),
      ])
      setCategories(flat)
      setCatTree(tree)
    } catch {}
  }

  // ── product handlers ──────────────────────────────────────────────
  const openAdd = () => { setForm(EMPTY_FORM); setPhoto(null); setModal('add') }
  const openEdit = (p) => {
    setForm({
      name: p.name, nameTelugu: p.nameTelugu || '', categoryId: p.categoryId.toString(),
      unit: p.unit, price: p.price.toString(), stock: p.stock.toString(),
      minStock: p.minStock.toString(), description: p.description || '',
      descTelugu: p.descTelugu || '', isAvailable: p.isAvailable
    })
    setPhoto(null)
    setModal(p)
  }

  const handleSave = async () => {
    if (!form.name || !form.categoryId || !form.unit || !form.price) {
      alert('Name, category, unit and price are required'); return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v.toString()))
      if (photo) fd.append('photo', photo)
      if (modal === 'add') await addProduct(fd)
      else await updateProduct(modal.id, fd)
      setModal(null)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteProduct(deleteId)
      setDeleteId(null)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleToggle = async (p) => {
    try {
      const fd = new FormData()
      fd.append('isAvailable', (!p.isAvailable).toString())
      await updateProduct(p.id, fd)
      fetchProducts()
    } catch {}
  }

  // ── category handlers ─────────────────────────────────────────────
  const openAddCat = (parentId = '') => {
    setCatForm({ ...EMPTY_CAT, parentId: parentId ? parentId.toString() : '' })
    setCatModal('add')
  }
  const openEditCat = (cat) => {
    setCatForm({
      name: cat.name, nameTelugu: cat.nameTelugu || '',
      emoji: cat.emoji || '📦',
      parentId: cat.parentId ? cat.parentId.toString() : ''
    })
    setCatModal(cat)
  }

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) return
    setSavingCat(true)
    try {
      const payload = {
        name: catForm.name.trim(),
        nameTelugu: catForm.nameTelugu.trim(),
        emoji: catForm.emoji,
        ...(catForm.parentId && { parentId: parseInt(catForm.parentId) })
      }
      if (catModal === 'add') await addCategory(payload)
      else await updateCategory(catModal.id, payload)
      setCatModal(null)
      fetchCategories()
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category')
    } finally { setSavingCat(false) }
  }

  const handleDeleteCat = async () => {
    try {
      await deleteCategory(deleteCatId)
      setDeleteCatId(null)
      fetchCategories()
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category')
    }
  }

  // ── filter & group ────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      p.name.toLowerCase().includes(q) ||
      (p.nameTelugu || '').includes(search)
    const matchCat = !filterCat || p.categoryId === parseInt(filterCat)
    return matchSearch && matchCat
  })

  const grouped = {}
  filtered.forEach(p => {
    const catName = p.category?.parent?.name || p.category?.name || 'Other'
    if (!grouped[catName]) {
      grouped[catName] = { emoji: p.category?.parent?.emoji || p.category?.emoji || '📦', products: [] }
    }
    grouped[catName].products.push(p)
  })

  if (loading) return (
    <div style={{ paddingTop: 56, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <span style={{ fontSize: 40 }}>🐐</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            {t.products} ({filtered.length})
          </h1>
          {canEdit && (
            <button
              onClick={() => setShowCats(s => !s)}
              style={{
                background: showCats ? '#166534' : '#fff',
                color: showCats ? '#fff' : 'var(--green-800)',
                border: '1px solid #166534',
                borderRadius: 8, padding: '6px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}
            >
              🗂️ {t.categories}
            </button>
          )}
          {canEdit && (
            <button onClick={openAdd} className="btn-primary">+ {t.addProduct}</button>
          )}
        </div>

        {/* Category panel */}
        {showCats && (
          <div style={{
            background: '#fff', borderRadius: 14, padding: '1rem',
            marginBottom: '1.25rem', border: '1px solid var(--gray-100)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--green-900)' }}>
                🗂️ {t.categories} ({categories.length})
              </span>
              {canEdit && (
                <button onClick={() => openAddCat()} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
                  + {t.addCategory || 'Add Category'}
                </button>
              )}
            </div>

            {catTree.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>No categories yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {catTree.map(cat => (
                  <div key={cat.id} style={{
                    border: '1px solid var(--gray-100)', borderRadius: 10, overflow: 'hidden'
                  }}>
                    {/* Parent row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0.625rem 0.875rem',
                      background: 'linear-gradient(135deg,#166534,#15803d)'
                    }}>
                      <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{cat.name}</span>
                        {cat.nameTelugu && <span style={{ color: '#86efac', fontSize: 12, marginLeft: 8 }}>{cat.nameTelugu}</span>}
                        <span style={{ color: '#a7f3d0', fontSize: 11, marginLeft: 8 }}>{cat._count?.products || 0} products</span>
                      </div>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => openAddCat(cat.id)} style={{
                            background: 'rgba(255,255,255,0.2)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
                            padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600
                          }}>+ Sub</button>
                          <button onClick={() => openEditCat(cat)} style={{
                            background: 'rgba(255,255,255,0.2)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
                            padding: '3px 8px', cursor: 'pointer', fontSize: 11
                          }}>✏️</button>
                          {isOwner && (
                            <button onClick={() => setDeleteCatId(cat.id)} style={{
                              background: 'rgba(220,38,38,0.3)', color: '#fca5a5',
                              border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6,
                              padding: '3px 8px', cursor: 'pointer', fontSize: 11
                            }}>🗑️</button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Subcategories */}
                    {(cat.subcategories?.length > 0 || canEdit) && (
                      <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#fafafa' }}>
                        {cat.subcategories?.map(sub => (
                          <div key={sub.id} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: '#fff', border: '1px solid var(--green-100)',
                            borderRadius: 20, padding: '4px 10px'
                          }}>
                            <span style={{ fontSize: 14 }}>{sub.emoji}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-900)' }}>{sub.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>({sub._count?.products || 0})</span>
                            {canEdit && (
                              <>
                                <button onClick={() => openEditCat(sub)} style={{
                                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px'
                                }}>✏️</button>
                                {isOwner && (
                                  <button onClick={() => setDeleteCatId(sub.id)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px'
                                  }}>🗑️</button>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <button onClick={() => openAddCat(cat.id)} style={{
                            background: 'transparent', border: '1px dashed var(--gray-200)',
                            borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
                            fontSize: 12, color: 'var(--gray-400)'
                          }}>+ subcategory</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            placeholder={`🔍 ${t.search}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
            <option value="">{t.all} {t.categories}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}{c.parent ? ` › ${c.parent.name}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Products kanban */}
        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 56 }}>📦</div>
            <p style={{ marginTop: 8, fontSize: 16 }}>{t.noProducts}</p>
            {canEdit && <button onClick={openAdd} className="btn-primary" style={{ marginTop: 16 }}>+ {t.addProduct}</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', alignItems: 'flex-start' }}>
            {Object.entries(grouped).map(([catName, group]) => (
              <div key={catName} style={{
                minWidth: 270, maxWidth: 290, flex: '0 0 auto',
                background: '#fff', borderRadius: 14, overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #166534, #15803d)',
                  padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ fontSize: 24 }}>{group.emoji}</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{catName}</div>
                    <div style={{ color: '#86efac', fontSize: 11 }}>{group.products.length} items</div>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {group.products.map(p => (
                    <div key={p.id} style={{
                      border: '1px solid var(--gray-100)', borderRadius: 10, overflow: 'hidden',
                      background: p.isAvailable ? '#fafafa' : '#fffbfb'
                    }}>
                      {p.photoUrl && (
                        <img src={p.photoUrl} alt={p.name} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                      )}
                      <div style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ flex: 1, marginRight: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>{p.name}</div>
                            {p.nameTelugu && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{p.nameTelugu}</div>}
                          </div>
                          <span style={{
                            background: p.isAvailable ? '#dcfce7' : '#fee2e2',
                            color: p.isAvailable ? '#166534' : '#dc2626',
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap'
                          }}>
                            {p.isAvailable ? t.available : t.unavailable}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: canEdit ? 8 : 0 }}>
                          <span style={{ fontWeight: 800, fontSize: 16, color: '#166534' }}>₹{p.price}/{p.unit}</span>
                          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{t.stock}: {p.stock}</span>
                        </div>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => openEdit(p)} style={{
                              flex: 1, background: '#dbeafe', color: '#1d4ed8',
                              border: 'none', borderRadius: 7, padding: '5px', cursor: 'pointer', fontSize: 12, fontWeight: 600
                            }}>✏️ {t.edit}</button>
                            <button onClick={() => handleToggle(p)} style={{
                              flex: 1, background: p.isAvailable ? '#fef9c3' : '#dcfce7',
                              color: p.isAvailable ? '#854d0e' : '#166534',
                              border: 'none', borderRadius: 7, padding: '5px', cursor: 'pointer', fontSize: 12, fontWeight: 600
                            }}>
                              {p.isAvailable ? '🔴' : '🟢'}
                            </button>
                            {isOwner && (
                              <button onClick={() => setDeleteId(p.id)} style={{
                                background: '#fee2e2', color: '#dc2626',
                                border: 'none', borderRadius: 7, padding: '5px 8px',
                                cursor: 'pointer', fontSize: 12
                              }}>🗑️</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add/Edit Product Modal ── */}
      {modal !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>
                {modal === 'add' ? t.addProduct : t.editProduct}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label>{t.name} (EN) *</label><input value={form.name} onChange={e => {
                const val = e.target.value
                const suggested = suggestTelugu(val)
                setForm(f => ({ ...f, name: val, nameTelugu: f.nameTelugu || suggested }))
              }} placeholder="e.g. Fresh Goat Milk" /></div>
              <div>
                <label>{t.nameTelugu} {form.nameTelugu && form.nameTelugu === suggestTelugu(form.name) ? <span style={{fontSize:11,color:'#16a34a',marginLeft:4}}>✓ auto</span> : ''}</label>
                <input value={form.nameTelugu} onChange={e => setForm(f => ({...f, nameTelugu: e.target.value}))} placeholder="మేక పాలు" />
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.category} *</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))}>
                <option value="">-- {t.category} --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}{c.parent ? ` › ${c.parent.name}` : ''}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div><label>{t.price} (₹) *</label><input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="0" /></div>
              <div><label>{t.stock}</label><input type="number" value={form.stock} onChange={e => setForm(f => ({...f, stock: e.target.value}))} placeholder="0" /></div>
              <div><label>{t.minStock}</label><input type="number" value={form.minStock} onChange={e => setForm(f => ({...f, minStock: e.target.value}))} placeholder="0" /></div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.unit} *</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {UNITS.map(u => (
                  <button key={u} onClick={() => setForm(f => ({...f, unit: u}))} style={{
                    padding: '4px 12px', borderRadius: 20, border: '1px solid',
                    borderColor: form.unit === u ? '#166534' : 'var(--gray-200)',
                    background: form.unit === u ? '#166534' : '#fff',
                    color: form.unit === u ? '#fff' : 'var(--gray-700)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 500
                  }}>{u}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.description}</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Product description in English" style={{ resize: 'vertical' }} />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.photo}</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />
              {modal !== 'add' && modal?.photoUrl && !photo && (
                <div style={{ marginTop: 6 }}>
                  <img src={modal.photoUrl} alt="current" style={{ height: 60, borderRadius: 6, objectFit: 'cover' }} />
                  <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 8 }}>Current photo</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="avail" checked={form.isAvailable}
                onChange={e => setForm(f => ({...f, isAvailable: e.target.checked}))} style={{ width: 'auto' }} />
              <label htmlFor="avail" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>{t.available}</label>
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

      {/* ── Add/Edit Category Modal ── */}
      {catModal !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCatModal(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>
                {catModal === 'add' ? (t.addCategory || 'Add Category') : 'Edit Category'}
              </h2>
              <button onClick={() => setCatModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>{t.name} (EN) *</label>
                <input value={catForm.name} onChange={e => {
                  const val = e.target.value
                  const suggested = suggestTelugu(val)
                  setCatForm(f => ({ ...f, name: val, nameTelugu: f.nameTelugu || suggested }))
                }} placeholder="e.g. Dairy" />
              </div>
              <div>
                <label>{t.nameTelugu}</label>
                <input value={catForm.nameTelugu} onChange={e => setCatForm(f => ({...f, nameTelugu: e.target.value}))} placeholder="పాల ఉత్పత్తులు" />
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>Parent Category (optional)</label>
              <select value={catForm.parentId} onChange={e => setCatForm(f => ({...f, parentId: e.target.value}))}>
                <option value="">None (top-level)</option>
                {catTree.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.emoji || 'Emoji'}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {CAT_EMOJIS.map(e => (
                  <button key={e} onClick={() => setCatForm(f => ({...f, emoji: e}))} style={{
                    fontSize: 20, border: '2px solid',
                    borderColor: catForm.emoji === e ? '#166534' : 'transparent',
                    borderRadius: 8, padding: '3px 5px', cursor: 'pointer',
                    background: catForm.emoji === e ? '#f0fdf4' : 'transparent'
                  }}>{e}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setCatModal(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleSaveCat} disabled={savingCat || !catForm.name.trim()} className="btn-primary" style={{ flex: 1 }}>
                {savingCat ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Product confirm ── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t.deleteConfirm}</p>
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

      {/* ── Delete Category confirm ── */}
      {deleteCatId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>{t.deleteConfirm}</p>
            <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 6 }}>All products in this category will lose their category.</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => setDeleteCatId(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleDeleteCat} style={{
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
