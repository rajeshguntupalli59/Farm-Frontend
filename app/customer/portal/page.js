'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyOrders } from '../../../lib/api'

const STATUS = {
  PENDING:   { label: 'Pending',   color: '#92400e', bg: '#fef3c7' },
  CONFIRMED: { label: 'Confirmed', color: '#1d4ed8', bg: '#dbeafe' },
  COMPLETED: { label: 'Completed', color: '#166534', bg: '#dcfce7' },
  CANCELLED: { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2' },
}

export default function CustomerPortalPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    const token = localStorage.getItem('customerToken')
    const data = localStorage.getItem('customerData')
    if (!token || !data) { router.replace('/customer'); return }
    setCustomer(JSON.parse(data))
    fetchOrders()
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

  const whatsApp = (order) => {
    const msg = encodeURIComponent(`Hi, I'm ${customer?.name} (${customer?.phone}). Query about order #${order.id} for ${order.product?.name}. Status: ${order.status}`)
    window.open(`https://wa.me/918897132032?text=${msg}`)
  }

  if (!customer) return null

  const totalSpent = orders.reduce((s, o) => s + (o.paidAmount || 0), 0)
  const totalBalance = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + Math.max(0, (o.totalPrice || 0) - (o.paidAmount || 0)), 0)
  const filteredOrders = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: '#166534', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🐐</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>PashuBazaar</div>
            <div style={{ fontSize: 11, color: '#86efac' }}>Customer Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#86efac', fontSize: 13 }}>Hi, <strong style={{ color: '#fff' }}>{customer.name}</strong></span>
          <button onClick={() => router.push('/customer/shop')} style={{
            background: '#fff', color: '#166534', border: 'none',
            borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}>
            🛒 Shop Now
          </button>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer'
          }}>
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

          {/* Quick actions */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Quick Actions</div>
            {[
              { icon: '🛒', label: 'Shop Products', sub: 'Browse & order', onClick: () => router.push('/customer/shop'), green: true },
              { icon: '💬', label: 'WhatsApp Us', sub: 'Chat for support', onClick: () => window.open(`https://wa.me/918897132032?text=${encodeURIComponent(`Hi, I'm ${customer.name} (${customer.phone}). Need help.`)}`) },
              { icon: '📞', label: 'Call Us', sub: '8897132032', onClick: () => window.open('tel:8897132032') },
            ].map(a => (
              <button key={a.label} onClick={a.onClick} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                background: a.green ? '#f0fdf4' : '#f9fafb',
                border: `1px solid ${a.green ? '#bbf7d0' : '#e5e7eb'}`,
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Your Orders ({orders.length})</h2>
            <button onClick={fetchOrders} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#166534', fontWeight: 600 }}>↻ Refresh</button>
          </div>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '6px 16px', borderRadius: 20, border: '1px solid',
                borderColor: filter === s ? '#166534' : '#e5e7eb',
                background: filter === s ? '#166534' : '#fff',
                color: filter === s ? '#fff' : '#6b7280',
                fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}>{s === 'ALL' ? `All (${orders.length})` : STATUS[s]?.label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '4rem', textAlign: 'center', color: '#9ca3af', border: '1px solid #e5e7eb' }}>Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <p style={{ color: '#374151', fontWeight: 600, fontSize: 16 }}>No orders yet</p>
              <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>Browse our products and place your first order</p>
              <button onClick={() => router.push('/customer/shop')} style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                🛒 Shop Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
              {filteredOrders.map(order => {
                const s = STATUS[order.status] || STATUS.PENDING
                const balance = Math.max(0, (order.totalPrice || 0) - (order.paidAmount || 0))
                return (
                  <div key={order.id} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 28 }}>{order.product?.category?.emoji || '📦'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{order.product?.name}</div>
                          {order.product?.nameTelugu && <div style={{ fontSize: 12, color: '#9ca3af' }}>{order.product.nameTelugu}</div>}
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
                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                        📝 {order.note}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <button onClick={() => whatsApp(order)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        💬 Query
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
