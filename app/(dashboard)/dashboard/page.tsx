'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCOP, formatDate } from '@/lib/utils'
import type { OrderWithDetails, Product } from '@/types'

interface DashboardStats {
  customers: number
  products: number
  orders: number
  ordersToday: number
  revenueToday: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<OrderWithDetails[]>([])
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, ordersRes, productsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/orders'),
          fetch('/api/products')
        ])

        if (!statsRes.ok || !ordersRes.ok || !productsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const statsData = await statsRes.json()
        const ordersData = await ordersRes.json()
        const productsData = await productsRes.json()

        if (statsData.success) {
          setStats(statsData.data)
        }

        if (ordersData.success) {
          setRecentOrders(ordersData.data.slice(0, 5))
        }

        if (productsData.success) {
          const products: Product[] = productsData.data
          const outOfStock = products.filter((p) => p.stock === 0)
          const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
          setOutOfStockProducts(outOfStock)
          setLowStockProducts(lowStock)
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const pendingOrders = recentOrders.filter(o => o.paymentStatus === 'pending')
  const pendingTotal = pendingOrders.reduce((sum, o) => sum + o.total, 0)

  const hasStockAlerts = outOfStockProducts.length > 0 || lowStockProducts.length > 0

  return (
    <div className="space-y-6">
      {/* Hero Section: Primary Action */}
      <div className="bg-gradient-to-r from-nouvie-blue to-nouvie-light-blue rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">¡Bienvenidas!</h1>
            <p className="mt-1 text-white/80">
              ¿Qué quieres hacer hoy?
            </p>
          </div>
          <Link
            href="/orders/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-nouvie-blue font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Pedido
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ============================================
          STOCK ALERTS SECTION - High Visibility
          ============================================ */}
      {!loading && hasStockAlerts && (
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-2">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-lg font-bold text-gray-900">⚠️ Alertas de Inventario</h2>
          </div>

          {/* Out of Stock Alert - RED */}
          {outOfStockProducts.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-800">
                    🚨 {outOfStockProducts.length} Producto{outOfStockProducts.length !== 1 ? 's' : ''} AGOTADO{outOfStockProducts.length !== 1 ? 'S' : ''}
                  </h3>
                  <p className="text-red-600 mt-1">
                    Estos productos no tienen stock y no se pueden vender
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {outOfStockProducts.slice(0, 8).map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-lg transition-colors"
                      >
                        <span>❌</span>
                        <span>{product.name}</span>
                      </Link>
                    ))}
                    {outOfStockProducts.length > 8 && (
                      <Link
                        href="/products"
                        className="inline-flex items-center px-3 py-2 bg-red-200 hover:bg-red-300 text-red-800 text-sm font-medium rounded-lg transition-colors"
                      >
                        +{outOfStockProducts.length - 8} más →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Low Stock Alert - YELLOW */}
          {lowStockProducts.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-full flex-shrink-0">
                  <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-800">
                    ⚠️ {lowStockProducts.length} Producto{lowStockProducts.length !== 1 ? 's' : ''} con Stock Bajo
                  </h3>
                  <p className="text-amber-700 mt-1">
                    Estos productos están por debajo del stock mínimo recomendado
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lowStockProducts.slice(0, 8).map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors"
                      >
                        <span>⚠️</span>
                        <span>{product.name}</span>
                        <span className="text-amber-600">({product.stock})</span>
                      </Link>
                    ))}
                    {lowStockProducts.length > 8 && (
                      <Link
                        href="/products"
                        className="inline-flex items-center px-3 py-2 bg-amber-200 hover:bg-amber-300 text-amber-800 text-sm font-medium rounded-lg transition-colors"
                      >
                        +{lowStockProducts.length - 8} más →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pedidos del Día */}
        <div className="card-padded p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-green-700">Pedidos del Día</p>
              {loading ? (
                <div className="h-7 w-12 bg-green-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-green-800">{stats?.ordersToday ?? 0}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ingresos del Día */}
        <div className="card-padded p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-green-700">Ingresos del Día</p>
              {loading ? (
                <div className="h-7 w-20 bg-green-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-xl font-bold text-green-800">{formatCOP(stats?.revenueToday ?? 0)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Por Cobrar */}
        <div className="card-padded p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-amber-700">Por Cobrar</p>
              {loading ? (
                <div className="h-7 w-16 bg-amber-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-xl font-bold text-amber-800">{formatCOP(pendingTotal)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pedidos Total */}
        <Link href="/orders" className="card-clickable p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pedidos Total</p>
              {loading ? (
                <div className="h-7 w-12 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats?.orders ?? 0}</p>
              )}
            </div>
          </div>
        </Link>

        {/* Clientes */}
        <Link href="/customers" className="card-clickable p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="h-6 w-6 text-nouvie-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Clientes</p>
              {loading ? (
                <div className="h-7 w-12 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats?.customers ?? 0}</p>
              )}
            </div>
          </div>
        </Link>

        {/* Productos */}
        <Link href="/products" className="card-clickable p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <svg className="h-6 w-6 text-nouvie-turquoise" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Productos</p>
              {loading ? (
                <div className="h-7 w-12 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats?.products ?? 0}</p>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="card-padded">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pedidos Recientes</h2>
          <Link href="/orders" className="text-sm text-nouvie-blue hover:underline">
            Ver todos →
          </Link>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="h-5 w-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && recentOrders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No hay pedidos todavía</p>
            <Link href="/orders/new" className="mt-2 text-nouvie-blue hover:underline inline-block">
              Crear el primer pedido →
            </Link>
          </div>
        )}

        {!loading && recentOrders.length > 0 && (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{order.orderNumber}</span>
                    {order.paymentStatus === 'pending' && (
                      <span className="badge-warning">Pendiente</span>
                    )}
                    {order.paymentStatus === 'paid' && (
                      <span className="badge-success">Pagado</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500" suppressHydrationWarning>
                    {order.customer.name} • {formatDate(order.orderDate)}
                  </p>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCOP(order.total)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/orders/new"
          className="flex flex-col items-center gap-2 p-4 bg-nouvie-pale-blue/20 rounded-lg hover:bg-nouvie-pale-blue/30 transition-colors text-center"
        >
          <svg className="h-6 w-6 text-nouvie-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium text-nouvie-navy">Nuevo Pedido</span>
        </Link>

        <Link
          href="/customers"
          className="flex flex-col items-center gap-2 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-center"
        >
          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Nuevo Cliente</span>
        </Link>

        <Link
          href="/products"
          className="flex flex-col items-center gap-2 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-center"
        >
          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Ver Productos</span>
        </Link>

        <Link
          href="/orders"
          className="flex flex-col items-center gap-2 p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-center"
        >
          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Ver Pedidos</span>
        </Link>
      </div>
    </div>
  )
}