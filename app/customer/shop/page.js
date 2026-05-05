'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPublicProducts, getPublicAnimals, placeCustomerOrder } from '../../../lib/api'

const UPI_ID = '8897132032@sbi'
const UPI_NAME = 'Kruthik Farm'
const UPI_APPS = [
  { label: 'GPay',    bg: '#fff',    color: '#4285F4', letter: 'G', scheme: (pa, amt) => `tez://upi/pay?pa=${pa}&pn=${encodeURIComponent(UPI_NAME)}&am=${amt}&cu=INR&tn=Order` },
  { label: 'PhonePe', bg: '#5f259f', color: '#fff',    letter: 'P', scheme: (pa, amt) => `phonepe://pay?pa=${pa}&pn=${encodeURIComponent(UPI_NAME)}&am=${amt}&cu=INR&tn=Order` },
  { label: 'Paytm',   bg: '#002970', color: '#00b9f5', letter: 'P', scheme: (pa, amt) => `paytmmp://upi/pay?pa=${pa}&pn=${encodeURIComponent(UPI_NAME)}&am=${amt}&cu=INR&tn=Order` },
  { label: 'BHIM',    bg: '#00a651', color: '#fff',    letter: 'B', scheme: (pa, amt) => `bhim://upi/pay?pa=${pa}&pn=${encodeURIComponent(UPI_NAME)}&am=${amt}&cu=INR&tn=Order` },
]

export default function CustomerShopPage() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [animals, setAnimals] = useState([])
  const [categories, setCategories] = useState([])
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modal state
  const [orderModal, setOrderModal] = useState(null)  // product
  const [step, setStep] = useState('qty')             // 'qty' | 'payment' | 'upi'
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
      const [prodRes, animalRes] = await Promise.all([
        getPublicProducts(),
        getPublicAnimals().catch(() => ({ data: { animals: [] } }))
      ])
      const available = (prodRes.data.products || []).filter(p => p.isAvailable)
      setProducts(available)
      setAnimals((animalRes.data.animals || []).filter(a => a.status === 'AVAILABLE'))
      const seen = new Set(); const cats = []
      available.forEach(p => { if (p.category && !seen.has(p.category.id)) { seen.add(p.category.id); cats.push(p.category) } })
      setCategories(cats)
    } finally { setLoading(false) }
  }

  const openOrder = (product) => { setOrderModal(product); setQty('1'); setNote(''); setStep('qty') }
  const closeOrder = () => { setOrderModal(null); setStep('qty') }

  const handlePlaceOrder = async (paymentMethod) => {
    setPlacing(true)
    const noteParts = [note.trim(), `Payment: ${paymentMethod}`].filter(Boolean).join(' | ')
    try {
      await placeCustomerOrder({ productId: orderModal.id, quantity: parseFloat(qty), note: noteParts })
      closeOrder()
      setSuccessMsg(`Order placed for ${orderModal.name}! We'll confirm soon.`)
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order.')
    } finally { setPlacing(false) }
  }

  const openUpiApp = (scheme) => {
    window.location.href = scheme(UPI_ID, total)
  }

  const filtered = products
    .filter(p => !catFilter || p.category?.id?.toString() === catFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const total = orderModal ? (orderModal.price * (parseFloat(qty) || 0)).toFixed(2) : '0.00'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#166534', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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

      {successMsg && (
        <div style={{ background: '#166534', color: '#fff', padding: '12px 2rem', fontSize: 14, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {successMsg}</span>
          <button onClick={() => router.push('/customer/portal')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>View Orders →</button>
        </div>
      )}

      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2rem' }}>
        {/* Search + filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="🔍 Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ id: '', name: 'All', emoji: '🔹' }, ...categories].map(cat => (
              <button key={cat.id} onClick={() => setCatFilter(cat.id?.toString() || '')} style={{
                padding: '7px 16px', borderRadius: 20, border: '1px solid',
                borderColor: catFilter === (cat.id?.toString() || '') ? '#166534' : '#e5e7eb',
                background: catFilter === (cat.id?.toString() || '') ? '#166534' : '#fff',
                color: catFilter === (cat.id?.toString() || '') ? '#fff' : '#6b7280',
                fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>{cat.emoji} {cat.name}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#9ca3af', fontSize: 18 }}>Loading products...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p>No products found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(product => (
              <div key={product.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                {product.photoUrl
                  ? <img src={product.photoUrl} alt={product.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: 140, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{product.category?.emoji || '📦'}</div>
                }
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
                  {product.description && <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>{product.description}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button onClick={() => openOrder(product)} style={{ flex: 1, background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      🛒 Order Now
                    </button>
                    <button onClick={() => window.open(`https://wa.me/918897132032?text=${encodeURIComponent(`Hi, I want to order: ${product.name} at ₹${product.price}/${product.unit}`)}`)}
                      style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 10, padding: '11px 14px', fontSize: 16, cursor: 'pointer' }}>
                      💬
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Animals section */}
        {animals.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#14532d', marginBottom: '1.25rem' }}>🐐 Livestock for Sale</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {animals.map(animal => (
                <div key={animal.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  {animal.photoUrl
                    ? <img src={animal.photoUrl} alt={animal.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: 120, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>
                        {animal.type === 'GOAT' ? '🐐' : animal.type === 'SHEEP' ? '🐑' : animal.type === 'CHICKEN' ? '🐓' : '🐔'}
                      </div>
                  }
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{animal.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                          {animal.type}{animal.breed ? ` · ${animal.breed}` : ''}{animal.weight ? ` · ${animal.weight}kg` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>₹{animal.price}</div>
                    </div>
                    {animal.description && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>{animal.description}</p>}
                    <button onClick={() => window.open(`https://wa.me/918897132032?text=${encodeURIComponent(`Hi, I'm interested in ${animal.name} (${animal.type}) at ₹${animal.price}`)}`)}
                      style={{ width: '100%', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      💬 Enquire on WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── ORDER MODAL ── */}
      {orderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
          onClick={closeOrder}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>

            {/* ── STEP 1: Quantity ── */}
            {step === 'qty' && (
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 36 }}>{orderModal.category?.emoji || '📦'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>{orderModal.name}</div>
                      <div style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>₹{orderModal.price} / {orderModal.unit}</div>
                    </div>
                  </div>
                  <button onClick={closeOrder} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Quantity ({orderModal.unit}) *</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.1" step="0.1" autoFocus style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Note <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Any special instructions..." style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Total</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#166534' }}>₹{total}</div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={closeOrder} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                  <button onClick={() => setStep('payment')} disabled={!qty || parseFloat(qty) <= 0}
                    className="btn-primary" style={{ flex: 2, padding: '12px', fontSize: 15 }}>
                    Checkout →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Payment method ── */}
            {step === 'payment' && (
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <button onClick={() => setStep('qty')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#166534' }}>←</button>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#14532d' }}>Checkout</div>
                </div>

                {/* Order summary */}
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>ORDER SUMMARY</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151', fontWeight: 600, marginBottom: 8 }}>
                    <span>{orderModal.name}</span>
                    <span>× {qty} {orderModal.unit}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Total</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>₹{total}</span>
                  </div>
                  {note && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>📝 {note}</div>}
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Choose Payment Method</div>

                {/* UPI option */}
                <button onClick={() => setStep('upi')} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  background: '#f0fdf4', border: '2px solid #166534', borderRadius: 14,
                  padding: '16px 20px', marginBottom: 12, cursor: 'pointer', textAlign: 'left'
                }}>
                  <span style={{ fontSize: 32 }}>📱</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#166534' }}>Pay via UPI</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Google Pay · PhonePe · Paytm · BHIM</div>
                  </div>
                  <span style={{ fontSize: 22, color: '#166534' }}>›</span>
                </button>

                {/* COD option */}
                <button onClick={() => handlePlaceOrder('Cash on Delivery')} disabled={placing} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 14,
                  padding: '16px 20px', cursor: placing ? 'default' : 'pointer', opacity: placing ? 0.6 : 1, textAlign: 'left'
                }}>
                  <span style={{ fontSize: 32 }}>💵</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Cash on Delivery</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Pay when you receive</div>
                  </div>
                  {placing ? <span style={{ fontSize: 14, color: '#9ca3af' }}>Placing...</span> : <span style={{ fontSize: 22, color: '#9ca3af' }}>›</span>}
                </button>
              </div>
            )}

            {/* ── STEP 3: UPI payment ── */}
            {step === 'upi' && (
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <button onClick={() => setStep('payment')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#166534' }}>←</button>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#14532d' }}>Pay via UPI</div>
                </div>

                {/* Amount box */}
                <div style={{ background: '#166534', borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#86efac', marginBottom: 4 }}>Amount to Pay</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#fff' }}>₹{total}</div>
                </div>

                {/* UPI ID */}
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px', textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>UPI ID</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: 0.5 }}>{UPI_ID}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{UPI_NAME} · Rajesh</div>
                </div>

                {/* UPI app buttons */}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Pay with</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {UPI_APPS.map(app => (
                    <button key={app.label} onClick={() => openUpiApp(app.scheme)} style={{
                      background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
                      padding: '14px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: app.bg, border: '1.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: app.color }}>
                        {app.letter}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{app.label}</span>
                    </button>
                  ))}
                </div>

                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 20 }}>
                  💡 Tap your UPI app to pay, then come back and click <strong>"I've Paid"</strong> to confirm your order.
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={closeOrder} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
                  <button onClick={() => handlePlaceOrder('UPI')} disabled={placing} className="btn-primary" style={{ flex: 2, padding: '12px', fontSize: 15 }}>
                    {placing ? 'Placing...' : "✅ I've Paid — Confirm Order"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
