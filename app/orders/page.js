'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getOrders, createOrder, updateOrder, getCustomers, getProducts, getInvoiceUrl, getUPIQR } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const STATUS_STYLE = {
  PENDING:   { bg: '#fef9c3', color: '#854d0e' },
  CONFIRMED: { bg: '#dbeafe', color: '#1d4ed8' },
  COMPLETED: { bg: '#dcfce7', color: '#166534' },
  CANCELLED: { bg: '#fee2e2', color: '#dc2626' },
}

export default function OrdersPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()

  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ customerId: '', productId: '', quantity: 1, totalPrice: '', paidAmount: 0, note: '' })
  const [saving, setSaving] = useState(false)
  const [waLink, setWaLink] = useState(null)
  const [upiModal, setUpiModal] = useState(null)
  const [upiLoading, setUpiLoading] = useState(false)
  const [payModal, setPayModal] = useState(null)    // order being updated
  const [payAmount, setPayAmount] = useState('')
  const [payingSaving, setPayingSaving] = useState(false)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    Promise.all([fetchOrders(), fetchCustomers(), fetchProducts()])
  }, [router])

  const fetchOrders = async () => {
    try {
      const res = await getOrders()
      setOrders(res.data.orders)
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }

  const fetchCustomers = async () => {
    try { const r = await getCustomers(); setCustomers(r.data.customers) } catch {}
  }

  const fetchProducts = async () => {
    try { const r = await getProducts(); setProducts(r.data.products) } catch {}
  }

  const handleCreate = async () => {
    if (!form.customerId || !form.productId || !form.totalPrice) return
    setSaving(true)
    try {
      await createOrder(form)
      setShowAdd(false)
      setForm({ customerId: '', productId: '', quantity: 1, totalPrice: '', paidAmount: 0, note: '' })
      fetchOrders()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create order')
    } finally { setSaving(false) }
  }

  const openPayModal = (o) => {
    const balance = (o.totalPrice || 0) - (o.paidAmount || 0)
    setPayAmount(balance.toString())
    setPayModal(o)
  }

  const handleMarkPaid = async () => {
    if (!payAmount || isNaN(payAmount)) return
    setPayingSaving(true)
    try {
      const newPaid = Math.min((payModal.paidAmount || 0) + parseFloat(payAmount), payModal.totalPrice)
      await updateOrder(payModal.id, { paidAmount: newPaid })
      setPayModal(null)
      fetchOrders()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment')
    } finally { setPayingSaving(false) }
  }

  const handleUpiPay = async (o) => {
    setUpiLoading(true)
    try {
      const res = await getUPIQR(o.id)
      setUpiModal(res.data)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate QR')
    } finally { setUpiLoading(false) }
  }

  const sendWhatsApp = (o) => {
    const balance = (o.totalPrice || 0) - (o.paidAmount || 0)
    const product = o.product?.name || 'your order'
    const msg = `Hi ${o.customer?.name}, your order for *${product}* (Qty: ${o.quantity}) is *${o.status}*.\nTotal: ₹${o.totalPrice} | Paid: ₹${o.paidAmount} | *Balance: ₹${balance}*\n\nPlease pay via UPI: *8897132032@sbi*\n\nThank you — Kruthik Farm 🐐`
    const phone = o.customer?.phone?.replace(/\D/g, '')
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleStatus = async (id, status) => {
    try {
      const res = await updateOrder(id, { status })
      fetchOrders()
      if (res.data.whatsappLink) {
        setWaLink(res.data.whatsappLink)
        setTimeout(() => setWaLink(null), 12000)
      }
    } catch {}
  }

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  if (loading) return <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}><span style={{ fontSize: 32 }}>🐐</span></div>

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1000, margin: '0 auto' }}>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            {t.orders} ({filtered.length})
          </h1>
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ {t.addOrder}</button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input placeholder={`🔍 ${t.search}`} value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          {['all','PENDING','CONFIRMED','COMPLETED','CANCELLED'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filter === s ? '#166534' : 'var(--gray-200)',
              background: filter === s ? '#166534' : '#fff',
              color: filter === s ? '#fff' : 'var(--gray-600)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600
            }}>{s === 'all' ? t.all : t[s.toLowerCase()]}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 48 }}>🛒</div>
              <p style={{ marginTop: 8 }}>{t.noOrders}</p>
            </div>
          ) : filtered.map(o => {
            const ss = STATUS_STYLE[o.status] || {}
            const balance = (o.totalPrice || 0) - (o.paidAmount || 0)
            return (
              <div key={o.id} style={{ background: '#fff', borderRadius: 14, padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {o.product?.category?.emoji} {o.product?.name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
                      👤 {o.customer?.name} • {o.customer?.phone}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      Qty: {o.quantity} {o.product?.unit} • #{String(o.id).padStart(4,'0')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{
                      background: ss.bg, color: ss.color,
                      padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700
                    }}>{t[o.status?.toLowerCase()] || o.status}</span>
                    <button
                      onClick={() => window.open(getInvoiceUrl(o.id), '_blank')}
                      title="Download Invoice PDF"
                      style={{
                        background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8,
                        padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        color: '#374151', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      📄 Invoice
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'flex', gap: '1rem', background: 'var(--gray-50)',
                  borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem'
                }}>
                  {[
                    { label: t.totalAmount, val: `₹${(o.totalPrice||0).toLocaleString('en-IN')}`, color: 'var(--gray-900)' },
                    { label: t.paidAmount, val: `₹${(o.paidAmount||0).toLocaleString('en-IN')}`, color: '#166534' },
                    { label: t.balance, val: `₹${balance.toLocaleString('en-IN')}`, color: balance > 0 ? '#dc2626' : '#166534' },
                  ].map(item => (
                    <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Payment + WhatsApp buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: ['PENDING','CONFIRMED'].includes(o.status) ? '0.5rem' : 0 }}>
                  {balance > 0 && (
                    <>
                      <button onClick={() => handleUpiPay(o)} disabled={upiLoading} style={{
                        flex: 1, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac',
                        borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                      }}>💳 UPI QR</button>
                      <button onClick={() => openPayModal(o)} style={{
                        flex: 1, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a',
                        borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                      }}>✅ Mark Paid</button>
                    </>
                  )}
                  <button onClick={() => sendWhatsApp(o)} style={{
                    flex: 1, background: '#dcfce7', color: '#15803d', border: 'none',
                    borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}>💬 WhatsApp</button>
                </div>

                {['PENDING','CONFIRMED'].includes(o.status) && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {o.status === 'PENDING' && (
                      <button onClick={() => handleStatus(o.id, 'CONFIRMED')} style={{
                        flex: 1, background: '#dbeafe', color: '#1d4ed8', border: 'none',
                        borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                      }}>{t.confirm}</button>
                    )}
                    <button onClick={() => handleStatus(o.id, 'COMPLETED')} style={{
                      flex: 1, background: '#dcfce7', color: '#166534', border: 'none',
                      borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                    }}>{t.completed}</button>
                    <button onClick={() => handleStatus(o.id, 'CANCELLED')} style={{
                      flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none',
                      borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600
                    }}>{t.cancelled}</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* WhatsApp Toast */}
      {waLink && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: '#166534', color: '#fff',
          borderRadius: 14, padding: '1rem 1.25rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 100, display: 'flex', gap: 12, alignItems: 'center',
          maxWidth: 320
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Order updated!</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Send message to customer?</div>
          </div>
          <a href={waLink} target="_blank" rel="noreferrer" style={{
            background: '#22c55e', color: '#fff', borderRadius: 8,
            padding: '8px 14px', fontWeight: 700, fontSize: 13, textDecoration: 'none',
            whiteSpace: 'nowrap'
          }}>💬 WhatsApp</a>
          <button onClick={() => setWaLink(null)} style={{
            background: 'none', border: 'none', color: '#86efac',
            cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0
          }}>✕</button>
        </div>
      )}

      {/* Mark Paid Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>✅ Record Payment</h2>
              <button onClick={() => setPayModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--green-50)', borderRadius: 10, padding: '0.75rem', marginBottom: '1rem', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: 'var(--green-900)' }}>{payModal.product?.name}</div>
              <div style={{ color: 'var(--gray-400)', marginTop: 2 }}>👤 {payModal.customer?.name} • #{String(payModal.id).padStart(4,'0')}</div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: 8 }}>
                <span>Total: <strong>₹{payModal.totalPrice?.toLocaleString('en-IN')}</strong></span>
                <span>Paid: <strong style={{ color: '#166534' }}>₹{payModal.paidAmount?.toLocaleString('en-IN')}</strong></span>
                <span>Balance: <strong style={{ color: '#dc2626' }}>₹{((payModal.totalPrice||0)-(payModal.paidAmount||0)).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>Amount Received (₹)</label>
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              style={{ marginTop: 6, fontSize: 20, fontWeight: 700, textAlign: 'center' }}
              autoFocus
            />
            <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
              Max: ₹{((payModal.totalPrice||0)-(payModal.paidAmount||0)).toLocaleString('en-IN')} (remaining balance)
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setPayModal(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleMarkPaid} disabled={payingSaving || !payAmount} className="btn-primary" style={{ flex: 1 }}>
                {payingSaving ? t.saving : '✅ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {upiModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setUpiModal(null)}>
          <div className="modal-box" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>💳 Pay via UPI</h2>
              <button onClick={() => setUpiModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--green-50)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>Amount Due</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>₹{upiModal.amount?.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>{upiModal.customerName} • Order #{String(upiModal.orderId).padStart(4,'0')}</div>
            </div>

            {upiModal.qrCode && (
              <img src={upiModal.qrCode} alt="UPI QR" style={{ width: 200, height: 200, borderRadius: 12, margin: '0 auto 1rem', display: 'block', border: '1px solid var(--gray-100)' }} />
            )}

            <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: '1rem' }}>
              UPI ID: <strong style={{ color: 'var(--green-800)' }}>{upiModal.upiId}</strong>
            </div>

            <a
              href={`upi://pay?pa=${upiModal.upiId}&pn=Kruthik+Farm&am=${upiModal.amount}&cu=INR&tn=${encodeURIComponent(upiModal.note || '')}`}
              style={{
                display: 'block', background: '#166534', color: '#fff',
                borderRadius: 10, padding: '0.75rem', fontWeight: 700,
                fontSize: 15, textDecoration: 'none', marginBottom: '0.5rem'
              }}
            >
              📲 Open UPI App
            </a>
            <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>Scan QR or tap button to pay via GPay / PhonePe / Paytm</p>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>🛒 {t.addOrder}</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div><label>{t.customer} *</label>
              <select value={form.customerId} onChange={e => setForm(f => ({...f, customerId: e.target.value}))}>
                <option value="">-- {t.customer} --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
              </select>
            </div>
            <div style={{ marginTop: '0.75rem' }}><label>{t.product} *</label>
              <select value={form.productId} onChange={e => {
                const p = products.find(p => p.id === parseInt(e.target.value))
                setForm(f => ({...f, productId: e.target.value, totalPrice: p ? (p.price * f.quantity).toString() : ''}))
              }}>
                <option value="">-- {t.product} --</option>
                {products.filter(p => p.isAvailable).map(p => (
                  <option key={p.id} value={p.id}>{p.category?.emoji} {p.name} — ₹{p.price}/{p.unit}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div><label>{t.quantity}</label><input type="number" min="1" value={form.quantity} onChange={e => {
                const qty = parseFloat(e.target.value) || 1
                const p = products.find(p => p.id === parseInt(form.productId))
                setForm(f => ({...f, quantity: qty, totalPrice: p ? (p.price * qty).toString() : f.totalPrice}))
              }} /></div>
              <div><label>{t.totalAmount} (₹) *</label><input type="number" value={form.totalPrice} onChange={e => setForm(f => ({...f, totalPrice: e.target.value}))} /></div>
              <div><label>{t.paidAmount} (₹)</label><input type="number" value={form.paidAmount} onChange={e => setForm(f => ({...f, paidAmount: e.target.value}))} /></div>
            </div>
            <div style={{ marginTop: '0.75rem' }}><label>{t.note} ({t.optional})</label>
              <input value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Any special instructions" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? t.saving : t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
