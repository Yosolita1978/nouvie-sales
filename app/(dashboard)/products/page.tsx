'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { ProductCard, ProductGridSkeleton } from '@/components/products'
import type { Product } from '@/types'

const CATEGORIES = [
  { value: '', label: 'Todas las categorías' },
  { value: 'Productos', label: 'Productos' },
  { value: 'Envases', label: 'Envases' },
  { value: 'Etiquetas', label: 'Etiquetas' },
  { value: 'Merchandising', label: 'Merchandising' },
  { value: 'Otros', label: 'Otros' }
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const debouncedSearch = useDebounce(search, 300)

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
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
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