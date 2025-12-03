'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@/types'

interface OrderItem {
  productId: string
  productName: string
  unit: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface ProductPickerProps {
  onItemsChange: (items: OrderItem[]) => void
  items: OrderItem[]
  disabled?: boolean
}

export function ProductPicker({
  onItemsChange,
  items,
  disabled = false
}: ProductPickerProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/products')
        if (!response.ok) throw new Error('Failed to fetch products')
        const data = await response.json()
        if (data.success) {
          setAllProducts(data.data)
          setFilteredProducts(data.data)

          const uniqueCategories = [...new Set(data.data.map((p: Product) => p.category))]
            .filter(Boolean)
            .sort() as string[]
          setCategories(uniqueCategories)
        }
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Error al cargar productos')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    let filtered = allProducts

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchLower)
      )
    }

    setFilteredProducts(filtered)
  }, [allProducts, selectedCategory, search])

  useEffect(() => {
    if (justAdded) {
      const timer = setTimeout(() => setJustAdded(null), 1000)
      return () => clearTimeout(timer)
    }
  }, [justAdded])

  function getItemQuantity(productId: string): number {
    const item = items.find(i => i.productId === productId)
    return item?.quantity || 0
  }

  function handleAdd(product: Product) {
    setJustAdded(product.id)

    const existingIndex = items.findIndex(i => i.productId === product.id)

    if (existingIndex >= 0) {
      const updated = [...items]
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
        subtotal: (updated[existingIndex].quantity + 1) * updated[existingIndex].unitPrice
      }
      onItemsChange(updated)
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: 1,
        unitPrice: product.price,
        subtotal: product.price
      }
      onItemsChange([...items, newItem])
    }
  }

  function handleIncrement(productId: string) {
    const product = allProducts.find(p => p.id === productId)
    if (product) handleAdd(product)
  }

  function handleDecrement(productId: string) {
    const existingIndex = items.findIndex(i => i.productId === productId)
    if (existingIndex < 0) return

    const currentQty = items[existingIndex].quantity

    if (currentQty <= 1) {
      onItemsChange(items.filter(i => i.productId !== productId))
    } else {
      const updated = [...items]
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: currentQty - 1,
        subtotal: (currentQty - 1) * updated[existingIndex].unitPrice
      }
      onItemsChange(updated)
    }
  }

  function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function clearFilters() {
    setSearch('')
    setSelectedCategory('all')
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar productos..."
          disabled={disabled}
          className="input pr-10"
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
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

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          disabled={disabled}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-nouvie-blue text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-nouvie-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <div className="bg-nouvie-pale-blue/30 rounded-lg p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <span className="font-medium text-nouvie-blue">
              {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <span className="font-bold text-nouvie-blue">
            {formatCOP(totalAmount)}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {loading && (
          <div className="text-center py-8 text-gray-500">
            <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-nouvie-blue" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Cargando productos...
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No se encontraron productos</p>
            {(search || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-nouvie-blue hover:underline text-sm"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredProducts.map((product) => {
          const quantity = getItemQuantity(product.id)
          const isInCart = quantity > 0
          const isLowStock = product.stock <= (product.minStock || 5)
          const isOutOfStock = product.stock === 0
          const wasJustAdded = justAdded === product.id

          return (
            <div
              key={product.id}
              className={`relative border rounded-lg p-4 transition-all ${
                isInCart
                  ? 'border-nouvie-blue bg-nouvie-pale-blue/10'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isOutOfStock ? 'opacity-60' : ''}`}
            >
              {/* "Añadido ✓" Flash */}
              {wasJustAdded && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-lg animate-fade-out z-10">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Añadido
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {product.category}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm">
                    <span className="font-semibold text-nouvie-blue">
                      {formatCOP(product.price)}
                    </span>
                    <span className="text-gray-500">
                      por {product.unit}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-red-600 font-medium">🔴 Agotado</span>
                    ) : isLowStock ? (
                      <span className="text-amber-600">⚠️ Stock: {product.stock}</span>
                    ) : (
                      <span className="text-gray-400">Stock: {product.stock}</span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isInCart ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDecrement(product.id)}
                        disabled={disabled}
                        className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xl font-bold text-gray-700 transition-colors"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-bold text-lg text-nouvie-blue">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleIncrement(product.id)}
                        disabled={disabled || isOutOfStock}
                        className="w-10 h-10 rounded-full bg-nouvie-blue hover:bg-nouvie-blue/90 flex items-center justify-center text-xl font-bold text-white transition-colors disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      disabled={disabled || isOutOfStock}
                      className="px-4 py-2 bg-nouvie-turquoise text-white rounded-lg font-medium hover:bg-nouvie-turquoise/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Agregar
                    </button>
                  )}
                </div>
              </div>

              {isInCart && (
                <div className="mt-2 pt-2 border-t border-nouvie-blue/20 flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {quantity} × {formatCOP(product.price)}
                  </span>
                  <span className="font-bold text-nouvie-blue">
                    {formatCOP(quantity * product.price)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}