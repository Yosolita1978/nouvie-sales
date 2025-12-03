'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatCOP, formatDate } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'

type FilterType = 'all' | 'pending-payment' | 'pending-shipping' | 'this-week'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending-payment', label: 'Pendientes de Pago' },
  { value: 'pending-shipping', label: 'Por Enviar' },
  { value: 'this-week', label: 'Esta Semana' }
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const debouncedSearch = useDebounce(search, 300)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()

      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      if (activeFilter === 'pending-payment') {
        params.set('paymentStatus', 'pending')
      } else if (activeFilter === 'pending-shipping') {
        params.set('shippingStatus', 'preparing')
      } else if (activeFilter === 'this-week') {
        params.set('period', 'week')
      }

      const url = params.toString()
        ? `/api/orders?${params.toString()}`
        : '/api/orders'

      const response = await fetch(url)

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
  }, [debouncedSearch, activeFilter])

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

  function clearFilters() {
    setSearch('')
    setActiveFilter('all')
  }

  const hasActiveFilters = search !== '' || activeFilter !== 'all'

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

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número de pedido o cliente..."
          className="input pl-10"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter.value
                ? 'bg-nouvie-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
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
            {hasActiveFilters
              ? 'No hay pedidos que coincidan con los filtros'
              : 'Crea tu primer pedido para comenzar'}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 btn-outline"
            >
              Limpiar filtros
            </button>
          ) : (
            <Link href="/orders/new" className="mt-4 btn-primary inline-block">
              + Nuevo Pedido
            </Link>
          )}
        </div>
      )}
    </div>
  )
}