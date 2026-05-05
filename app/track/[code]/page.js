'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'

const API_URL = 'http://localhost:5000/api'

// Status order used for timeline progression
const STATUS_ORDER = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

const STATUS_LABELS = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Order Confirmed',
  PREPARING: 'Preparing',
  DISPATCHED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
}

const VEHICLE_EMOJI = {
  BIKE: '🏍️',
  AUTO: '🛺',
  VAN: '🚐',
  CYCLE: '🚲',
}

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TrackPage() {
  const { code } = useParams()
  const router = useRouter()

  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState(code || '')

  const fetchTrack = async () => {
    if (!code) return
    try {
      const res = await axios.get(`${API_URL}/delivery/shipments/track/${code}`)
      setShipment(res.data.shipment)
      setNotFound(false)
      setError(null)
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true)
        setShipment(null)
      } else {
        setError('Unable to fetch tracking info. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setError(null)
    fetchTrack()
    const interval = setInterval(fetchTrack, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = searchInput.trim().toUpperCase()
    if (trimmed) router.push(`/track/${trimmed}`)
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const currentStatusIndex = shipment
    ? STATUS_ORDER.indexOf(shipment.status)
    : -1

  const isDelivered = shipment?.status === 'DELIVERED'

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: '#f0fdf4',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    header: {
      background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
      padding: '1.25rem 1rem 1.25rem',
    },
    headerInner: {
      maxWidth: 480,
      margin: '0 auto',
    },
    brandRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: '1rem',
    },
    brandText: {
      fontSize: 24,
      fontWeight: 900,
      color: '#fff',
      letterSpacing: '-0.5px',
    },
    brandSub: {
      color: '#86efac',
      fontSize: 12,
      marginTop: 2,
    },
    searchForm: {
      display: 'flex',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      background: 'rgba(255,255,255,0.95)',
      border: 'none',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 14,
      fontFamily: 'monospace',
      letterSpacing: 1,
      outline: 'none',
    },
    searchBtn: {
      background: '#22c55e',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      padding: '10px 18px',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 14,
      whiteSpace: 'nowrap',
    },
    content: {
      maxWidth: 480,
      margin: '0 auto',
      padding: '1.25rem 1rem',
    },
    card: {
      background: '#fff',
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '1.25rem',
      marginBottom: '1rem',
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: '1rem',
    },
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderTimeline = () => {
    return STATUS_ORDER.map((status, idx) => {
      const isCompleted = idx < currentStatusIndex
      const isActive = idx === currentStatusIndex
      const isPending = idx > currentStatusIndex

      const dotColor = isPending ? 'transparent' : '#166534'
      const dotBorder = isPending ? '2px solid #d1d5db' : 'none'
      const lineColor = idx < currentStatusIndex ? '#166534' : '#e5e7eb'
      const isLast = idx === STATUS_ORDER.length - 1

      let extraInfo = null
      if (status === 'DISPATCHED' && shipment?.pickedAt && (isCompleted || isActive)) {
        extraInfo = `Picked up at ${formatDateTime(shipment.pickedAt)}`
      }
      if (status === 'DELIVERED' && shipment?.deliveredAt && isCompleted) {
        extraInfo = `Delivered at ${formatDateTime(shipment.deliveredAt)}`
      }

      return (
        <div key={status} style={{ display: 'flex', gap: 12 }}>
          {/* Dot + line column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: dotColor,
              border: dotBorder,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isActive ? '0 0 0 3px rgba(22,101,52,0.2)' : 'none',
            }}>
              {(isCompleted) && (
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>
              )}
            </div>
            {!isLast && (
              <div style={{ width: 2, flex: 1, background: lineColor, minHeight: 24, marginTop: 2, marginBottom: 2 }} />
            )}
          </div>

          {/* Label column */}
          <div style={{ paddingBottom: isLast ? 0 : 20, paddingTop: 0 }}>
            <div style={{
              fontSize: 14,
              fontWeight: isActive ? 700 : isCompleted ? 600 : 400,
              color: isActive ? '#14532d' : isCompleted ? '#374151' : '#9ca3af',
              lineHeight: '16px',
            }}>
              {STATUS_LABELS[status]}
              {isActive && (
                <span style={{
                  marginLeft: 8,
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 10,
                  verticalAlign: 'middle',
                }}>
                  NOW
                </span>
              )}
            </div>
            {extraInfo && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{extraInfo}</div>
            )}
          </div>
        </div>
      )
    })
  }

  const renderOrderCard = () => {
    const { order, paymentType, codAmount, codCollected } = shipment
    const isCOD = paymentType === 'COD'

    return (
      <div style={s.card}>
        <div style={s.cardTitle}>Order Details</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
              {order.product.name}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {order.quantity} {order.product.unit}
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#166534', whiteSpace: 'nowrap', marginLeft: 12 }}>
            ₹{order.totalPrice}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Payment badge */}
          <span style={{
            background: isCOD ? '#fef3c7' : '#dcfce7',
            color: isCOD ? '#92400e' : '#166534',
            border: `1px solid ${isCOD ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {isCOD ? 'COD' : 'PREPAID'}
          </span>

          {/* COD info */}
          {isCOD && (
            <span style={{ fontSize: 13, color: codCollected ? '#166534' : '#92400e', fontWeight: codCollected ? 700 : 500 }}>
              {codCollected
                ? '✓ Payment collected'
                : `₹${codAmount} to be collected on delivery`}
            </span>
          )}
        </div>
      </div>
    )
  }

  const renderDeliveryCard = () => {
    const { deliveryAddress, deliveryPincode, estimatedDelivery, deliveryPartner } = shipment

    return (
      <div style={s.card}>
        <div style={s.cardTitle}>Delivery Info</div>

        {(deliveryAddress || deliveryPincode) && (
          <div style={{ marginBottom: '0.875rem' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Address</div>
            <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
              {deliveryAddress}
              {deliveryPincode && <span style={{ color: '#6b7280' }}> — {deliveryPincode}</span>}
            </div>
          </div>
        )}

        {estimatedDelivery && (
          <div style={{ marginBottom: '0.875rem' }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Estimated Delivery</div>
            <div style={{ fontSize: 14, color: '#166534', fontWeight: 700 }}>
              {formatDate(estimatedDelivery)}
            </div>
          </div>
        )}

        {deliveryPartner && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Delivery Partner</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#14532d' }}>
                {VEHICLE_EMOJI[deliveryPartner.vehicle] || '🚚'} {deliveryPartner.name}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {deliveryPartner.vehicle}
              </div>
            </div>
            {deliveryPartner.phone && (
              <a
                href={`tel:${deliveryPartner.phone}`}
                style={{
                  background: '#166534',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                📞 Call
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div style={s.page}>

      {/* Green brand header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.brandRow}>
            <div>
              <div style={s.brandText}>🐐 Kruthik Farm</div>
              <div style={s.brandSub}>Farm Fresh • Direct to You</div>
            </div>
          </div>

          {/* Search / change tracking code */}
          <form onSubmit={handleSearch} style={s.searchForm}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value.toUpperCase())}
              placeholder="Enter tracking code…"
              style={s.searchInput}
              spellCheck={false}
              autoCapitalize="characters"
            />
            <button type="submit" style={s.searchBtn}>Track</button>
          </form>
        </div>
      </div>

      {/* Page content */}
      <div style={s.content}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🐐</div>
            <div style={{ color: '#6b7280', fontSize: 14 }}>Looking up your shipment…</div>
          </div>
        )}

        {!loading && notFound && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Tracking code not found
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: '1.5rem' }}>
              We couldn't find a shipment for <strong style={{ fontFamily: 'monospace' }}>{code}</strong>.
              Please double-check the code and try again.
            </div>
            <a href="/catalog" style={{
              display: 'inline-block',
              background: '#166534',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
            }}>
              Browse Catalog
            </a>
          </div>
        )}

        {!loading && error && !notFound && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '1rem',
            color: '#dc2626',
            fontSize: 14,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {!loading && shipment && (
          <>
            {/* Tracking code + greeting */}
            <div style={{ ...s.card, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tracking Code
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 26,
                fontWeight: 900,
                color: '#14532d',
                letterSpacing: 3,
                marginBottom: 8,
              }}>
                {shipment.trackingCode}
              </div>
              {shipment.order?.customer?.name && (
                <div style={{ fontSize: 15, color: '#374151' }}>
                  Hello, <strong>{shipment.order.customer.name}</strong>!
                </div>
              )}
            </div>

            {/* Delivered banner */}
            {isDelivered && (
              <div style={{
                background: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)',
                borderRadius: 14,
                padding: '1.25rem',
                textAlign: 'center',
                marginBottom: '1rem',
                color: '#fff',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Order Delivered!</div>
                {shipment.deliveredAt && (
                  <div style={{ fontSize: 13, color: '#86efac' }}>
                    {formatDateTime(shipment.deliveredAt)}
                  </div>
                )}
              </div>
            )}

            {/* Status timeline */}
            <div style={s.card}>
              <div style={s.cardTitle}>Shipment Status</div>
              <div style={{ paddingLeft: 4 }}>
                {renderTimeline()}
              </div>
            </div>

            {/* Order details */}
            {shipment.order && renderOrderCard()}

            {/* Delivery info */}
            {renderDeliveryCard()}

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              padding: '1rem',
              color: '#9ca3af',
              fontSize: 12,
            }}>
              Auto-refreshes every 30 seconds
            </div>
          </>
        )}
      </div>
    </div>
  )
}
