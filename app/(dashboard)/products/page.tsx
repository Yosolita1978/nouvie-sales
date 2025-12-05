'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { ProductCard, ProductGridSkeleton } from '@/components/products'
import type { Product } from '@/types'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  // Fetch all products once on mount to get categories and stock alerts
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const response = await fetch('/api/products')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const allProducts: Product[] = data.data
            
            // Extract unique categories
            const uniqueCategories = [...new Set(allProducts.map((p) => p.category))]
              .filter(Boolean)
              .sort()
            setCategories(uniqueCategories)
            
            // Calculate stock alerts
            const outOfStock = allProducts.filter((p) => p.stock === 0)
            const lowStock = allProducts.filter((p) => p.stock > 0 && p.stock <= p.minStock)
            setOutOfStockProducts(outOfStock)
            setLowStockProducts(lowStock)
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err)
      }
    }
    fetchInitialData()
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (category) params.set('category', category)

      const url = params.toString()
        ? `/api/products?${params.toString()}`
        : '/api/products'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }

      const data = await response.json()

      if (data.success) {
        setProducts(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('Error al cargar los productos. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const hasStockAlerts = outOfStockProducts.length > 0 || lowStockProducts.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-1">
            {loading ? (
              'Cargando...'
            ) : (
              `${products.length} producto${products.length !== 1 ? 's' : ''} encontrado${products.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        <Link href="/products/new" className="btn-primary text-center">
          + Nuevo Producto
        </Link>
      </div>

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
                    {outOfStockProducts.slice(0, 6).map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-lg transition-colors"
                      >
                        <span>❌</span>
                        <span>{product.name}</span>
                      </Link>
                    ))}
                    {outOfStockProducts.length > 6 && (
                      <span className="inline-flex items-center px-3 py-2 bg-red-200 text-red-800 text-sm font-medium rounded-lg">
                        +{outOfStockProducts.length - 6} más
                      </span>
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
                    {lowStockProducts.slice(0, 6).map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors"
                      >
                        <span>⚠️</span>
                        <span>{product.name}</span>
                        <span className="text-amber-600">({product.stock}/{product.minStock})</span>
                      </Link>
                    ))}
                    {lowStockProducts.length > 6 && (
                      <span className="inline-flex items-center px-3 py-2 bg-amber-200 text-amber-800 text-sm font-medium rounded-lg">
                        +{lowStockProducts.length - 6} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
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

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select w-full sm:w-48"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
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
            onClick={() => fetchProducts()}
            className="mt-3 btn-outline btn-sm"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <ProductGridSkeleton count={9} />}

          {!loading &&
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No se encontraron productos
          </h3>
          <p className="mt-2 text-gray-500">
            {search || category
              ? 'No hay productos que coincidan con los filtros'
              : 'Comienza agregando tu primer producto'}
          </p>
          {(search || category) ? (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setCategory('')
              }}
              className="mt-4 btn-outline"
            >
              Limpiar filtros
            </button>
          ) : (
            <Link href="/products/new" className="mt-4 btn-primary inline-block">
              + Nuevo Producto
            </Link>
          )}
        </div>
      )}
    </div>
  )
}