'use client'

import { useState } from 'react'
import { CustomerSelect } from '@/components/customers'
import { ProductPicker } from './ProductPicker'
import { formatCOP } from '@/lib/utils'
import type { CustomerListItem, Product, CartItem, CreateOrderRequest } from '@/types'

const TAX_RATE = 0.19

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'bank', label: 'Transferencia Bancaria' },
  { value: 'link', label: 'Link de Pago' }
]

interface OrderFormProps {
  onSuccess: (orderId: string) => void
  onCancel: () => void
}

export function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const [customer, setCustomer] = useState<CustomerListItem | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const tax = Math.round(subtotal * TAX_RATE)
  const total = subtotal + tax

  function handleAddToCart(product: Product, quantity: number) {
    setCart(prev => [
      ...prev,
      {
        product,
        quantity,
        subtotal: product.price * quantity
      }
    ])
  }

  function handleUpdateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      handleRemoveFromCart(productId)
      return
    }

    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity, subtotal: item.product.price * quantity }
          : item
      )
    )
  }

  function handleRemoveFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  function handleCustomerSelect(selected: CustomerListItem | null) {
    setCustomer(selected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!customer) {
      setError('Selecciona un cliente')
      return
    }

    if (cart.length === 0) {
      setError('Agrega al menos un producto')
      return
    }

    if (!paymentMethod) {
      setError('Selecciona un método de pago')
      return
    }

    setLoading(true)

    try {
      const orderData: CreateOrderRequest = {
        customerId: customer.id,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price
        })),
        paymentMethod: paymentMethod as 'cash' | 'nequi' | 'bank' | 'link',
        notes: notes || undefined
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al crear el pedido')
        return
      }

      onSuccess(data.data.id)
    } catch (err) {
      console.error('Error creating order:', err)
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="label">
          Cliente <span className="text-red-500">*</span>
        </label>
        <CustomerSelect
          onSelect={handleCustomerSelect}
          selected={customer}
          disabled={loading}
        />
      </div>

      <div>
        <label className="label">
          Productos <span className="text-red-500">*</span>
        </label>
        <ProductPicker
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveFromCart={handleRemoveFromCart}
        />
      </div>

      {cart.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCOP(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA (19%)</span>
            <span className="font-medium">{formatCOP(tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-nouvie-blue">{formatCOP(total)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="label">
          Método de Pago <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => setPaymentMethod(method.value)}
              disabled={loading}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                paymentMethod === method.value
                  ? 'border-nouvie-blue bg-nouvie-blue/5 text-nouvie-blue'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="label">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input"
          placeholder="Instrucciones especiales, dirección de entrega, etc."
          disabled={loading}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 btn-outline"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || cart.length === 0}
          className="flex-1 btn-primary"
        >
          {loading ? 'Creando...' : `Crear Pedido • ${formatCOP(total)}`}
        </button>
      </div>
    </form>
  )
}