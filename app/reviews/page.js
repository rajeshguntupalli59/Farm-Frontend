'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllReviews, hideReview, restoreReview } from '../../lib/api'

const STAR = (n, total) => '⭐'.repeat(n) + '☆'.repeat(5 - n)

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'VISIBLE' | 'HIDDEN'

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (!token) { router.replace('/login'); return }
    const role = JSON.parse(user || '{}').role
    if (!['OWNER', 'MANAGER'].includes(role)) { router.replace('/dashboard'); return }
    fetchReviews()
  }, [router])

  const fetchReviews = async () => {
    try {
      const res = await getAllReviews()
      setReviews(res.data.reviews || [])
    } catch {
    } finally { setLoading(false) }
  }

  const handleHide = async (id) => {
    if (!confirm('Hide this review from customers?')) return
    try {
      await hideReview(id)
      setReviews(prev => prev.map(r => r.id === id ? { ...r, isVisible: false } : r))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to hide review')
    }
  }

  const handleRestore = async (id) => {
    try {
      await restoreReview(id)
      setReviews(prev => prev.map(r => r.id === id ? { ...r, isVisible: true } : r))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restore review')
    }
  }

  const filteredReviews = filter === 'ALL'
    ? reviews
    : filter === 'VISIBLE'
    ? reviews.filter(r => r.isVisible)
    : reviews.filter(r => !r.isVisible)

  const avgRating = reviews.filter(r => r.isVisible).reduce((s, r) => s + r.rating, 0) /
    (reviews.filter(r => r.isVisible).length || 1)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '2rem' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer', color: '#374151' }}>← Back</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>⭐ Customer Reviews</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              {reviews.filter(r => r.isVisible).length} visible · {reviews.filter(r => !r.isVisible).length} hidden · Avg: {avgRating.toFixed(1)} ⭐
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          {[
            { key: 'ALL', label: `All (${reviews.length})` },
            { key: 'VISIBLE', label: `Visible (${reviews.filter(r => r.isVisible).length})` },
            { key: 'HIDDEN', label: `Hidden (${reviews.filter(r => !r.isVisible).length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 18px', borderRadius: 20, border: '1px solid',
              borderColor: filter === f.key ? '#166534' : '#e5e7eb',
              background: filter === f.key ? '#166534' : '#fff',
              color: filter === f.key ? '#fff' : '#6b7280',
              fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
            <p style={{ color: '#9ca3af', fontSize: 15 }}>No reviews to show</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredReviews.map(review => (
              <div key={review.id} style={{
                background: '#fff', borderRadius: 16, padding: '1.25rem',
                border: `1px solid ${review.isVisible ? '#e5e7eb' : '#fecaca'}`,
                opacity: review.isVisible ? 1 : 0.75,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    {/* Product */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>{review.product?.category?.emoji || '📦'}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{review.product?.name}</span>
                      {!review.isVisible && (
                        <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Hidden</span>
                      )}
                    </div>

                    {/* Stars + comment */}
                    <div style={{ fontSize: 18, marginBottom: 6, letterSpacing: 2 }}>
                      {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{review.rating}/5</span>
                    </div>
                    {review.comment && (
                      <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151', fontStyle: 'italic' }}>"{review.comment}"</p>
                    )}

                    {/* Customer + date */}
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      By <strong style={{ color: '#374151' }}>{review.customer?.name || review.customer?.phone || 'Customer'}</strong>
                      {' · '}
                      {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {review.isVisible ? (
                      <button onClick={() => handleHide(review.id)} style={{
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                        borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}>
                        🚫 Hide
                      </button>
                    ) : (
                      <button onClick={() => handleRestore(review.id)} style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
                        borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}>
                        ✓ Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
