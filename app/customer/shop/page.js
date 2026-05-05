'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPublicProducts, placeCustomerOrder } from '../../../lib/api'

export default function CustomerShopPage() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orderModal, setOrderModal] = useState(null)
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('customerToken')
    const data = localStorage.getItem('customerData')
    if (!token || !data) { router.replace('/customer'); return }
    setCustomer(JSON.parse(data))
    fetchProducts()
  }, [router])

  const fetchProducts = async () => {
    try {
      const res = await getPublicProducts()
      const available = (res.data.products || []).filter(p => p.isAvailable)
      setProducts(available)
      const seen = new Set()
      const cats = []
      available.forEach(p => {
        if (p.category && !seen.has(p.category.id)) { seen.add(p.category.id); cats.push(p.category) }
      })
      setCategories(cats)
    } finally { setLoading(false) }
  }

  const filtered = products
    .filter(p => !catFilter || p.category?.id?.toString() === catFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const openOrder = (product) => { setOrderModal(product); setQty('1'); setNote('') }

  const handlePlaceOrder = async () => {
    if (!qty || parseFloat(qty) <= 0) return
    setPlacing(true)
    try {
      await placeCustomerOrder({ productId: orderModal.id, quantity: parseFloat(qty), note: note.trim() || undefined })
      setSuccessMsg(`Order placed for ${orderModal.name}! We'll confirm soon.`)
      setOrderModal(null)
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order.')
    } finally { setPlacing(false) }
  }

  const total = orderModal ? (orderModal.price * (parseFloat(qty) || 0)).toFixed(2) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#166634', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#166534' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/customer/portal')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ← Back
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>🛒 Shop</div>
            <div style={{ fontSize: 11, color: '#86efac' }}>{products.length} products available</div>
          </div>
        </div>
        <span style={{ color: '#86efac', fontSize: 13 }}>Hi, <strong style={{ color: '#fff' }}>{customer?.name}</strong></span>
      </header>

      {/* Success banner */}
      {successMsg && (
        <div style={{ background: '#166534', color: '#fff', padding: '12px 2rem', fontSize: 14, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {successMsg}</span>
          <button onClick={() => router.push('/customer/portal')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
            View Orders →
          </button>
        </div>
      )}

      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2rem' }}>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="🔍 Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ id: '', name: 'All', emoji: '🔹' }, ...categories].map(cat => (
              <button key={cat.id} onClick={() => setCatFilter(cat.id?.toString() || '')} style={{
                padding: '7px 16px', borderRadius: 20, border: '1px solid',
                borderColor: catFilter === (cat.id?.toString() || '') ? '#166534' : '#e5e7eb',
                background: catFilter === (cat.id?.toString() || '') ? '#166534' : '#fff',
                color: catFilter === (cat.id?.toString() || '') ? '#fff' : '#6b7280',
                fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#9ca3af', fontSize: 18 }}>Loading products...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p style={{ fontSize: 16 }}>No products found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(product => (
              <div key={product.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                {product.photoUrl ? (
                  <img src={product.photoUrl} alt={product.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: 140, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
                    {product.category?.emoji || '📦'}
                  </div>
                )}
                <div style={{ padding: '1rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{product.name}</div>
                      {product.nameTelugu && <div style={{ fontSize: 12, color: '#9ca3af' }}>{product.nameTelugu}</div>}
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{product.category?.emoji} {product.category?.name}</div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>₹{product.price}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>per {product.unit}</div>
                    </div>
                  </div>
                  {product.description && (
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>{product.description}</p>
                  )}
                  <button
                    onClick={() => openOrder(product)}
                    style={{ width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' }}
                  >
                    🛒 Order Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Order Modal — centered on desktop */}
      {orderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
          onClick={() => setOrderModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 36 }}>{orderModal.category?.emoji || '📦'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>{orderModal.name}</div>
                  <div style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>₹{orderModal.price} / {orderModal.unit}</div>
                </div>
              </div>
              <button onClick={() => setOrderModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Quantity ({orderModal.unit})</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.1" step="0.1" autoFocus
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Note <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Any special instructions..."
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Total Amount</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Payment on delivery / UPI</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>₹{total}</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setOrderModal(null)} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button onClick={handlePlaceOrder} disabled={placing || !qty || parseFloat(qty) <= 0}
                className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: 15 }}>
                {placing ? 'Placing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
