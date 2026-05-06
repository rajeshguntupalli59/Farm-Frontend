'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllBookings, updateBooking } from '../../lib/api'

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
const STATUS_STYLE = {
  PENDING:   { bg: '#fef3c7', color: '#92400e' },
  CONFIRMED: { bg: '#dbeafe', color: '#1d4ed8' },
  COMPLETED: { bg: '#dcfce7', color: '#166534' },
  CANCELLED: { bg: '#fee2e2', color: '#dc2626' },
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ status: '', depositAmount: '', paidDeposit: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.replace('/login'); return }
    fetchBookings()
  }, [router])

  const fetchBookings = async () => {
    try {
      const res = await getAllBookings()
      setBookings(res.data.bookings || [])
    } catch {
    } finally { setLoading(false) }
  }

  const openEdit = (b) => {
    setEditModal(b)
    setEditForm({
      status: b.status,
      depositAmount: b.depositAmount?.toString() || '0',
      paidDeposit: b.paidDeposit?.toString() || '0',
      notes: b.notes || '',
    })
  }

  const handleSave = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      const res = await updateBooking(editModal.id, {
        status: editForm.status,
        depositAmount: parseFloat(editForm.depositAmount) || 0,
        paidDeposit: parseFloat(editForm.paidDeposit) || 0,
        notes: editForm.notes,
      })
      setBookings(prev => prev.map(b => b.id === editModal.id ? res.data.booking : b))
      setEditModal(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const filteredBookings = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter)

  const counts = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: bookings.filter(b => b.status === s).length }), {})

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer', color: '#374151' }}>← Back</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>📅 Animal Bookings</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              {bookings.length} total · {counts.PENDING || 0} pending · {counts.CONFIRMED || 0} confirmed
            </p>
          </div>
          <button onClick={fetchBookings} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#166534', fontWeight: 600 }}>↻ Refresh</button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[{ key: 'ALL', label: `All (${bookings.length})` }, ...STATUS_OPTIONS.map(s => ({ key: s, label: `${s[0] + s.slice(1).toLowerCase()} (${counts[s] || 0})` }))].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '7px 16px', borderRadius: 20, border: '1px solid',
              borderColor: filter === f.key ? '#166534' : '#e5e7eb',
              background: filter === f.key ? '#166534' : '#fff',
              color: filter === f.key ? '#fff' : '#6b7280',
              fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <p style={{ color: '#9ca3af' }}>No bookings found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredBookings.map(b => {
              const st = STATUS_STYLE[b.status] || STATUS_STYLE.PENDING
              const eventDate = new Date(b.eventDate)
              const isUpcoming = eventDate >= new Date()
              const daysUntil = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <div key={b.id} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      {/* Animal + customer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 28 }}>🐐</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                            {b.animal?.name}
                            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>({b.animal?.type}{b.animal?.breed ? ` · ${b.animal.breed}` : ''})</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>
                            👤 {b.customer?.name || 'Customer'} · 📱 {b.customer?.phone}
                          </div>
                        </div>
                      </div>

                      {/* Event date + urgency */}
                      <div style={{ display: 'flex', gap: 12, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#374151' }}>
                          📅 {eventDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {isUpcoming && b.status !== 'CANCELLED' && (
                          <span style={{
                            background: daysUntil <= 7 ? '#fef3c7' : '#f0fdf4',
                            color: daysUntil <= 7 ? '#92400e' : '#166534',
                            fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 10
                          }}>
                            {daysUntil <= 0 ? '⚠️ Today!' : `${daysUntil}d away`}
                          </span>
                        )}
                      </div>

                      {/* Deposit */}
                      {(b.depositAmount > 0 || b.paidDeposit > 0) && (
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                          <span>Deposit required: <strong>₹{b.depositAmount}</strong></span>
                          <span style={{ color: b.paidDeposit >= b.depositAmount ? '#166534' : '#dc2626' }}>
                            Paid: <strong>₹{b.paidDeposit}</strong>
                          </span>
                        </div>
                      )}

                      {b.notes && <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>📝 {b.notes}</div>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{b.status}</span>
                      <button onClick={() => openEdit(b)} style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
                        borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}>
                        ✏️ Update
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#14532d' }}>Update Booking</div>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: 14, color: '#374151', marginBottom: 20, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10 }}>
              🐐 {editModal.animal?.name} · 👤 {editModal.customer?.name}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff' }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Deposit Required (₹)</label>
                <input
                  type="number"
                  value={editForm.depositAmount}
                  onChange={e => setEditForm(f => ({ ...f, depositAmount: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Deposit Paid (₹)</label>
              <input
                type="number"
                value={editForm.paidDeposit}
                onChange={e => setEditForm(f => ({ ...f, paidDeposit: e.target.value }))}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditModal(null)} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: '#166534', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
