'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCOP, formatMonthLabel } from '@/lib/utils'

// ============================================
// TYPES (shape of the /api/stats response)
// ============================================

interface MonthOption {
  key: string
  count: number
}

interface TopProduct {
  productId: string
  name: string
  unit: string
  quantity: number
  revenue: number
}

interface TopCustomer {
  customerId: string
  name: string
  total: number
  orderCount: number
}

interface MonthlySales {
  key: string
  year: number
  month: number
  count: number
  revenue: number
}

interface StatsData {
  month: string
  topProducts: TopProduct[]
  topCustomers: TopCustomer[]
  salesByMonth: MonthlySales[]
}

// ============================================
// SMALL UI HELPERS
// ============================================

// One ranked row with a horizontal bar
function BarRow({
  label,
  value,
  subtitle,
  percent,
  color
}: {
  label: string
  value: string
  subtitle?: string
  percent: number
  color: string
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-sm text-gray-700 truncate">{label}</span>
        <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
          {value}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

// Wrapper card for each stats section
function StatsCard({
  title,
  subtitle,
  isEmpty,
  emptyMessage,
  children
}: {
  title: string
  subtitle?: string
  isEmpty: boolean
  emptyMessage: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <p className="text-center text-gray-400 py-8">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-gray-50">{children}</div>
      )}
    </div>
  )
}

// Percentage of a value relative to the largest value in its list
function toPercent(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((value / max) * 100)
}

// ============================================
// PAGE
// ============================================

export default function StatsPage() {
  const [months, setMonths] = useState<MonthOption[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load the list of months that have orders (for the dropdown)
  useEffect(() => {
    async function fetchMonths() {
      try {
        const response = await fetch('/api/orders/months')
        const data = await response.json()
        if (data.success && data.data.length > 0) {
          setMonths(data.data)
          // Default to the most recent month (list is newest-first)
          setSelectedMonth(data.data[0].key)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching months:', err)
        setError('Error al cargar los meses')
        setLoading(false)
      }
    }
    fetchMonths()
  }, [])

  // Load stats whenever the selected month changes
  const fetchStats = useCallback(async (month: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/stats?month=${encodeURIComponent(month)}`)
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Error al cargar las estadísticas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedMonth) {
      fetchStats(selectedMonth)
    }
  }, [selectedMonth, fetchStats])

  // Largest values, used to scale the bars
  const maxProductQty = stats
    ? Math.max(0, ...stats.topProducts.map((p) => p.quantity))
    : 0
  const maxCustomerTotal = stats
    ? Math.max(0, ...stats.topCustomers.map((c) => c.total))
    : 0
  const maxMonthRevenue = stats
    ? Math.max(0, ...stats.salesByMonth.map((m) => m.revenue))
    : 0

  return (
    <div className="space-y-6">
      {/* Header + month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-gray-600 mt-1">
            Productos y clientes más activos del mes
          </p>
        </div>

        {months.length > 0 && (
          <div>
            <label htmlFor="month" className="sr-only">
              Seleccionar mes
            </label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input"
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {formatMonthLabel(m.key)} ({m.count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* No data at all */}
      {!loading && !error && months.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Todavía no hay pedidos para analizar.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-6 space-y-3"
            >
              <div className="h-5 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top products */}
          <StatsCard
            title="Productos más pedidos"
            subtitle="Por unidades vendidas en el mes"
            isEmpty={stats.topProducts.length === 0}
            emptyMessage="No hay pedidos en este mes."
          >
            {stats.topProducts.map((product) => (
              <BarRow
                key={product.productId}
                label={product.name}
                value={`${product.quantity} ${product.unit || 'und'}`}
                subtitle={formatCOP(product.revenue)}
                percent={toPercent(product.quantity, maxProductQty)}
                color="bg-nouvie-blue"
              />
            ))}
          </StatsCard>

          {/* Top customers */}
          <StatsCard
            title="Mejores clientes"
            subtitle="Por total comprado en el mes"
            isEmpty={stats.topCustomers.length === 0}
            emptyMessage="No hay pedidos en este mes."
          >
            {stats.topCustomers.map((customer) => (
              <BarRow
                key={customer.customerId}
                label={customer.name}
                value={formatCOP(customer.total)}
                subtitle={`${customer.orderCount} pedido${customer.orderCount !== 1 ? 's' : ''}`}
                percent={toPercent(customer.total, maxCustomerTotal)}
                color="bg-nouvie-turquoise"
              />
            ))}
          </StatsCard>

          {/* Sales by month (full width) */}
          <div className="lg:col-span-2">
            <StatsCard
              title="Ventas por mes"
              subtitle="Ingresos de los últimos 12 meses"
              isEmpty={stats.salesByMonth.length === 0}
              emptyMessage="Todavía no hay ventas registradas."
            >
              {stats.salesByMonth.map((m) => (
                <BarRow
                  key={m.key}
                  label={formatMonthLabel(m.key)}
                  value={formatCOP(m.revenue)}
                  subtitle={`${m.count} pedido${m.count !== 1 ? 's' : ''}`}
                  percent={toPercent(m.revenue, maxMonthRevenue)}
                  color={m.key === selectedMonth ? 'bg-nouvie-blue' : 'bg-nouvie-light-blue'}
                />
              ))}
            </StatsCard>
          </div>
        </div>
      )}
    </div>
  )
}
