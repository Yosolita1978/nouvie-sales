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
  const [showAlerts, setShowAlerts] = useState(false)
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

      {/* Stock Alerts — compact collapsible bar */}
      {!loading && hasStockAlerts && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAlerts(!showAlerts)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 text-sm">
              {outOfStockProducts.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 font-medium rounded-full text-xs">
                  {outOfStockProducts.length} agotado{outOfStockProducts.length !== 1 ? 's' : ''}
                </span>
              )}
              {lowStockProducts.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 font-medium rounded-full text-xs">
                  {lowStockProducts.length} stock bajo
                </span>
              )}
            </div>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${showAlerts ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAlerts && (
            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              {outOfStockProducts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1.5">Agotados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {outOfStockProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs rounded-md transition-colors"
                      >
                        {product.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {lowStockProducts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1.5">Stock Bajo</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lowStockProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs rounded-md transition-colors"
                      >
                        {product.name} <span className="text-amber-500">({product.stock})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
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