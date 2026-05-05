'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getShipments, createShipment, updateShipment, getDeliveryPartners, getOrders } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const STATUS_STYLE = {
  PREPARING:        { bg: '#fef3c7', color: '#d97706' },
  DISPATCHED:       { bg: '#dbeafe', color: '#1d4ed8' },
  OUT_FOR_DELIVERY: { bg: '#ffedd5', color: '#ea580c' },
  DELIVERED:        { bg: '#dcfce7', color: '#166534' },
  FAILED:           { bg: '#fee2e2', color: '#dc2626' },
  RETURNED:         { bg: '#f3f4f6', color: '#374151' },
}

const STATUS_KEYS = ['ALL', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED']

const STATUS_LABEL = {
  ALL: 'All',
  PREPARING: 'Preparing',
  DISPATCHED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  RETURNED: 'Returned',
}

const emptyForm = {
  orderId: '',
  deliveryAddress: '',
  pincode: '',
  paymentType: 'PREPAID',
  codAmount: 0,
  deliveryPartnerId: '',
  estimatedDelivery: '',
}

export default function DeliveryPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()

  const [shipments, setShipments] = useState([])
  const [partners, setPartners] = useState([])
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [showAssign, setShowAssign] = useState(null) // shipment object
  const [assignForm, setAssignForm] = useState({ deliveryPartnerId: '', notes: '' })
  const [assigning, setAssigning] = useState(false)

  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (user && !['OWNER', 'MANAGER'].includes(user.role)) { router.push('/dashboard'); return }
    loadAll()
  }, [router])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sRes, pRes, oRes] = await Promise.all([
        getShipments(),
        getDeliveryPartners(),
        getOrders({ status: 'CONFIRMED' }),
      ])
      setShipments(sRes.data.shipments || sRes.data || [])
      setPartners(pRes.data.partners || pRes.data || [])
      // Only orders that don't already have a shipment
      const allOrders = oRes.data.orders || oRes.data || []
      const shippedOrderIds = new Set((sRes.data.shipments || sRes.data || []).map(s => s.orderId))
      setOrders(allOrders.filter(o => !shippedOrderIds.has(o.id)))
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.orderId || !form.deliveryAddress) return
    setSaving(true)
    try {
      await createShipment({
        ...form,
        orderId: parseInt(form.orderId),
        codAmount: parseFloat(form.codAmount) || 0,
        deliveryPartnerId: form.deliveryPartnerId ? parseInt(form.deliveryPartnerId) : undefined,
      })
      setShowCreate(false)
      setForm(emptyForm)
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create shipment')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignDispatch = async () => {
    if (!showAssign) return
    setAssigning(true)
    try {
      await updateShipment(showAssign.id, {
        status: 'DISPATCHED',
        deliveryPartnerId: assignForm.deliveryPartnerId ? parseInt(assignForm.deliveryPartnerId) : undefined,
        notes: assignForm.notes,
      })
      setShowAssign(null)
      setAssignForm({ deliveryPartnerId: '', notes: '' })
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch')
    } finally {
      setAssigning(false)
    }
  }

  const handleStatusUpdate = async (id, status, extra = {}) => {
    try {
      await updateShipment(id, { status, ...extra })
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed')
    }
  }

  const copyTracking = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const whatsappShare = (phone, code) => {
    const msg = encodeURIComponent(
      `Your order tracking code is ${code}. Track: https://kruthikfarm.in/track/${code}`
    )
    const clean = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
  }

  const filtered = filter === 'ALL'
    ? shipments
    : shipments.filter(s => s.status === filter)

  const selectedOrder = orders.find(o => o.id === parseInt(form.orderId))

  if (loading) return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Navbar />
      <span style={{ fontSize: 40 }}>🚚</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            🚚 {t.shipments} ({filtered.length})
          </h1>
          <a href="/delivery/partners" style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gray-200)',
            background: '#fff', color: 'var(--gray-600)', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6
          }}>🧑‍🚀 {t.deliveryPartners}</a>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ {t.addShipment}</button>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {STATUS_KEYS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: filter === s ? '#166534' : 'var(--gray-200)',
              background: filter === s ? '#166534' : '#fff',
              color: filter === s ? '#fff' : 'var(--gray-600)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap'
            }}>{STATUS_LABEL[s]}</button>
          ))}
        </div>

        {/* Shipment list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: 48 }}>📦</div>
              <p style={{ marginTop: 8 }}>{t.noShipments}</p>
            </div>
          ) : filtered.map(s => {
            const ss = STATUS_STYLE[s.status] || {}
            const isCOD = s.paymentType === 'COD'
            return (
              <div key={s.id} style={{ background: '#fff', borderRadius: 14, padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)' }}>

                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {/* Tracking code */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        onClick={() => copyTracking(s.trackingCode)}
                        title="Click to copy"
                        style={{
                          fontFamily: 'monospace', fontWeight: 800, fontSize: 15,
                          color: '#166534', cursor: 'pointer', letterSpacing: 1,
                          background: '#f0fdf4', padding: '2px 8px', borderRadius: 6,
                          border: '1px solid #bbf7d0'
                        }}
                      >
                        {s.trackingCode}
                      </span>
                      {copied === s.trackingCode && (
                        <span style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Copied!</span>
                      )}
                    </div>

                    {/* Customer */}
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>
                      👤 {s.order?.customer?.name || '—'}
                      {s.order?.customer?.phone && (
                        <a href={`tel:${s.order.customer.phone}`} style={{ marginLeft: 8, fontSize: 12, color: '#1d4ed8', textDecoration: 'none' }}>
                          📞 {s.order.customer.phone}
                        </a>
                      )}
                    </div>

                    {/* Product */}
                    <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
                      {s.order?.product?.name || '—'} × {s.order?.quantity || '—'} {s.order?.product?.unit || ''}
                    </div>

                    {/* Address */}
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                      📍 {s.deliveryAddress}{s.pincode ? ` — ${s.pincode}` : ''}
                    </div>

                    {/* Est. delivery */}
                    {s.estimatedDelivery && (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                        🗓 {t.estimatedDelivery}: {new Date(s.estimatedDelivery).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>

                  {/* Right badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ background: ss.bg, color: ss.color, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {STATUS_LABEL[s.status] || s.status}
                    </span>

                    <span style={{
                      background: isCOD ? '#fef3c7' : '#dcfce7',
                      color: isCOD ? '#d97706' : '#166534',
                      padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700
                    }}>
                      {isCOD ? 'COD' : 'PREPAID'}
                    </span>

                    {isCOD && (
                      <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                        ₹{(s.codAmount || 0).toLocaleString('en-IN')} •{' '}
                        {s.codCollected ? (
                          <span style={{ color: '#166534', fontWeight: 700 }}>Collected ✓</span>
                        ) : (
                          <span style={{ color: '#d97706', fontWeight: 700 }}>Pending ⚠</span>
                        )}
                      </span>
                    )}

                    {/* Partner */}
                    <span style={{ fontSize: 12, color: s.deliveryPartner ? '#166534' : 'var(--gray-400)', fontWeight: 600 }}>
                      🧑‍🚀 {s.deliveryPartner?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {s.status === 'PREPARING' && (
                    <button
                      onClick={() => { setShowAssign(s); setAssignForm({ deliveryPartnerId: s.deliveryPartnerId || '', notes: '' }) }}
                      style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      🚀 Assign & Dispatch
                    </button>
                  )}
                  {s.status === 'DISPATCHED' && (
                    <button
                      onClick={() => handleStatusUpdate(s.id, 'OUT_FOR_DELIVERY')}
                      style={{ background: '#ffedd5', color: '#ea580c', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      🛵 Mark Out for Delivery
                    </button>
                  )}
                  {s.status === 'OUT_FOR_DELIVERY' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(s.id, 'DELIVERED')}
                        style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        ✅ {t.markDelivered}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(s.id, 'FAILED')}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        ❌ Mark Failed
                      </button>
                    </>
                  )}
                  {s.status === 'DELIVERED' && isCOD && !s.codCollected && (
                    <button
                      onClick={() => handleStatusUpdate(s.id, 'DELIVERED', { codCollected: true })}
                      style={{ background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      💰 {t.collectCod}
                    </button>
                  )}

                  {/* WhatsApp share */}
                  {s.order?.customer?.phone && (
                    <button
                      onClick={() => whatsappShare(s.order.customer.phone, s.trackingCode)}
                      style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 'auto' }}
                    >
                      💬 {t.whatsappTrack}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Shipment Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>📦 {t.addShipment}</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div>
              <label>Order (CONFIRMED) *</label>
              <select
                value={form.orderId}
                onChange={e => {
                  const o = orders.find(o => o.id === parseInt(e.target.value))
                  const balance = o ? (o.totalPrice || 0) - (o.paidAmount || 0) : 0
                  setForm(f => ({
                    ...f,
                    orderId: e.target.value,
                    deliveryAddress: o?.customer?.address || f.deliveryAddress,
                    codAmount: balance > 0 ? balance : 0,
                    paymentType: balance > 0 ? 'COD' : 'PREPAID',
                  }))
                }}
              >
                <option value="">-- Select Order --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    #{String(o.id).padStart(4, '0')} — {o.customer?.name} / {o.product?.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.deliveryAddress} *</label>
              <input
                value={form.deliveryAddress}
                onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                placeholder="Full delivery address"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label>{t.pincode} *</label>
                <input
                  value={form.pincode}
                  onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                  placeholder="500001"
                  maxLength={6}
                />
              </div>
              <div>
                <label>{t.estimatedDelivery}</label>
                <input
                  type="date"
                  value={form.estimatedDelivery}
                  onChange={e => setForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.paymentType}</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                {['COD', 'PREPAID'].map(pt => (
                  <button
                    key={pt}
                    onClick={() => setForm(f => ({ ...f, paymentType: pt }))}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      border: '2px solid',
                      borderColor: form.paymentType === pt ? (pt === 'COD' ? '#d97706' : '#166534') : 'var(--gray-200)',
                      background: form.paymentType === pt ? (pt === 'COD' ? '#fef3c7' : '#dcfce7') : '#fff',
                      color: form.paymentType === pt ? (pt === 'COD' ? '#d97706' : '#166534') : 'var(--gray-600)',
                    }}
                  >{pt}</button>
                ))}
              </div>
            </div>

            {form.paymentType === 'COD' && (
              <div style={{ marginTop: '0.75rem' }}>
                <label>{t.codAmount} (₹)</label>
                <input
                  type="number"
                  value={form.codAmount}
                  onChange={e => setForm(f => ({ ...f, codAmount: e.target.value }))}
                />
              </div>
            )}

            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.assignPartner} ({t.optional})</label>
              <select
                value={form.deliveryPartnerId}
                onChange={e => setForm(f => ({ ...f, deliveryPartnerId: e.target.value }))}
              >
                <option value="">-- Assign Later --</option>
                {partners.filter(p => p.isAvailable).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.vehicle})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowCreate(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.orderId || !form.deliveryAddress || !form.pincode}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign & Dispatch Modal */}
      {showAssign && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssign(null)}>
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>🚀 Assign & Dispatch</h2>
              <button onClick={() => setShowAssign(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{showAssign.trackingCode}</div>
              <div style={{ color: 'var(--gray-400)', marginTop: 2 }}>
                {showAssign.order?.customer?.name} — {showAssign.order?.product?.name}
              </div>
            </div>

            <div>
              <label>{t.assignPartner} *</label>
              <select
                value={assignForm.deliveryPartnerId}
                onChange={e => setAssignForm(f => ({ ...f, deliveryPartnerId: e.target.value }))}
              >
                <option value="">-- Select Partner --</option>
                {partners.filter(p => p.isAvailable).map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.vehicle} ({p.phone})</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <label>Delivery Notes ({t.optional})</label>
              <input
                value={assignForm.notes}
                onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any instructions for delivery partner..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAssign(null)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button
                onClick={handleAssignDispatch}
                disabled={assigning || !assignForm.deliveryPartnerId}
                style={{
                  flex: 1, background: '#1d4ed8', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px', cursor: 'pointer', fontSize: 14, fontWeight: 700
                }}
              >
                {assigning ? 'Dispatching...' : '🚀 Dispatch Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
