'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboard } from '../../lib/api'
import { getUser, getToken } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

const S = {
  page: { paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' },
  content: { padding: '1.5rem', maxWidth: 1100, margin: '0 auto' },
  heading: { fontSize: 22, fontWeight: 800, color: 'var(--green-900)', marginBottom: '1.25rem' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '1rem', marginBottom: '1.25rem' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '0.875rem' },
  statCard: {
    background: '#fff', borderRadius: 14, padding: '1.25rem',
    textAlign: 'center', boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--gray-100)'
  },
  statEmoji: { fontSize: 32, marginBottom: 6 },
  statNum: { fontSize: 26, fontWeight: 800, color: 'var(--green-800)' },
  statLabel: { fontSize: 12, color: 'var(--gray-400)', marginTop: 3 },
  section: {
    background: '#fff', borderRadius: 14, padding: '1.25rem',
    boxShadow: 'var(--shadow-sm)', marginBottom: '1.25rem',
    border: '1px solid var(--gray-100)'
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--green-900)', marginBottom: '0.875rem' },
  actionBtn: {
    background: '#fff', border: '1px solid var(--gray-200)',
    borderRadius: 12, padding: '1rem', textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
  },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: 13, fontWeight: 600, color: 'var(--green-900)' },
  actionSub: { fontSize: 11, color: 'var(--gray-400)' },
  revenueCard: {
    background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
    borderRadius: 14, padding: '1.25rem',
    color: '#fff', marginBottom: '1.25rem'
  },
  orderRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.625rem 0', borderBottom: '1px solid var(--gray-100)'
  },
  lowStockItem: {
    display: 'flex', justifyContent: 'space-between',
    padding: '0.5rem 0.75rem', background: '#fff7ed',
    borderRadius: 8, marginBottom: 6,
    border: '1px solid #fed7aa', fontSize: 13
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const user = getUser()

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    fetchDashboard()
  }, [router])

  const fetchDashboard = async () => {
    try {
      const res = await getDashboard()
      setData(res.data)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const isOwner = user?.role === 'OWNER'
  const isManager = ['OWNER','MANAGER'].includes(user?.role)
  const s = data?.summary

  const ACTIONS = [
    { icon: '📦', label: t.products, sub: `${s?.totalProducts || 0} items`, href: '/products', roles: ['OWNER','MANAGER','EMPLOYEE'] },
    { icon: '🐐', label: t.animals, sub: 'Livestock', href: '/animals', roles: ['OWNER','MANAGER','EMPLOYEE'] },
    { icon: '🛒', label: t.orders, sub: `${s?.totalOrders || 0} total`, href: '/orders', roles: ['OWNER','MANAGER','EMPLOYEE'] },
    { icon: '👥', label: t.customers, sub: `${s?.totalCustomers || 0} total`, href: '/customers', roles: ['OWNER','MANAGER'] },
    { icon: '🌾', label: t.inventory, sub: 'Feed & medicine', href: '/inventory', roles: ['OWNER','MANAGER'] },
    { icon: '🗂️', label: t.categories, sub: `${s?.categories?.length || 0} groups`, href: '/categories', roles: ['OWNER','MANAGER'] },
    { icon: '👷', label: t.employees, sub: `${s?.totalEmployees || 0} staff`, href: '/employees', roles: ['OWNER','MANAGER'] },
    { icon: '🌐', label: t.publicCatalog, sub: 'Customer view', href: '/catalog', roles: ['OWNER','MANAGER','EMPLOYEE'] },
  ].filter(a => a.roles.includes(user?.role))

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 40 }}>🐐</div>
    </div>
  )

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={S.heading}>{t.dashboard}</h1>
            <p style={{ color: 'var(--gray-400)', fontSize: 13, marginTop: -12 }}>
              {t.welcome}, <strong>{user?.name}</strong>
            </p>
          </div>
          <button onClick={fetchDashboard} style={{ background: 'none', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            🔄 Refresh
          </button>
        </div>

        {isManager && (
          <div style={S.grid4}>
            {[
              { emoji: '📦', val: s?.totalProducts, label: t.totalProducts },
              { emoji: '✅', val: s?.availableProducts, label: t.availableProducts },
              { emoji: '🛒', val: s?.totalOrders, label: t.totalOrders },
              { emoji: '✔️', val: s?.completedOrders, label: t.completedOrders },
              { emoji: '👥', val: s?.totalCustomers, label: t.totalCustomers },
              { emoji: '👷', val: s?.totalEmployees, label: t.totalEmployees },
            ].map(({ emoji, val, label }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statEmoji}>{emoji}</div>
                <div style={S.statNum}>{val ?? 0}</div>
                <div style={S.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ ...S.revenueCard }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{t.inventoryValue}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>
                ₹{(s?.totalInventoryValue || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ ...S.revenueCard, background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{t.totalRevenue}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>
                ₹{(s?.totalRevenue || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ ...S.revenueCard, background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{t.pendingPayments}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>
                ₹{(s?.pendingPayments || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}

        {/* Category summary */}
        {isManager && s?.categories?.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>{t.categories}</div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {s.categories.map(cat => (
                <div key={cat.id} style={{
                  background: 'var(--green-50)', border: '1px solid var(--green-100)',
                  borderRadius: 10, padding: '0.625rem 1rem', textAlign: 'center', minWidth: 90
                }}>
                  <div style={{ fontSize: 22 }}>{cat.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-900)', marginTop: 2 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{cat._count?.products} items</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        {isManager && data?.recentOrders?.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>{t.recentOrders}</div>
            {data.recentOrders.map(o => (
              <div key={o.id} style={S.orderRow}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {o.product?.category?.emoji} {o.product?.name}
                  </span>
                  <span style={{ color: 'var(--gray-400)', fontSize: 12, marginLeft: 8 }}>
                    → {o.customer?.name}
                  </span>
                </div>
                <span className={`badge status-${o.status}`}>{o.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Low stock */}
        {isManager && data?.lowStockProducts?.length > 0 && (
          <div style={S.section}>
            <div style={{ ...S.sectionTitle, color: '#c2410c' }}>⚠️ {t.lowStock}</div>
            {data.lowStockProducts.map((p, i) => (
              <div key={i} style={S.lowStockItem}>
                <span>{p.category?.emoji} {p.name}</span>
                <span style={{ fontWeight: 700, color: '#c2410c' }}>
                  {p.stock} / min {p.minStock}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming health alerts */}
        {isManager && data?.upcomingHealthAlerts?.length > 0 && (
          <div style={S.section}>
            <div style={{ ...S.sectionTitle, color: '#7c3aed' }}>💉 Upcoming Health Care (next 14 days)</div>
            {data.upcomingHealthAlerts.map(h => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.75rem', background: '#f5f3ff',
                borderRadius: 8, marginBottom: 6, border: '1px solid #ddd6fe', fontSize: 13
              }}>
                <span>🐐 <strong>{h.animal?.name}</strong> ({h.animal?.type}) — {h.type}{h.medicine ? ` · ${h.medicine}` : ''}</span>
                <span style={{ fontWeight: 700, color: '#7c3aed' }}>
                  {new Date(h.nextDueDate).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Expiring inventory */}
        {isManager && data?.expiringInventory?.length > 0 && (
          <div style={S.section}>
            <div style={{ ...S.sectionTitle, color: '#dc2626' }}>⏰ Expiring Inventory (next 30 days)</div>
            {data.expiringInventory.map(inv => (
              <div key={inv.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.75rem', background: '#fef2f2',
                borderRadius: 8, marginBottom: 6, border: '1px solid #fecaca', fontSize: 13
              }}>
                <span>💊 <strong>{inv.name}</strong> — {inv.quantity} {inv.unit}</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>
                  {new Date(inv.expiryDate).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div style={S.section}>
          <div style={S.sectionTitle}>{t.quickActions}</div>
          <div style={S.grid3}>
            {ACTIONS.map(a => (
              <button key={a.href} onClick={() => router.push(a.href)} style={S.actionBtn}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--green-50)'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <span style={S.actionEmoji}>{a.icon}</span>
                <span style={S.actionLabel}>{a.label}</span>
                <span style={S.actionSub}>{a.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
