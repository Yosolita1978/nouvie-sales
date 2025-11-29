'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatCOP } from '@/lib/utils'
import type { Product, CartItem } from '@/types'

interface ProductPickerProps {
  cart: CartItem[]
  onAddToCart: (product: Product, quantity: number) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveFromCart: (productId: string) => void
}

export function ProductPicker({
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart
}: ProductPickerProps) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)

  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(search, 300)

  // Fetch products when search changes
  useEffect(() => {
    async function fetchProducts() {
      if (debouncedSearch.length < 2) {
        setProducts([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          `/api/products?search=${encodeURIComponent(debouncedSearch)}`
        )
        const data = await response.json()
        if (data.success) {
          setProducts(data.data)
        }
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [debouncedSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product)
    setQuantity(1)
    setIsOpen(false)
    setSearch('')
    setProducts([])
  }

  function handleAddToCart() {
    if (!selectedProduct) return

    // Check if already in cart
    const existingItem = cart.find(item => item.product.id === selectedProduct.id)
    if (existingItem) {
      onUpdateQuantity(selectedProduct.id, existingItem.quantity + quantity)
    } else {
      onAddToCart(selectedProduct, quantity)
    }

    setSelectedProduct(null)
    setQuantity(1)
  }

  function isInCart(productId: string): boolean {
    return cart.some(item => item.product.id === productId)
  }

  return (
    <div className="space-y-4">
      {/* Search and Add Product */}
      <div ref={containerRef} className="relative">
        {selectedProduct ? (
          <div className="border border-nouvie-blue rounded-lg p-4 bg-nouvie-pale-blue/10">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">
                  {formatCOP(selectedProduct.price)} / {selectedProduct.unit}
                </p>
                <p className="text-xs text-gray-500">
                  Stock disponible: {selectedProduct.stock}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm text-gray-600">Cantidad:</label>
              <input
                type="number"
                min="1"
                max={selectedProduct.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input w-24 text-center"
              />
              <button
                type="button"
                onClick={handleAddToCart}
                className="btn-primary"
              >
                Agregar
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar producto por nombre..."
              className="input"
            />

            {isOpen && search.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {loading && (
                  <div className="p-4 text-center text-gray-500">Buscando...</div>
                )}

                {!loading && products.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron productos
                  </div>
                )}

                {!loading && products.length > 0 && (
                  <ul className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          disabled={product.stock === 0}
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            product.stock === 0
                              ? 'bg-gray-50 cursor-not-allowed'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={`font-medium ${product.stock === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                                {product.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {product.category} • {product.stock} disponibles
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-nouvie-blue">
                                {formatCOP(product.price)}
                              </p>
                              {isInCart(product.id) && (
                                <span className="text-xs text-nouvie-turquoise">En carrito</span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {isOpen && search.length > 0 && search.length < 2 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart Items */}
      {cart.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {cart.map((item) => (
            <div key={item.product.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.product.name}</p>
                <p className="text-sm text-gray-500">
                  {formatCOP(item.product.price)} × {item.quantity}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>

                <span className="w-8 text-center font-medium">{item.quantity}</span>

                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product.stock}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              <p className="w-28 text-right font-medium text-gray-900">
                {formatCOP(item.subtotal)}
              </p>

              <button
                type="button"
                onClick={() => onRemoveFromCart(item.product.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {cart.length === 0 && (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="mt-2">No hay productos en el pedido</p>
          <p className="text-sm">Busca y agrega productos arriba</p>
        </div>
      )}
    </div>
  )
}