'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getMyOrders, cancelMyOrder, placeCustomerOrder, getSettings, getMyBookings, cancelBooking, addReview } from '../../../lib/api'

const STATUS = {
  PENDING:    { label: 'Pending',    color: '#92400e', bg: '#fef3c7' },
  CONFIRMED:  { label: 'Confirmed',  color: '#1d4ed8', bg: '#dbeafe' },
  PROCESSING: { label: 'Processing', color: '#6b21a8', bg: '#f3e8ff' },
  SHIPPED:    { label: 'Shipped',    color: '#1e3a8a', bg: '#e0e7ff' },
  COMPLETED:  { label: 'Completed',  color: '#166534', bg: '#dcfce7' },
  CANCELLED:  { label: 'Cancelled',  color: '#dc2626', bg: '#fee2e2' },
}

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED']
const HISTORY_STATUSES = ['COMPLETED', 'CANCELLED']

const PROGRESS_STEPS = [
  { key: 'PENDING',    label: 'Placed' },
  { key: 'CONFIRMED',  label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Preparing' },
  { key: 'SHIPPED',    label: 'Shipped' },
  { key: 'COMPLETED',  label: 'Delivered' },
]

function OrderProgressBar({ status }) {
  if (status === 'CANCELLED') return (
    <div style={{ background: '#fee2e2', borderRadius: 8, padding: '6px 12px', marginBottom: 12, textAlign: 'center', fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
      ✕ Order Cancelled
    </div>
  )
  const currentIdx = PROGRESS_STEPS.findIndex(s => s.key === status)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
      {PROGRESS_STEPS.map((step, idx) => {
        const done = idx <= currentIdx
        const isLast = idx === PROGRESS_STEPS.length - 1
        return (
          <div key={step.key} style={{ flex: isLast ? 0 : 1, display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? '#166534' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800 }}>
                {done ? '✓' : ''}
              </div>
              <span style={{ fontSize: 10, color: done ? '#166534' : '#9ca3af', marginTop: 4, fontWeight: done ? 700 : 400, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {!isLast && <div style={{ flex: 1, height: 2, background: idx < currentIdx ? '#166534' : '#e5e7eb', marginTop: 11, minWidth: 16 }} />}
          </div>
        )
      })}
    </div>
  )
}

export default function CustomerPortalPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [search, setSearch] = useState('')
  const [settings, setSettings] = useState({ whatsapp_number: '918897132032', business_phone: '8897132032' })
  const [lang, setLang] = useState('en')
  const [bookings, setBookings] = useState([])
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('customerToken')
    const data = localStorage.getItem('customerData')
    if (!token || !data) { router.replace('/customer'); return }
    setCustomer(JSON.parse(data))
    fetchOrders()
    getSettings().then(r => setSettings(s => ({ ...s, ...r.data }))).catch(() => {})
    getMyBookings().then(r => setBookings(r.data.bookings || [])).catch(() => {})
    const savedLang = localStorage.getItem('lang')
    if (savedLang) setLang(savedLang)
  }, [router])

  const fetchOrders = async () => {
    try {
      const res = await getMyOrders()
      setOrders(res.data.orders || [])
    } catch {
      const data = localStorage.getItem('customerData')
      if (data) setOrders(JSON.parse(data).orders || [])
    } finally { setLoading(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('customerToken')
    localStorage.removeItem('customerData')
    router.push('/')
  }

  const handleCancel = async (orderId) => {
    if (!confirm('Cancel this order?')) return
    try { await cancelMyOrder(orderId); fetchOrders() }
    catch (err) { alert(err.response?.data?.message || 'Failed to cancel order') }
  }

  const toggleLang = () => {
    const next = lang === 'en' ? 'te' : 'en'
    setLang(next); localStorage.setItem('lang', next)
  }

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return
    try {
      await cancelBooking(bookingId)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
    } catch (err) { alert(err.response?.data?.message || 'Failed to cancel booking') }
  }

  const handleSubmitReview = async () => {
    if (!reviewModal) return
    setSubmittingReview(true)
    try {
      await addReview({ productId: reviewModal.product.id, rating: reviewRating, comment: reviewComment })
      setReviewModal(null); setReviewRating(5); setReviewComment('')
      alert('✅ Review submitted! Thank you.')
    } catch (err) { alert(err.response?.data?.message || 'Failed to submit review') }
    finally { setSubmittingReview(false) }
  }

  const handleReorder = async (order) => {
    if (!confirm(`Reorder ${order.quantity} ${order.product?.unit} of ${order.product?.name}?`)) return
    try {
      await placeCustomerOrder({ productId: order.product.id, quantity: order.quantity, note: 'Repeat order' })
      alert(`✅ Reorder placed for ${order.product?.name}!`)
      fetchOrders()
    } catch (err) { alert(err.response?.data?.message || 'Failed to reorder.') }
  }

  const whatsApp = (msg) => window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(msg)}`)

  // Derived values
  const totalSpent = orders.reduce((s, o) => s + (o.paidAmount || 0), 0)
  const totalBalance = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + Math.max(0, (o.totalPrice || 0) - (o.paidAmount || 0)), 0)
  const pendingBalanceOrders = orders.filter(o => o.status !== 'CANCELLED' && (o.totalPrice || 0) - (o.paidAmount || 0) > 0)

  // Buy Again — products with 2+ completed orders, sorted by frequency
  const buyAgainProducts = useMemo(() => {
    const freq = {}
    orders.filter(o => o.status === 'COMPLETED' && o.product?.id).forEach(o => {
      const id = o.product.id
      if (!freq[id]) freq[id] = { product: o.product, count: 0, lastOrder: o }
      freq[id].count++
    })
    return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [orders])

  // Filtered + searched orders
  const tabFiltered = orders.filter(o =>
    tab === 'active' ? ACTIVE_STATUSES.includes(o.status) :
    tab === 'history' ? HISTORY_STATUSES.includes(o.status) : true
  )
  const filteredOrders = search.trim()
    ? tabFiltered.filter(o => o.product?.name?.toLowerCase().includes(search.toLowerCase()))
    : tabFiltered

  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length
  const historyCount = orders.filter(o => HISTORY_STATUSES.includes(o.status)).length

  if (!customer) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#166534', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🐐</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>KRUTHIK FARM</div>
            <div style={{ fontSize: 11, color: '#86efac' }}>Customer Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#86efac', fontSize: 13 }}>Hi, <strong style={{ color: '#fff' }}>{customer.name}</strong></span>
          <button onClick={toggleLang} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            {lang === 'en' ? 'తె' : 'EN'}
          </button>
          <button onClick={() => router.push('/customer/shop')} style={{ background: '#fff', color: '#166534', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            🛒 Shop Now
          </button>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>

        {/* Left sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Profile card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#166534', flexShrink: 0 }}>
                {customer.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#111827' }}>{customer.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>📱 {customer.phone}</div>
                {customer.address && <div style={{ fontSize: 13, color: '#6b7280' }}>📍 {customer.address}</div>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              {[
                { val: orders.length, label: 'Orders' },
                { val: `₹${totalSpent.toLocaleString('en-IN')}`, label: 'Paid' },
                { val: `₹${totalBalance.toLocaleString('en-IN')}`, label: 'Balance', red: totalBalance > 0 },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.red ? '#dc2626' : '#166534' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pay All Balance */}
          {totalBalance > 0 && (
            <div style={{ background: '#fff7ed', borderRadius: 16, padding: '1.25rem', border: '1px solid #fed7aa', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>💳 Outstanding Balance</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626', marginBottom: 12 }}>₹{totalBalance.toLocaleString('en-IN')}</div>
              <button
                onClick={() => whatsApp(`Hi, I'm ${customer.name} (${customer.phone}). I'd like to clear my total outstanding balance of ₹${totalBalance.toLocaleString('en-IN')}. Please share payment details.`)}
                style={{ width: '100%', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                💬 Pay All Balance →
              </button>
              {/* Balance breakdown */}
              <div style={{ borderTop: '1px solid #fed7aa', paddingTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Breakdown</div>
                {pendingBalanceOrders.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 5 }}>
                    <span style={{ color: '#6b7280' }}>{o.product?.name || 'Order #' + o.id}</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>₹{((o.totalPrice || 0) - (o.paidAmount || 0)).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Quick Actions</div>
            {[
              { icon: '🛒', label: 'Shop Products', sub: 'Browse & order', onClick: () => router.push('/customer/shop'), green: true },
              { icon: '💬', label: 'WhatsApp Us', sub: 'Chat for support', onClick: () => whatsApp(`Hi, I'm ${customer.name} (${customer.phone}). Need help.`) },
              { icon: '📞', label: 'Call Us', sub: settings.business_phone, onClick: () => window.open(`tel:${settings.business_phone}`) },
            ].map(a => (
              <button key={a.label} onClick={a.onClick} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                background: a.green ? '#f0fdf4' : '#f9fafb', border: `1px solid ${a.green ? '#bbf7d0' : '#e5e7eb'}`,
                borderRadius: 10, padding: '10px 12px', cursor: 'pointer', marginBottom: 8, textAlign: 'left'
              }}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: a.green ? '#166534' : '#374151' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right — orders */}
        <div>

          {/* Buy Again */}
          {buyAgainProducts.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 12 }}>🔁 Buy Again</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {buyAgainProducts.map(({ product, count, lastOrder }) => (
                  <button key={product.id}
                    onClick={() => handleReorder(lastOrder)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 22 }}>{product.category?.emoji || '📦'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#14532d' }}>{product.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>Ordered {count}×</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Header + search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Your Orders ({orders.length})</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search orders..."
                style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '7px 14px', fontSize: 13, outline: 'none', width: 200 }}
              />
              <button onClick={fetchOrders} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#166534', fontWeight: 600 }}>↻</button>
            </div>
          </div>

          {/* Tabs: Active / History / All */}
          <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '2px solid #f3f4f6' }}>
            {[
              { key: 'active', label: `Active`, count: activeCount, color: '#166534' },
              { key: 'history', label: `History`, count: historyCount, color: '#6b7280' },
              { key: 'all', label: `All`, count: orders.length, color: '#374151' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: 'none', border: 'none',
                borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
                color: tab === t.key ? t.color : '#9ca3af',
                marginBottom: -2,
              }}>
                {t.label} <span style={{ fontSize: 12, fontWeight: 600, background: tab === t.key ? '#f0fdf4' : '#f3f4f6', borderRadius: 10, padding: '2px 7px', marginLeft: 4 }}>{t.count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '4rem', textAlign: 'center', color: '#9ca3af', border: '1px solid #e5e7eb' }}>Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <p style={{ color: '#374151', fontWeight: 600, fontSize: 16 }}>{search ? 'No orders match your search' : 'No orders here'}</p>
              {!search && <button onClick={() => router.push('/customer/shop')} style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 16 }}>🛒 Shop Now</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
              {filteredOrders.map(order => {
                const s = STATUS[order.status] || STATUS.PENDING
                const balance = Math.max(0, (order.totalPrice || 0) - (order.paidAmount || 0))
                return (
                  <div key={order.id} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: `1px solid ${order.status === 'CANCELLED' ? '#fecaca' : order.status === 'COMPLETED' ? '#bbf7d0' : '#e5e7eb'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <OrderProgressBar status={order.status} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 28 }}>{order.product?.category?.emoji || '📦'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                            {lang === 'te' && order.product?.nameTelugu ? order.product.nameTelugu : order.product?.name}
                          </div>
                          {lang === 'te' && order.product?.nameTelugu && (
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>{order.product.name}</div>
                          )}
                        </div>
                      </div>
                      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 13, marginBottom: 14 }}>
                      {[
                        { l: 'Quantity', v: `${order.quantity} ${order.product?.unit}` },
                        { l: 'Total', v: `₹${(order.totalPrice || 0).toLocaleString('en-IN')}` },
                        { l: 'Paid', v: `₹${(order.paidAmount || 0).toLocaleString('en-IN')}`, green: true },
                        { l: 'Balance', v: balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '✓ Cleared', red: balance > 0, green: balance === 0 },
                      ].map(f => (
                        <div key={f.l}>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{f.l}</div>
                          <div style={{ fontWeight: 600, color: f.red ? '#dc2626' : f.green ? '#166534' : '#111827' }}>{f.v}</div>
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6b7280', marginBottom: 12 }}>📝 {order.note}</div>
                    )}

                    <div style={{ paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => whatsApp(`Hi, I'm ${customer?.name} (${customer?.phone}). Query about order #${order.id} for ${order.product?.name}. Status: ${order.status}`)} style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          💬 Query
                        </button>
                        {order.shipment?.trackingCode && (
                          <button onClick={() => router.push(`/track/${order.shipment.trackingCode}`)} style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            🚚 Track
                          </button>
                        )}
                        {['PENDING', 'CONFIRMED'].includes(order.status) && (
                          <button onClick={() => handleCancel(order.id)} style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            ✕ Cancel
                          </button>
                        )}
                        {order.status === 'COMPLETED' && (
                          <button onClick={() => handleReorder(order)} style={{ flex: 1, background: '#ede9fe', border: '1px solid #c4b5fd', color: '#6b21a8', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            🔁 Reorder
                          </button>
                        )}
                        {order.status === 'COMPLETED' && order.product?.id && (
                          <button onClick={() => { setReviewModal(order); setReviewRating(5); setReviewComment('') }} style={{ flex: 1, background: '#fef9c3', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            ⭐ Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* My Bookings section */}
      {bookings.length > 0 && (
        <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 2rem 2rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>📅 My Animal Bookings ({bookings.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {bookings.map(b => {
              const bStatus = {
                PENDING:   { label: 'Pending',   bg: '#fef3c7', color: '#92400e' },
                CONFIRMED: { label: 'Confirmed', bg: '#dbeafe', color: '#1d4ed8' },
                COMPLETED: { label: 'Completed', bg: '#dcfce7', color: '#166534' },
                CANCELLED: { label: 'Cancelled', bg: '#fee2e2', color: '#dc2626' },
              }[b.status] || { label: b.status, bg: '#f3f4f6', color: '#374151' }
              return (
                <div key={b.id} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>🐐 {b.animal?.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{b.animal?.type}{b.animal?.breed ? ` · ${b.animal.breed}` : ''}</div>
                    </div>
                    <span style={{ background: bStatus.bg, color: bStatus.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{bStatus.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
                    📅 Event: <strong>{new Date(b.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  {b.notes && <div style={{ fontSize: 12, color: '#6b7280', background: '#f9fafb', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>📝 {b.notes}</div>}
                  {['PENDING', 'CONFIRMED'].includes(b.status) && (
                    <button onClick={() => handleCancelBooking(b.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✕ Cancel Booking
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#14532d' }}>⭐ Leave a Review</div>
              <button onClick={() => setReviewModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>{reviewModal.product?.category?.emoji || '📦'} {reviewModal.product?.name}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Your Rating *</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setReviewRating(n)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', opacity: n <= reviewRating ? 1 : 0.3 }}>⭐</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Comment (optional)</div>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="How was your experience?" rows={3}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setReviewModal(null)} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={handleSubmitReview} disabled={submittingReview} style={{ flex: 2, background: '#166534', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff', opacity: submittingReview ? 0.6 : 1 }}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
