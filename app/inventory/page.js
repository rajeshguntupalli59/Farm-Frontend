'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getInventory, addInventoryItem, updateInventoryStock, deleteInventoryItem } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const CAT_EMOJI = { FEED: '🌾', MEDICINE: '💊', EQUIPMENT: '🔧' }
const UNITS = ['KG', 'Litre', 'Bag', 'Bottle', 'Piece', 'Pack']

export default function InventoryPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()
  const canEdit = ['OWNER', 'MANAGER'].includes(user?.role)

  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [adjustItem, setAdjustItem] = useState(null)
  const [adjustAction, setAdjustAction] = useState('ADD')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [form, setForm] = useState({ name: '', category: 'FEED', unit: 'KG', quantity: '', minQuantity: '', costPerUnit: '', supplier: '', note: '', expiryDate: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    fetchInventory()
  }, [router])

  const fetchInventory = async () => {
    try { const r = await getInventory(); setItems(r.data.items || r.data.inventory || []) }
    catch { router.push('/login') }
    finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!form.name || !form.quantity || !form.costPerUnit || !form.minQuantity) return
    setSaving(true)
    try {
      await addInventoryItem({ ...form, quantity: parseFloat(form.quantity), minQuantity: parseFloat(form.minQuantity), costPerUnit: parseFloat(form.costPerUnit), expiryDate: form.expiryDate || null })
      setShowAdd(false)
      setForm({ name: '', category: 'FEED', unit: 'KG', quantity: '', minQuantity: '', costPerUnit: '', supplier: '', note: '', expiryDate: '' })
      fetchInventory()
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleAdjust = async () => {
    if (!adjustQty) return
    setSaving(true)
    try {
      await updateInventoryStock(adjustItem.id, { action: adjustAction, quantity: parseFloat(adjustQty), note: adjustNote })
      setAdjustItem(null); setAdjustQty(''); setAdjustNote('')
      fetchInventory()
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const filtered = items.filter(i => {
    const matchCat = !filter || i.category === filter
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const lowStock = filtered.filter(i => i.quantity <= i.minQuantity)

  if (loading) return <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}><span style={{ fontSize: 32 }}>🐐</span></div>

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>{t.inventory} ({filtered.length})</h1>
          {canEdit && <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Item</button>}
        </div>

        {lowStock.length > 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ color: '#92400e', fontWeight: 600, fontSize: 14 }}>
              {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low on stock
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input placeholder={`🔍 ${t.search}`} value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
          {['', 'FEED', 'MEDICINE', 'EQUIPMENT'].map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filter === cat ? '#166534' : 'var(--gray-200)',
              background: filter === cat ? '#166534' : '#fff',
              color: filter === cat ? '#fff' : 'var(--gray-600)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600
            }}>
              {cat ? `${CAT_EMOJI[cat]} ${t[cat.toLowerCase()] || cat}` : t.all}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 56 }}>🌾</div>
              <p style={{ marginTop: 8 }}>No inventory items</p>
            </div>
          ) : filtered.map(item => {
            const isLow = item.quantity <= item.minQuantity
            const expiry = item.expiryDate ? new Date(item.expiryDate) : null
            const daysToExpiry = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : null
            const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0
            const isExpired = daysToExpiry !== null && daysToExpiry <= 0
            return (
              <div key={item.id} style={{
                background: '#fff', borderRadius: 14, padding: '1rem 1.25rem',
                boxShadow: 'var(--shadow-sm)', border: `1px solid ${isLow ? '#fca5a5' : isExpiringSoon || isExpired ? '#fde68a' : 'var(--gray-100)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: canEdit ? 10 : 0 }}>
                  <span style={{ fontSize: 28 }}>{CAT_EMOJI[item.category]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {item.category}{item.supplier && ` • ${item.supplier}`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      Min: {item.minQuantity} {item.unit} • Cost: ₹{item.costPerUnit}/{item.unit}
                    </div>
                    {expiry && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: isExpired ? '#dc2626' : isExpiringSoon ? '#92400e' : 'var(--gray-400)', marginTop: 2 }}>
                        {isExpired ? '❌ Expired' : isExpiringSoon ? `⏰ Expires in ${daysToExpiry}d` : `📅 Exp: ${expiry.toLocaleDateString('en-IN')}`}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: isLow ? '#dc2626' : '#166534' }}>
                      {item.quantity}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{item.unit}</div>
                    {isLow && <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', borderRadius: 4, padding: '1px 6px', marginTop: 2 }}>LOW STOCK</div>}
                  </div>
                </div>

                {canEdit && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setAdjustItem(item); setAdjustAction('ADD'); setAdjustQty(''); setAdjustNote('') }} style={{
                      flex: 1, background: '#dcfce7', color: '#166534', border: 'none',
                      borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                    }}>+ Add Stock</button>
                    <button onClick={() => { setAdjustItem(item); setAdjustAction('REMOVE'); setAdjustQty(''); setAdjustNote('') }} style={{
                      flex: 1, background: '#fef9c3', color: '#854d0e', border: 'none',
                      borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                    }}>- Use Stock</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>🌾 Add Inventory Item</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div><label>{t.name} *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
              {['FEED','MEDICINE','EQUIPMENT'].map(cat => (
                <button key={cat} onClick={() => setForm(f => ({...f, category: cat}))} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: '1px solid',
                  borderColor: form.category === cat ? '#166534' : 'var(--gray-200)',
                  background: form.category === cat ? '#166534' : '#fff',
                  color: form.category === cat ? '#fff' : 'var(--gray-700)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}>{CAT_EMOJI[cat]} {cat}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {UNITS.map(u => (
                <button key={u} onClick={() => setForm(f => ({...f, unit: u}))} style={{
                  padding: '5px 12px', borderRadius: 20, border: '1px solid',
                  borderColor: form.unit === u ? '#166534' : 'var(--gray-200)',
                  background: form.unit === u ? '#166534' : '#fff',
                  color: form.unit === u ? '#fff' : 'var(--gray-700)',
                  cursor: 'pointer', fontSize: 12
                }}>{u}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div><label>Quantity *</label><input type="number" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} /></div>
              <div><label>Min Qty *</label><input type="number" value={form.minQuantity} onChange={e => setForm(f => ({...f, minQuantity: e.target.value}))} /></div>
              <div><label>Cost/unit (₹) *</label><input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({...f, costPerUnit: e.target.value}))} /></div>
            </div>
            <div style={{ marginTop: '0.75rem' }}><label>{t.supplier} ({t.optional})</label><input value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} /></div>
            <div style={{ marginTop: '0.75rem' }}><label>Expiry Date ({t.optional})</label><input type="date" value={form.expiryDate} onChange={e => setForm(f => ({...f, expiryDate: e.target.value}))} /></div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? t.saving : t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAdjustItem(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)', marginBottom: '0.75rem' }}>
              {adjustAction === 'ADD' ? '+ Add Stock' : '- Use Stock'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: '1rem' }}>
              {adjustItem.name} — current: {adjustItem.quantity} {adjustItem.unit}
            </p>
            <div><label>Quantity ({adjustItem.unit}) *</label><input type="number" autoFocus value={adjustQty} onChange={e => setAdjustQty(e.target.value)} /></div>
            <div style={{ marginTop: '0.75rem' }}><label>{t.note} ({t.optional})</label><input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setAdjustItem(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleAdjust} disabled={saving} style={{
                flex: 1, background: adjustAction === 'ADD' ? '#166534' : '#dc2626',
                color: '#fff', border: 'none', borderRadius: 8, padding: '0.625rem', cursor: 'pointer', fontWeight: 700
              }}>{saving ? '...' : adjustAction === 'ADD' ? 'Add' : 'Use'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
