'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatCOP, formatDate } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'

type FilterType = 'all' | 'pending-payment' | 'pending-shipping'
type PaymentMethodFilter = 'all' | 'cash' | 'nequi' | 'bank' | 'link'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending-payment', label: 'Pendientes de Pago' },
  { value: 'pending-shipping', label: 'Por Enviar' }
]

const PAYMENT_METHOD_FILTERS: { value: PaymentMethodFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'Todos', icon: '💳' },
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'nequi', label: 'Nequi', icon: '📱' },
  { value: 'bank', label: 'Banco', icon: '🏦' },
  { value: 'link', label: 'Link', icon: '🔗' }
]

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function getMonthLabel(monthParam: string): string {
  const [yearStr, monthStr] = monthParam.split('-')
  const monthIndex = parseInt(monthStr, 10) - 1
  if (monthIndex < 0 || monthIndex > 11) return monthParam
  return `${MONTH_NAMES[monthIndex]} ${yearStr}`
}

function getPrevMonth(monthParam: string): string {
  const [yearStr, monthStr] = monthParam.split('-')
  let year = parseInt(yearStr, 10)
  let month = parseInt(monthStr, 10) - 1 // 0-indexed
  month -= 1
  if (month < 0) {
    month = 11
    year -= 1
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function getNextMonth(monthParam: string): string {
  const [yearStr, monthStr] = monthParam.split('-')
  let year = parseInt(yearStr, 10)
  let month = parseInt(monthStr, 10) - 1 // 0-indexed
  month += 1
  if (month > 11) {
    month = 0
    year += 1
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function MonthlyOrdersPage() {
  const params = useParams()
  const router = useRouter()
  const monthParam = params.month as string

  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all')
  const [exporting, setExporting] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('month', monthParam)

      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      if (activeFilter === 'pending-payment') {
        params.set('paymentStatus', 'pending')
      } else if (activeFilter === 'pending-shipping') {
        params.set('shippingStatus', 'preparing')
      }

      if (paymentMethodFilter !== 'all') {
        params.set('paymentMethod', paymentMethodFilter)
      }

      const response = await fetch(`/api/orders?${params.toString()}`)

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
  }, [monthParam, debouncedSearch, activeFilter, paymentMethodFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Reset filters when navigating to a different month
  useEffect(() => {
    setSearch('')
    setActiveFilter('all')
    setPaymentMethodFilter('all')
  }, [monthParam])

  async function handleExport() {
    setExporting(true)

    try {
      const [yearStr, monthStr] = monthParam.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)

      // First day of month
      const fromDate = new Date(year, month - 1, 1)
      // Last day of month
      const toDate = new Date(year, month, 0)

      const params = new URLSearchParams()
      params.set('from', fromDate.toISOString().split('T')[0])
      params.set('to', toDate.toISOString().split('T')[0])

      if (paymentMethodFilter !== 'all') {
        params.set('paymentMethod', paymentMethodFilter)
      }

      const response = await fetch(`/api/orders/export?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Error al exportar')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `pedidos-${monthParam}.xlsx`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Error exporting orders:', err)
      setError('Error al exportar los pedidos')
    } finally {
      setExporting(false)
    }
  }

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

  function getPaymentMethodLabel(method: string) {
    const labels: Record<string, string> = {
      cash: '💵 Efectivo',
      nequi: '📱 Nequi',
      bank: '🏦 Banco',
      link: '🔗 Link'
    }
    return labels[method] || method
  }

  function clearFilters() {
    setSearch('')
    setActiveFilter('all')
    setPaymentMethodFilter('all')
  }

  const hasActiveFilters = search !== '' || activeFilter !== 'all' || paymentMethodFilter !== 'all'

  // Stats for this month's orders
  const sumPaid = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((s, o) => s + o.total, 0)
  const sumPending = orders
    .filter(o => o.paymentStatus !== 'paid')
    .reduce((s, o) => s + o.total, 0)

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/orders"
            className="text-sm text-nouvie-blue hover:underline inline-flex items-center gap-1 mb-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Todos los pedidos
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/orders/month/${getPrevMonth(monthParam)}`)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title="Mes anterior"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="text-3xl font-bold text-gray-900">
              {getMonthLabel(monthParam)}
            </h1>

            <button
              type="button"
              onClick={() => router.push(`/orders/month/${getNextMonth(monthParam)}`)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title="Mes siguiente"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mt-1">
            {loading ? (
              'Cargando...'
            ) : (
              `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className="btn-outline flex items-center gap-2"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exportando...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar Mes
            </>
          )}
        </button>
      </div>

      {/* Month stats */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Cobrado</p>
            <p className="text-lg font-bold text-green-600 mt-0.5">{formatCOP(sumPaid)}</p>
            <span className="text-xs text-gray-500">
              {orders.filter(o => o.paymentStatus === 'paid').length} pedido{orders.filter(o => o.paymentStatus === 'paid').length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Por Cobrar</p>
            <p className="text-lg font-bold text-amber-600 mt-0.5">{formatCOP(sumPending)}</p>
            <span className="text-xs text-gray-500">
              {orders.filter(o => o.paymentStatus !== 'paid').length} pedido{orders.filter(o => o.paymentStatus !== 'paid').length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

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
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status Filter Buttons */}
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

      {/* Payment Method Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <span className="text-sm text-gray-500 self-center mr-2">Método de pago:</span>
        {PAYMENT_METHOD_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setPaymentMethodFilter(filter.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              paymentMethodFilter === filter.value
                ? 'bg-nouvie-turquoise text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{filter.icon}</span>
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
          <button type="button" onClick={() => fetchOrders()} className="mt-3 btn-outline btn-sm">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading state */}
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

      {/* Orders list */}
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {order.orderNumber}
                    </h3>
                    {order.orderType === 'promomix' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                        PROMOMIX
                      </span>
                    )}
                    {getPaymentStatusBadge(order.paymentStatus)}
                    {getShippingStatusBadge(order.shippingStatus)}
                  </div>
                  <p className="text-gray-600 mt-1">
                    {order.customer.name}
                  </p>
                  <p className="text-sm text-gray-500" suppressHydrationWarning>
                    {formatDate(order.orderDate)} • {order.items.length} producto{order.items.length !== 1 ? 's' : ''} • {getPaymentMethodLabel(order.paymentMethod)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-nouvie-blue">
                    {formatCOP(order.total)}
                  </p>
                  <p className="text-sm text-gray-500">
                    IVA: {formatCOP(order.tax)}
                    {order.discount > 0 && (
                      <span className="text-red-500 ml-2">Desc: -{formatCOP(order.discount)}</span>
                    )}
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

      {/* Empty state */}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No hay pedidos en {getMonthLabel(monthParam)}
          </h3>
          <p className="mt-2 text-gray-500">
            {hasActiveFilters
              ? 'No hay pedidos que coincidan con los filtros'
              : 'No se encontraron pedidos para este mes'}
          </p>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="mt-4 btn-outline">
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
