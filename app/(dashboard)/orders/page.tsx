'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatCOP, formatDate } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/orders')

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()

      if (data.success) {
        setOrders(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Error al cargar los pedidos. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  function getPaymentStatusBadge(status: string) {
    const badges: Record<string, string> = {
      pending: 'badge-warning',
      partial: 'badge-info',
      paid: 'badge-success'
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      partial: 'Parcial',
      paid: 'Pagado'
    }
    return (
      <span className={badges[status] || 'badge-info'}>
        {labels[status] || status}
      </span>
    )
  }

  function getShippingStatusBadge(status: string) {
    const badges: Record<string, string> = {
      preparing: 'badge-warning',
      shipped: 'badge-info',
      delivered: 'badge-success'
    }
    const labels: Record<string, string> = {
      preparing: 'Por Enviar',
      shipped: 'Enviado',
      delivered: 'Entregado'
    }
    return (
      <span className={badges[status] || 'badge-info'}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600 mt-1">
            {loading ? (
              'Cargando...'
            ) : (
              `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        <Link href="/orders/new" className="btn-primary text-center">
          + Nuevo Pedido
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-red-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchOrders()}
            className="mt-3 btn-outline btn-sm"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-gray-200 rounded"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="card-clickable block p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {order.orderNumber}
                    </h3>
                    {getPaymentStatusBadge(order.paymentStatus)}
                    {getShippingStatusBadge(order.shippingStatus)}
                  </div>
                  <p className="text-gray-600 mt-1">
                    {order.customer.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(order.orderDate)} • {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-nouvie-blue">
                    {formatCOP(order.total)}
                  </p>
                  <p className="text-sm text-gray-500">
                    IVA: {formatCOP(order.tax)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                    >
                      {item.quantity}× {item.product.name}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      +{order.items.length - 3} más
                    </span>
                  )}
                </div>
              </div>

              {order.notes && (
                <p className="mt-3 text-sm text-gray-500 italic">
                  Nota: {order.notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No hay pedidos
          </h3>
          <p className="mt-2 text-gray-500">
            Crea tu primer pedido para comenzar
          </p>
          <Link href="/orders/new" className="mt-4 btn-primary inline-block">
            + Nuevo Pedido
          </Link>
        </div>
      )}
    </div>
  )
}