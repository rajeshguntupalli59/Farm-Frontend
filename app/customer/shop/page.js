'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import {
  getPublicProducts, getPublicAnimals, placeCustomerOrder,
  getSettings, getProductReviews, placeBooking
} from '../../../lib/api'

const TE = {
  shop: 'షాప్', products: 'ఉత్పత్తులు', animals: 'పశువులు',
  addToCart: 'కార్ట్‌కు జోడించు', orderNow: 'ఆర్డర్ చేయండి',
  cart: 'కార్ట్', checkout: 'చెక్‌అవుట్', total: 'మొత్తం',
  pay: 'చెల్లించండి', cod: 'డెలివరీపై నగదు', cancel: 'రద్దు చేయి',
  enquire: 'వాట్సాప్‌లో అడగండి', bookFestival: 'పండుగకు బుక్ చేయండి',
  note: 'గమనిక', qty: 'పరిమాణం', search: 'వెతకండి',
}
const EN = {
  shop: 'Shop', products: 'Products', animals: 'Livestock for Sale',
  addToCart: 'Add to Cart', orderNow: 'Order Now',
  cart: 'Cart', checkout: 'Checkout', total: 'Total',
  pay: 'Pay', cod: 'Cash on Delivery', cancel: 'Cancel',
  enquire: 'Enquire on WhatsApp', bookFestival: 'Book for Festival',
  note: 'Note', qty: 'Quantity', search: 'Search products...',
}

export default function CustomerShopPage() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [animals, setAnimals] = useState([])
  const [categories, setCategories] = useState([])
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({ upi_id: '', upi_name: 'Kruthik Farm', whatsapp_number: '918897132032' })
  const [lang, setLang] = useState('en')
  const [reviews, setReviews] = useState({})  // { productId: { average, total } }
  const [successMsg, setSuccessMsg] = useState('')

  // Cart
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [cartStep, setCartStep] = useState('items')  // 'items' | 'payment' | 'upi'
  const [placing, setPlacing] = useState(false)

  // Add-to-cart modal
  const [addModal, setAddModal] = useState(null)
  const [addQty, setAddQty] = useState('1')
  const [addNote, setAddNote] = useState('')

  // Booking modal
  const [bookModal, setBookModal] = useState(null)
  const [bookDate, setBookDate] = useState('')
  const [bookNotes, setBookNotes] = useState('')
  const [booking, setBooking] = useState(false)

  const t = lang === 'te' ? TE : EN

  useEffect(() => {
    const token = localStorage.getItem('customerToken')
    const data = localStorage.getItem('customerData')
    if (!token || !data) { router.replace('/customer'); return }
    setCustomer(JSON.parse(data))
    const savedLang = localStorage.getItem('lang')
    if (savedLang) setLang(savedLang)
    fetchAll()
  }, [router])

  const fetchAll = async () => {
    try {
      const [prodRes, animalRes, settingsRes] = await Promise.all([
        getPublicProducts(),
        getPublicAnimals().catch(() => ({ data: { animals: [] } })),
        getSettings().catch(() => ({ data: {} }))
      ])
      if (settingsRes.data) setSettings(s => ({ ...s, ...settingsRes.data }))
      const available = (prodRes.data.products || []).filter(p => p.isAvailable)
      setProducts(available)
      setAnimals((animalRes.data.animals || []).filter(a => a.status === 'AVAILABLE'))
      const seen = new Set(); const cats = []
      available.forEach(p => { if (p.category && !seen.has(p.category.id)) { seen.add(p.category.id); cats.push(p.category) } })
      setCategories(cats)
      // fetch ratings for all products in parallel
      const ratings = {}
      await Promise.all(available.map(p =>
        getProductReviews(p.id).then(r => { ratings[p.id] = r.data }).catch(() => {})
      ))
      setReviews(ratings)
    } finally { setLoading(false) }
  }

  // Cart helpers
  const addToCart = () => {
    const qty = parseFloat(addQty)
    if (!qty || qty <= 0) return
    setCart(c => {
      const existing = c.find(i => i.product.id === addModal.id)
      if (existing) return c.map(i => i.product.id === addModal.id ? { ...i, qty: i.qty + qty } : i)
      return [...c, { product: addModal, qty, note: addNote }]
    })
    setAddModal(null)
    setAddQty('1'); setAddNote('')
    setCartOpen(true)
  }
  const removeFromCart = (id) => setCart(c => c.filter(i => i.product.id !== id))
  const updateQty = (id, qty) => setCart(c => c.map(i => i.product.id === id ? { ...i, qty: parseFloat(qty) || 0 } : i))
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0).toFixed(2)
  const cartCount = cart.length

  const handleCartCheckout = async (paymentMethod) => {
    setPlacing(true)
    try {
      await Promise.all(cart.map(item =>
        placeCustomerOrder({
          productId: item.product.id,
          quantity: item.qty,
          note: [item.note, `Payment: ${paymentMethod}`].filter(Boolean).join(' | ')
        })
      ))
      setCart([]); setCartOpen(false); setCartStep('items')
      setSuccessMsg(`${cartCount} order${cartCount > 1 ? 's' : ''} placed! We'll confirm soon.`)
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place orders')
    } finally { setPlacing(false) }
  }

  const handleBook = async () => {
    if (!bookDate) return alert('Please select the event date')
    setBooking(true)
    try {
      await placeBooking({ animalId: bookModal.id, eventDate: bookDate, notes: bookNotes })
      setBookModal(null); setBookDate(''); setBookNotes('')
      setSuccessMsg(`Booking request sent for ${bookModal.name}! We'll confirm soon.`)
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place booking')
    } finally { setBooking(false) }
  }

  const Stars = ({ avg, total }) => {
    if (!total) return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <span style={{ color: '#f59e0b', fontSize: 13 }}>{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{avg} ({total})</span>
      </div>
    )
  }

  const filtered = products
    .filter(p => !catFilter || p.category?.id?.toString() === catFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.nameTelugu?.includes(search))

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#166534', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/customer/portal')} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Back</button>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>🛒 {t.shop}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Telugu toggle */}
          <button onClick={() => { const next = lang === 'en' ? 'te' : 'en'; setLang(next); localStorage.setItem('lang', next) }} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {lang === 'en' ? 'తె' : 'EN'}
          </button>
          {/* Cart button */}
          <button onClick={() => setCartOpen(true)} style={{ position: 'relative', background: cartCount > 0 ? '#fff' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: cartCount > 0 ? '#166534' : '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            🛒 {t.cart}
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -8, right: -8, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      {successMsg && (
        <div style={{ background: '#166534', color: '#fff', padding: '12px 1.5rem', fontSize: 14, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {successMsg}</span>
          <button onClick={() => router.push('/customer/portal')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>View Orders →</button>
        </div>
      )}

      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '1.5rem' }}>
        {/* Search + filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder={`🔍 ${t.search}`} value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
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
          <div style={{ textAlign: 'center', padding: '5rem', color: '#9ca3af', fontSize: 18 }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(product => {
              const rv = reviews[product.id]
              return (
                <div key={product.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                  {product.photoUrl
                    ? <img src={product.photoUrl} alt={product.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: 140, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{product.category?.emoji || '📦'}</div>
                  }
                  <div style={{ padding: '1rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{lang === 'te' && product.nameTelugu ? product.nameTelugu : product.name}</div>
                        {lang === 'en' && product.nameTelugu && <div style={{ fontSize: 12, color: '#9ca3af' }}>{product.nameTelugu}</div>}
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{product.category?.emoji} {product.category?.name}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: 8 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>₹{product.price}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>per {product.unit}</div>
                      </div>
                    </div>
                    {rv && <Stars avg={rv.average} total={rv.total} />}
                    {(lang === 'te' ? product.descTelugu : product.description) && (
                      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 10, flex: 1 }}>{lang === 'te' ? product.descTelugu : product.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      <button onClick={() => { setAddModal(product); setAddQty('1'); setAddNote('') }} style={{ flex: 1, background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        🛒 {t.addToCart}
                      </button>
                      <button onClick={() => window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`Hi, I want to order: ${product.name} at ₹${product.price}/${product.unit}`)}`)}
                        style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 10, padding: '11px 14px', fontSize: 16, cursor: 'pointer' }}>
                        💬
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Animals section */}
        {animals.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#14532d', marginBottom: '1.25rem' }}>🐐 {t.animals}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {animals.map(animal => (
                <div key={animal.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  {animal.photoUrl
                    ? <img src={animal.photoUrl} alt={animal.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: 120, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>
                        {animal.type === 'GOAT' ? '🐐' : animal.type === 'SHEEP' ? '🐑' : '🐓'}
                      </div>
                  }
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{animal.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{animal.type}{animal.breed ? ` · ${animal.breed}` : ''}{animal.weight ? ` · ${animal.weight}kg` : ''}</div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>₹{animal.price}</div>
                    </div>
                    {animal.description && <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>{animal.description}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setBookModal(animal); setBookDate(''); setBookNotes('') }}
                        style={{ flex: 1, background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        📅 {t.bookFestival}
                      </button>
                      <button onClick={() => window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`Hi, I'm interested in ${animal.name} (${animal.type}) at ₹${animal.price}`)}`)}
                        style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 16, cursor: 'pointer' }}>
                        💬
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── ADD TO CART MODAL ── */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }} onClick={() => setAddModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{addModal.category?.emoji || '📦'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{addModal.name}</div>
                  <div style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>₹{addModal.price} / {addModal.unit}</div>
                </div>
              </div>
              <button onClick={() => setAddModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t.qty} ({addModal.unit})</label>
              <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} min="0.1" step="0.1" autoFocus style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t.note} <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="Any special instructions..." style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{t.total}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>₹{(addModal.price * (parseFloat(addQty) || 0)).toFixed(2)}</span>
            </div>
            <button onClick={addToCart} disabled={!addQty || parseFloat(addQty) <= 0} style={{ width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              🛒 {t.addToCart}
            </button>
          </div>
        </div>
      )}

      {/* ── BOOKING MODAL ── */}
      {bookModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }} onClick={() => setBookModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>📅 Book for Festival</div>
                <div style={{ fontSize: 13, color: '#166534', marginTop: 2 }}>{bookModal.name} · ₹{bookModal.price}</div>
              </div>
              <button onClick={() => setBookModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 18 }}>
              🎉 Reserve this animal for Eid, Sankranti or any festival. We'll confirm and discuss deposit with you.
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Event Date *</label>
              <input type="date" value={bookDate} onChange={e => setBookDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Notes <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={bookNotes} onChange={e => setBookNotes(e.target.value)} placeholder="e.g. Eid, need delivery to Hyderabad..." style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleBook} disabled={booking || !bookDate} style={{ width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: booking || !bookDate ? 0.6 : 1 }}>
              {booking ? 'Sending...' : '📅 Confirm Booking Request'}
            </button>
          </div>
        </div>
      )}

      {/* ── CART PANEL ── */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => { setCartOpen(false); setCartStep('items') }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 480, background: '#fff', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>

            {/* Cart header */}
            <div style={{ background: '#166534', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>🛒 {t.cart} ({cartCount})</div>
              <button onClick={() => { setCartOpen(false); setCartStep('items') }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            {/* ── CART: Items ── */}
            {cartStep === 'items' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                      <p>Your cart is empty</p>
                    </div>
                  ) : cart.map(item => (
                    <div key={item.product.id} style={{ background: '#f9fafb', borderRadius: 12, padding: '1rem', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 28 }}>{item.product.category?.emoji || '📦'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.product.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>₹{item.product.price} / {item.product.unit}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <button onClick={() => updateQty(item.product.id, Math.max(0.1, item.qty - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>−</button>
                          <input type="number" value={item.qty} onChange={e => updateQty(item.product.id, e.target.value)} min="0.1" step="0.1" style={{ width: 60, textAlign: 'center', padding: '4px 8px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
                          <button onClick={() => updateQty(item.product.id, item.qty + 1)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>+</button>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#166534' }}>₹{(item.product.price * item.qty).toFixed(0)}</div>
                        <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', marginTop: 6 }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{t.total}</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>₹{cartTotal}</span>
                    </div>
                    <button onClick={() => setCartStep('payment')} style={{ width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                      {t.checkout} →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── CART: Payment ── */}
            {cartStep === 'payment' && (
              <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => setCartStep('items')} style={{ background: 'none', border: 'none', color: '#166534', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 20 }}>← Back to cart</button>
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: '1rem', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, marginBottom: 10 }}>ORDER SUMMARY</div>
                  {cart.map(item => (
                    <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 6 }}>
                      <span>{item.product.name} × {item.qty} {item.product.unit}</span>
                      <span style={{ fontWeight: 600 }}>₹{(item.product.price * item.qty).toFixed(0)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>{t.total}</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>₹{cartTotal}</span>
                  </div>
                </div>
                <button onClick={() => setCartStep('upi')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, background: '#f0fdf4', border: '2px solid #166534', borderRadius: 14, padding: '16px 20px', marginBottom: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 28 }}>📱</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#166534' }}>Pay via UPI</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Google Pay · PhonePe · Paytm</div>
                  </div>
                  <span style={{ fontSize: 22, color: '#166534' }}>›</span>
                </button>
                <button onClick={() => handleCartCheckout('Cash on Delivery')} disabled={placing} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 14, padding: '16px 20px', cursor: placing ? 'default' : 'pointer', opacity: placing ? 0.6 : 1, textAlign: 'left' }}>
                  <span style={{ fontSize: 28 }}>💵</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>{t.cod}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Pay when you receive</div>
                  </div>
                  {placing ? <span style={{ fontSize: 13, color: '#9ca3af' }}>Placing...</span> : <span style={{ fontSize: 22, color: '#9ca3af' }}>›</span>}
                </button>
              </div>
            )}

            {/* ── CART: UPI QR ── */}
            {cartStep === 'upi' && (
              <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => setCartStep('payment')} style={{ background: 'none', border: 'none', color: '#166534', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 20 }}>← Back</button>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.5rem', marginBottom: 16 }}>
                  <div style={{ background: '#fff', padding: 10, borderRadius: 12, border: '1px solid #e5e7eb' }}>
                    <QRCode value={`upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.upi_name)}&am=${cartTotal}&cu=INR&tn=Order`} size={130} style={{ display: 'block' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>SCAN & PAY</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#166534', marginBottom: 8 }}>₹{cartTotal}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>UPI ID</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{settings.upi_id}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{settings.upi_name}</div>
                  </div>
                </div>
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 16 }}>
                  💡 Scan with any UPI app, pay, then click confirm.
                </div>
                <button onClick={() => handleCartCheckout('UPI')} disabled={placing} style={{ width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: placing ? 0.6 : 1 }}>
                  {placing ? 'Placing...' : "✅ I've Paid — Confirm Order"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
