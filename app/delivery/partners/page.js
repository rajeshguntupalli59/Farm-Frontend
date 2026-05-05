'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDeliveryPartners, addDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner } from '../../../lib/api'
import { getToken, getUser } from '../../../lib/auth'
import { useLang } from '../../../lib/lang'
import Navbar from '../../components/Navbar'

const VEHICLE_OPTIONS = [
  { value: 'CYCLE', label: '🚲 Cycle' },
  { value: 'BIKE',  label: '🛵 Bike' },
  { value: 'AUTO',  label: '🛺 Auto' },
  { value: 'VAN',   label: '🚐 Van' },
]

const VEHICLE_ICON = { CYCLE: '🚲', BIKE: '🛵', AUTO: '🛺', VAN: '🚐' }

const emptyForm = {
  name: '',
  phone: '',
  vehicle: 'BIKE',
  areas: '',
  isAvailable: true,
}

export default function DeliveryPartnersPage() {
  const router = useRouter()
  const { t } = useLang()
  const user = getUser()

  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null) // partner object or null
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [areasInput, setAreasInput] = useState('')

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (user && !['OWNER', 'MANAGER'].includes(user.role)) { router.push('/dashboard'); return }
    loadPartners()
  }, [router])

  const loadPartners = async () => {
    setLoading(true)
    try {
      const res = await getDeliveryPartners()
      setPartners(res.data.partners || res.data || [])
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setAreasInput('')
    setShowModal(true)
  }

  const openEdit = (partner) => {
    setEditing(partner)
    setForm({
      name: partner.name || '',
      phone: partner.phone || '',
      vehicle: partner.vehicle || 'BIKE',
      areas: '',
      isAvailable: partner.isAvailable !== false,
    })
    setAreasInput(Array.isArray(partner.areas) ? partner.areas.join(', ') : (partner.areas || ''))
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone) return
    setSaving(true)
    const areas = areasInput
      .split(',')
      .map(a => a.trim())
      .filter(Boolean)
    try {
      if (editing) {
        await updateDeliveryPartner(editing.id, { ...form, areas })
      } else {
        await addDeliveryPartner({ ...form, areas })
      }
      setShowModal(false)
      setEditing(null)
      setForm(emptyForm)
      setAreasInput('')
      loadPartners()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save partner')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(t.deleteConfirm)) return
    try {
      await deleteDeliveryPartner(id)
      loadPartners()
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed')
    }
  }

  const handleToggleAvail = async (partner) => {
    try {
      await updateDeliveryPartner(partner.id, { isAvailable: !partner.isAvailable })
      loadPartners()
    } catch {}
  }

  if (loading) return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Navbar />
      <span style={{ fontSize: 40 }}>🧑‍🚀</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <a href="/delivery" style={{
            color: 'var(--gray-400)', fontSize: 13, textDecoration: 'none', fontWeight: 600
          }}>← {t.shipments}</a>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            🧑‍🚀 {t.deliveryPartners} ({partners.length})
          </h1>
          <button onClick={openAdd} className="btn-primary">+ {t.addPartner}</button>
        </div>

        {/* Partner grid */}
        {partners.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 48 }}>🧑‍🚀</div>
            <p style={{ marginTop: 8 }}>{t.noPartners}</p>
            <button onClick={openAdd} className="btn-primary" style={{ marginTop: '1rem' }}>+ {t.addPartner}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {partners.map(p => {
              const areas = Array.isArray(p.areas) ? p.areas : []
              return (
                <div key={p.id} style={{
                  background: '#fff', borderRadius: 14, padding: '1rem 1.25rem',
                  boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)',
                  display: 'flex', flexDirection: 'column', gap: '0.6rem'
                }}>
                  {/* Name + availability */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{p.name}</div>
                      <a href={`tel:${p.phone}`} style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                        📞 {p.phone}
                      </a>
                    </div>
                    <button
                      onClick={() => handleToggleAvail(p)}
                      title={p.isAvailable ? 'Click to set off duty' : 'Click to set available'}
                      style={{
                        padding: '4px 12px', borderRadius: 20, border: 'none',
                        background: p.isAvailable ? '#dcfce7' : '#fee2e2',
                        color: p.isAvailable ? '#166534' : '#dc2626',
                        cursor: 'pointer', fontSize: 12, fontWeight: 700
                      }}
                    >
                      {p.isAvailable ? '● Available' : '● Off Duty'}
                    </button>
                  </div>

                  {/* Vehicle */}
                  <div>
                    <span style={{
                      background: '#f3f4f6', color: '#374151',
                      padding: '3px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600
                    }}>
                      {VEHICLE_ICON[p.vehicle] || '🚗'} {p.vehicle}
                    </span>
                  </div>

                  {/* Service areas */}
                  {areas.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {areas.map(area => (
                        <span key={area} style={{
                          background: '#f0fdf4', color: '#166534',
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                          border: '1px solid #bbf7d0'
                        }}>{area}</span>
                      ))}
                    </div>
                  )}

                  {/* Shipments count */}
                  {p._count?.shipments !== undefined && (
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      📦 {p._count.shipments} shipment{p._count.shipments !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                    <button
                      onClick={() => openEdit(p)}
                      style={{ flex: 1, background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      ✏️ {t.edit}
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      🗑 {t.delete}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>
                🧑‍🚀 {editing ? t.edit : t.addPartner}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label>{t.name} *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Partner name"
                />
              </div>
              <div>
                <label>{t.phone} *</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="9876543210"
                />
              </div>
            </div>

            {/* Vehicle selector */}
            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.vehicle}</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
                {VEHICLE_OPTIONS.map(v => (
                  <button
                    key={v.value}
                    onClick={() => setForm(f => ({ ...f, vehicle: v.value }))}
                    style={{
                      flex: '1 1 80px', padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                      fontWeight: 700, fontSize: 13, border: '2px solid',
                      borderColor: form.vehicle === v.value ? '#166534' : 'var(--gray-200)',
                      background: form.vehicle === v.value ? '#f0fdf4' : '#fff',
                      color: form.vehicle === v.value ? '#166534' : 'var(--gray-600)',
                    }}
                  >{v.label}</button>
                ))}
              </div>
            </div>

            {/* Service areas */}
            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.areas} (comma-separated)</label>
              <input
                value={areasInput}
                onChange={e => setAreasInput(e.target.value)}
                placeholder="Hyderabad, Secunderabad, Kukatpally"
              />
              {/* Tag preview */}
              {areasInput.trim() && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {areasInput.split(',').map(a => a.trim()).filter(Boolean).map(area => (
                    <span key={area} style={{
                      background: '#f0fdf4', color: '#166534',
                      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      border: '1px solid #bbf7d0'
                    }}>{area}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Availability toggle */}
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ marginBottom: 0 }}>Availability</label>
              <button
                onClick={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))}
                style={{
                  padding: '6px 18px', borderRadius: 20, border: 'none',
                  background: form.isAvailable ? '#dcfce7' : '#fee2e2',
                  color: form.isAvailable ? '#166534' : '#dc2626',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700
                }}
              >
                {form.isAvailable ? '● Available' : '● Off Duty'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.phone}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
