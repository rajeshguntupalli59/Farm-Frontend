'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyOrders } from '../../../lib/api'

const STATUS = {
  PENDING:    { label: 'Pending',    te: 'పెండింగ్',           color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:  { label: 'Confirmed',  te: 'నిర్ధారించబడింది',   color: 'bg-blue-100 text-blue-800' },
  PROCESSING: { label: 'Processing', te: 'ప్రాసెసింగ్',        color: 'bg-purple-100 text-purple-800' },
  SHIPPED:    { label: 'Shipped',    te: 'పంపబడింది',          color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { label: 'Delivered',  te: 'డెలివరీ అయింది',    color: 'bg-green-100 text-green-800' },
  COMPLETED:  { label: 'Completed',  te: 'పూర్తయింది',        color: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'Cancelled',  te: 'రద్దు చేయబడింది',   color: 'bg-red-100 text-red-800' },
}

export default function CustomerPortalPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('customerToken')
    const data = localStorage.getItem('customerData')
    if (!token || !data) { router.replace('/customer'); return }
    setCustomer(JSON.parse(data))
    fetchOrders()
  }, [router])

  const fetchOrders = async () => {
    try {
      const res = await getMyOrders()
      setOrders(res.data.orders || [])
    } catch {
      // fall back to cached data
      const data = localStorage.getItem('customerData')
      if (data) setOrders(JSON.parse(data).orders || [])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('customerToken')
    localStorage.removeItem('customerData')
    router.push('/customer')
  }

  const whatsApp = (order) => {
    const msg = encodeURIComponent(
      `Hi, I'm ${customer?.name} (${customer?.phone}). Query about order #${order.id} for ${order.product?.name} placed on ${new Date(order.createdAt).toLocaleDateString('en-IN')}. Status: ${order.status}`
    )
    window.open(`https://wa.me/918897132032?text=${msg}`)
  }

  if (!customer) return null

  const totalSpent = orders.reduce((s, o) => s + (o.paidAmount || 0), 0)
  const totalBalance = orders.reduce((s, o) => s + Math.max(0, (o.totalPrice || 0) - (o.paidAmount || 0)), 0)

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🐐</span>
              <span className="font-bold text-lg">Kruthik Farm</span>
            </div>
            <p className="text-green-200 text-sm mt-0.5">Customer Portal</p>
          </div>
          <button onClick={handleLogout} className="text-green-300 text-sm hover:text-white">Logout →</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Customer card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-800">
              {customer.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <p className="text-gray-500 text-sm">📱 {customer.phone}</p>
              {customer.address && <p className="text-gray-500 text-sm">📍 {customer.address}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-800">{orders.length}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-800">₹{totalSpent.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500">Paid</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{totalBalance.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500">Balance</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => router.push('/customer/shop')}
            className="col-span-1 bg-green-700 text-white py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-1"
          >
            <span className="text-lg">🛒</span>
            Shop Now
          </button>
          <button
            onClick={() => window.open('tel:8897132032')}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-1"
          >
            <span className="text-lg">📞</span>
            Call
          </button>
          <button
            onClick={() => window.open(`https://wa.me/918897132032?text=${encodeURIComponent(`Hi, I'm ${customer.name} (${customer.phone}). Need help.`)}`)}
            className="bg-emerald-50 text-emerald-700 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-1"
          >
            <span className="text-lg">💬</span>
            WhatsApp
          </button>
        </div>

        {/* Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700">Your Orders ({orders.length})</h3>
            <button onClick={fetchOrders} className="text-xs text-green-700 font-medium">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-gray-500 font-medium">No orders yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Browse our products and place your first order</p>
              <button
                onClick={() => router.push('/customer/shop')}
                className="bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
              >
                🛒 Shop Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const s = STATUS[order.status] || STATUS.PENDING
                const balance = Math.max(0, (order.totalPrice || 0) - (order.paidAmount || 0))

                return (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{order.product?.category?.emoji || '📦'}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{order.product?.name}</p>
                          {order.product?.nameTelugu && <p className="text-xs text-gray-500">{order.product.nameTelugu}</p>}
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-gray-400 text-xs">Quantity</p>
                        <p className="font-medium">{order.quantity} {order.product?.unit}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Total</p>
                        <p className="font-medium">₹{(order.totalPrice || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Paid</p>
                        <p className="font-medium text-green-700">₹{(order.paidAmount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Balance</p>
                        <p className={`font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : '✓ Cleared'}
                        </p>
                      </div>
                    </div>

                    {order.note && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">📝 {order.note}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <button onClick={() => whatsApp(order)} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                        💬 Query
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">Kruthik Farm · Goat Farm · 📞 8897132032</p>
      </div>
    </div>
  )
}
