'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSettings, updateSettings } from '../../lib/api'
import { getUser } from '../../lib/auth'
import Navbar from '../components/Navbar'

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState({ business_phone: '', whatsapp_number: '', upi_id: '', upi_name: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) { router.replace('/'); return }
    if (user.role !== 'OWNER') { router.replace('/dashboard'); return }
    getSettings().then(res => {
      const d = res.data
      setForm({ business_phone: d.business_phone, whatsapp_number: d.whatsapp_number, upi_id: d.upi_id, upi_name: d.upi_name })
    }).finally(() => setLoading(false))
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Failed to save settings')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      <main style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>⚙️ Settings</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Update your contact and payment info. Changes apply immediately across the entire app.</p>

        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Phone */}
          <div>
            <label style={lbl}>📞 Business Phone Number</label>
            <p style={hint}>Used for call button and contact info shown to customers</p>
            <input style={inp} value={form.business_phone}
              onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))}
              placeholder="e.g. 8897132032" />
          </div>

          {/* WhatsApp */}
          <div>
            <label style={lbl}>💬 WhatsApp Number</label>
            <p style={hint}>Include country code (91 for India) — no + sign, no spaces</p>
            <input style={inp} value={form.whatsapp_number}
              onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              placeholder="e.g. 918897132032" />
          </div>

          {/* UPI ID */}
          <div>
            <label style={lbl}>💳 UPI ID</label>
            <p style={hint}>Your UPI ID for customer payments — must be active</p>
            <input style={inp} value={form.upi_id}
              onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))}
              placeholder="e.g. 8897132032@sbi" />
          </div>

          {/* UPI Name */}
          <div>
            <label style={lbl}>🏷️ UPI Display Name</label>
            <p style={hint}>Name shown on customer's UPI payment screen</p>
            <input style={inp} value={form.upi_name}
              onChange={e => setForm(f => ({ ...f, upi_name: e.target.value }))}
              placeholder="e.g. Kruthik Farm" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
            <button onClick={handleSave} disabled={saving} style={{
              background: saving ? '#9ca3af' : '#166534', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer'
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span style={{ color: '#166534', fontWeight: 600, fontSize: 14 }}>✓ Saved successfully</span>}
          </div>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '1rem 1.25rem', marginTop: '1.5rem' }}>
          <p style={{ fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>⚠️ Before changing UPI ID</p>
          <p style={{ color: '#78350f', fontSize: 13, margin: 0 }}>Make sure the new UPI ID is active and verified in your bank app before saving. Customers won't be able to pay if the UPI ID is wrong.</p>
        </div>
      </main>
    </div>
  )
}

const lbl = { fontSize: 14, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }
const hint = { fontSize: 12, color: '#9ca3af', margin: '0 0 8px' }
const inp = { width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' }
