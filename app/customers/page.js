'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCustomers, addCustomer, getOrders } from '../../lib/api'
import { getToken } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

export default function CustomersPage() {
  const router = useRouter()
  const { t } = useLang()
  const [customers, setCustomers] = useState([])
  const [balanceMap, setBalanceMap] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    fetchAll()
  }, [router])

  const fetchAll = async () => {
    try {
      const [custRes, ordersRes] = await Promise.all([
        getCustomers(),
        getOrders(),
      ])
      setCustomers(custRes.data.customers)

      // Compute outstanding balance per customer from orders
      const map = {}
      const orders = ordersRes.data.orders || []
      orders.forEach(o => {
        if (o.status !== 'CANCELLED' && o.status !== 'COMPLETED') {
          const due = (o.totalPrice || 0) - (o.paidAmount || 0)
          if (due > 0) {
            map[o.customerId] = (map[o.customerId] || 0) + due
          }
        }
      })
      setBalanceMap(map)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!form.name || !form.phone) return
    setSaving(true)
    try {
      await addCustomer(form)
      setShowAdd(false)
      setForm({ name: '', phone: '', address: '' })
      fetchAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add customer')
    } finally { setSaving(false) }
  }

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  // Total outstanding across all customers
  const totalOutstanding = Object.values(balanceMap).reduce((sum, v) => sum + v, 0)

  if (loading) return (
    <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>🐐</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' }}>
      <Navbar />
      <div style={{ padding: '1.25rem', maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-900)', flex: 1 }}>
            {t.customers} ({filtered.length})
          </h1>
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ {t.addCustomer}</button>
        </div>

        {/* Total outstanding banner */}
        {totalOutstanding > 0 && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
            padding: '0.875rem 1.125rem', marginBottom: '1rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📒</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
                {t.totalDue}
              </span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>
              ₹{totalOutstanding.toFixed(2)}
            </span>
          </div>
        )}

        <input
          placeholder={`🔍 ${t.search}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: '1.25rem' }}
        />

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 56 }}>👥</div>
            <p style={{ marginTop: 8 }}>{t.noCustomers}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
            {filtered.map(c => {
              const balance = balanceMap[c.id] || 0
              return (
                <div key={c.id} style={{
                  background: '#fff', borderRadius: 14, padding: '1rem 1.25rem',
                  boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)',
                  display: 'flex', alignItems: 'flex-start', gap: '0.875rem'
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800, color: '#166534', flexShrink: 0
                  }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{c.name}</div>
                      {/* Khata badge */}
                      {balance > 0 ? (
                        <span style={{
                          background: '#fee2e2', color: '#dc2626',
                          fontSize: 11, fontWeight: 800, padding: '3px 8px',
                          borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0
                        }}>
                          {t.khata}: ₹{balance.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{
                          background: '#dcfce7', color: '#166534',
                          fontSize: 11, fontWeight: 800, padding: '3px 8px',
                          borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0
                        }}>
                          ✓ {t.allPaid}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>📱 {c.phone}</div>
                    {c.address && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>📍 {c.address}</div>}
                    <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginTop: 4 }}>
                      🛒 {c.orders?.length || 0} orders
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-900)' }}>👥 {t.addCustomer}</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div>
              <label>{t.name} *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.phone} *</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label>{t.address} ({t.optional})</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Village / Town" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary" style={{ flex: 1 }}>{saving ? t.saving : t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
