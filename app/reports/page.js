'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getReports } from '../../lib/api'
import { getToken, getUser } from '../../lib/auth'
import { useLang } from '../../lib/lang'
import Navbar from '../components/Navbar'

// ── Colour helpers ───────────────────────────────────────────────────────────
const CAT_COLORS = {
  FEED:      { bg: '#fef9c3', fg: '#854d0e' },
  MEDICINE:  { bg: '#dbeafe', fg: '#1d4ed8' },
  LABOUR:    { bg: '#dcfce7', fg: '#166534' },
  TRANSPORT: { bg: '#f3e8ff', fg: '#7c3aed' },
  EQUIPMENT: { bg: '#ffedd5', fg: '#c2410c' },
  OTHER:     { bg: '#f3f4f6', fg: '#374151' },
}

const STATUS_COLORS = {
  PENDING:   { bg: '#fef9c3', fg: '#854d0e' },
  CONFIRMED: { bg: '#dbeafe', fg: '#1d4ed8' },
  COMPLETED: { bg: '#dcfce7', fg: '#166534' },
  CANCELLED: { bg: '#fee2e2', fg: '#dc2626' },
}

const ANIMAL_STATUS_COLORS = {
  AVAILABLE: { bg: '#dcfce7', fg: '#166534' },
  SOLD:      { bg: '#dbeafe', fg: '#1d4ed8' },
  DEAD:      { bg: '#fee2e2', fg: '#dc2626' },
}

const ANIMAL_EMOJIS = { GOAT: '🐐', SHEEP: '🐑', CHICKEN: '🐔', HEN: '🐣' }

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:    { paddingTop: 56, minHeight: '100vh', background: 'var(--green-50)' },
  content: { padding: '1.5rem', maxWidth: 1100, margin: '0 auto' },
  heading: { fontSize: 22, fontWeight: 800, color: 'var(--green-900)', margin: 0 },
  subText: { fontSize: 13, color: 'var(--gray-400)', marginTop: 2 },

  tabRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' },
  tab: (active) => ({
    padding: '7px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? '#166534' : '#fff',
    color:      active ? '#fff'    : '#374151',
    boxShadow:  active ? 'none'   : 'var(--shadow-sm)',
    transition: 'all 0.15s',
  }),

  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
    gap: '1rem', marginBottom: '1.25rem',
  },
  summaryCard: (accent) => ({
    background: '#fff', borderRadius: 14, padding: '1.25rem',
    boxShadow: 'var(--shadow-sm)', border: `1px solid ${accent}33`,
    borderTop: `4px solid ${accent}`,
  }),
  cardEmoji:  { fontSize: 28, marginBottom: 6 },
  cardVal:    (color) => ({ fontSize: 24, fontWeight: 800, color }),
  cardLabel:  { fontSize: 12, color: 'var(--gray-400)', marginTop: 3 },

  section: {
    background: '#fff', borderRadius: 14, padding: '1.25rem',
    boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)',
    marginBottom: '1.25rem',
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--green-900)', marginBottom: '0.875rem' },

  // Bar chart
  barRow: { marginBottom: '0.875rem' },
  barLabel: { fontSize: 13, fontWeight: 600, color: 'var(--green-900)', marginBottom: 4 },
  barTrack: { background: '#f3f4f6', borderRadius: 6, height: 10, overflow: 'hidden', marginBottom: 2 },
  bar: (width, color) => ({
    height: '100%', borderRadius: 6,
    width: `${Math.max(0, Math.min(100, width))}%`,
    background: color, transition: 'width 0.6s ease',
  }),
  barValues: { display: 'flex', gap: 16, fontSize: 12, color: 'var(--gray-400)' },

  // Rank list
  rankRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
  rankNum: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#f0fdf4', color: '#166534',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800, flexShrink: 0,
  },
  rankName: { flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--green-900)' },
  rankAmt:  { fontSize: 14, fontWeight: 700, color: '#166534' },

  // Badges
  badge: (bg, fg) => ({
    display: 'inline-block', padding: '4px 12px', borderRadius: 12,
    fontSize: 13, fontWeight: 600, background: bg, color: fg, margin: '0 4px 4px 0',
  }),

  // Animal grid
  animalCard: {
    background: '#f9fafb', borderRadius: 12, padding: '1rem',
    border: '1px solid var(--gray-100)',
  },
  animalTitle: { fontSize: 15, fontWeight: 700, color: 'var(--green-900)', marginBottom: 8 },
  animalStatRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },

  pendingCard: {
    background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    borderRadius: 14, padding: '1.25rem',
    color: '#fff', marginBottom: '1.25rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const router = useRouter()
  const { t }  = useLang()
  const user   = getUser()

  const [period,  setPeriod]  = useState('month')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (user?.role !== 'OWNER') { router.push('/dashboard'); return }
    fetchReports()
  }, [router, period])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await getReports(period)
      setData(res.data)
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ paddingTop: 56, paddingBottom: '4rem', paddingLeft: '4rem', paddingRight: '4rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>🐐</span>
    </div>
  )

  const summary  = data?.summary  || {}
  const monthly  = data?.monthly  || []
  const products = data?.topProducts || []
  const expBreak = data?.expenseBreakdown || []
  const animals  = data?.animalSummary   || []
  const orders   = data?.ordersByStatus  || {}

  const revenue  = parseFloat(summary.revenue  || 0)
  const expenses = parseFloat(summary.expenses || 0)
  const netProfit = revenue - expenses
  const ordersCount = parseInt(summary.ordersCount || 0)
  const pendingRev  = parseFloat(summary.pendingRevenue || 0)

  // compute max for monthly bars
  const maxMonthlyVal = monthly.reduce((mx, m) => Math.max(mx, m.revenue || 0, m.expenses || 0), 1)

  // compute max for product bars
  const maxProdRev = products.reduce((mx, p) => Math.max(mx, p.revenue || 0), 1)

  const periodLabel = { week: t.thisWeek, month: t.thisMonth, year: t.thisYear }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.content}>
        {/* Header */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={S.heading}>📊 {t.reports}</h1>
          <p style={S.subText}>{periodLabel[period]}</p>
        </div>

        {/* Period tabs */}
        <div style={S.tabRow}>
          {['week', 'month', 'year'].map(p => (
            <button key={p} style={S.tab(period === p)} onClick={() => setPeriod(p)}>
              {periodLabel[p]}
            </button>
          ))}
        </div>

        {/* 4-card summary grid */}
        <div style={S.grid4}>
          <div style={S.summaryCard('#166534')}>
            <div style={S.cardEmoji}>💰</div>
            <div style={S.cardVal('#166534')}>₹{revenue.toLocaleString('en-IN')}</div>
            <div style={S.cardLabel}>{t.revenue}</div>
          </div>
          <div style={S.summaryCard('#dc2626')}>
            <div style={S.cardEmoji}>💸</div>
            <div style={S.cardVal('#dc2626')}>₹{expenses.toLocaleString('en-IN')}</div>
            <div style={S.cardLabel}>{t.totalExpenses ?? 'Total Expenses'}</div>
          </div>
          <div style={S.summaryCard(netProfit >= 0 ? '#166534' : '#dc2626')}>
            <div style={S.cardEmoji}>📈</div>
            <div style={S.cardVal(netProfit >= 0 ? '#166534' : '#dc2626')}>
              {netProfit < 0 ? '-' : ''}₹{Math.abs(netProfit).toLocaleString('en-IN')}
            </div>
            <div style={S.cardLabel}>{t.netProfit}</div>
          </div>
          <div style={S.summaryCard('#2563eb')}>
            <div style={S.cardEmoji}>🛒</div>
            <div style={S.cardVal('#2563eb')}>{ordersCount}</div>
            <div style={S.cardLabel}>{t.orders ?? 'Orders'}</div>
          </div>
        </div>

        {/* Pending revenue card */}
        {pendingRev > 0 && (
          <div style={S.pendingCard}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                {t.pendingPayments ?? 'Pending Revenue'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>₹{pendingRev.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Money owed, not yet collected</div>
            </div>
            <span style={{ fontSize: 44 }}>⏳</span>
          </div>
        )}

        {/* Monthly Revenue vs Expenses */}
        {monthly.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>{t.revenue} vs {t.expenses ?? 'Expenses'} — Monthly</div>
            {monthly.map((m, i) => {
              const revW  = ((m.revenue  || 0) / maxMonthlyVal) * 100
              const expW  = ((m.expenses || 0) / maxMonthlyVal) * 100
              return (
                <div key={i} style={S.barRow}>
                  <div style={S.barLabel}>{m.month || m.label || `Month ${i + 1}`}</div>
                  {/* Revenue bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#166534', width: 56, textAlign: 'right', flexShrink: 0 }}>Rev</span>
                    <div style={{ ...S.barTrack, flex: 1 }}>
                      <div style={S.bar(revW, '#166534')} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', width: 72, textAlign: 'right', flexShrink: 0 }}>
                      ₹{(m.revenue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {/* Expense bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#dc2626', width: 56, textAlign: 'right', flexShrink: 0 }}>Exp</span>
                    <div style={{ ...S.barTrack, flex: 1 }}>
                      <div style={S.bar(expW, '#dc2626')} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', width: 72, textAlign: 'right', flexShrink: 0 }}>
                      ₹{(m.expenses || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Two-column section: top products + expense breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Top 5 Products */}
          <div style={S.section}>
            <div style={S.sectionTitle}>🏆 {t.topProducts}</div>
            {products.length === 0 ? (
              <div style={{ color: 'var(--gray-400)', fontSize: 13 }}>No data yet</div>
            ) : (
              products.slice(0, 5).map((p, i) => {
                const pct = ((p.revenue || 0) / maxProdRev) * 100
                return (
                  <div key={i} style={{ marginBottom: '0.875rem' }}>
                    <div style={S.rankRow}>
                      <div style={S.rankNum}>{i + 1}</div>
                      <div style={S.rankName}>{p.name}</div>
                      <div style={S.rankAmt}>₹{(p.revenue || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={S.barTrack}>
                      <div style={S.bar(pct, '#166534')} />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Expense Breakdown */}
          <div style={S.section}>
            <div style={S.sectionTitle}>📊 {t.expenseBreakdown}</div>
            {expBreak.length === 0 ? (
              <div style={{ color: 'var(--gray-400)', fontSize: 13 }}>No expenses recorded</div>
            ) : (
              <div>
                {expBreak.map((e, i) => {
                  const colors = CAT_COLORS[e.category] || CAT_COLORS.OTHER
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)'
                    }}>
                      <span style={S.badge(colors.bg, colors.fg)}>
                        {e.category}
                      </span>
                      <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>
                        ₹{parseFloat(e.total || e.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Animal Summary */}
        {animals.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>🐐 Animal Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '1rem' }}>
              {animals.map((a, i) => (
                <div key={i} style={S.animalCard}>
                  <div style={S.animalTitle}>
                    {ANIMAL_EMOJIS[a.type] || '🐾'} {a.type}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-800)', marginBottom: 8 }}>
                    {a.total ?? ((a.available || 0) + (a.sold || 0) + (a.dead || 0))}
                  </div>
                  <div style={S.animalStatRow}>
                    {a.available !== undefined && (
                      <span style={S.badge(ANIMAL_STATUS_COLORS.AVAILABLE.bg, ANIMAL_STATUS_COLORS.AVAILABLE.fg)}>
                        ✓ {a.available}
                      </span>
                    )}
                    {a.sold !== undefined && (
                      <span style={S.badge(ANIMAL_STATUS_COLORS.SOLD.bg, ANIMAL_STATUS_COLORS.SOLD.fg)}>
                        🛒 {a.sold}
                      </span>
                    )}
                    {a.dead !== undefined && (
                      <span style={S.badge(ANIMAL_STATUS_COLORS.DEAD.bg, ANIMAL_STATUS_COLORS.DEAD.fg)}>
                        ✝ {a.dead}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders by Status */}
        {Object.keys(orders).length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>🛒 Orders by Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {Object.entries(orders).map(([status, count]) => {
                const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', fg: '#374151' }
                return (
                  <div key={status} style={{
                    background: colors.bg, border: `1px solid ${colors.fg}33`,
                    borderRadius: 12, padding: '0.75rem 1.25rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: colors.fg }}>{count}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.fg, marginTop: 2 }}>{status}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
