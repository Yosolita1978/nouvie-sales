'use client'

import { useState } from 'react'
import { CustomerSelect } from '@/components/customers/CustomerSelect'
import { ProductPicker } from './ProductPicker'
import { OrderSuccess } from './OrderSuccess'
import type { CustomerListItem } from '@/types'

interface OrderItem {
  productId: string
  productName: string
  unit: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface OrderFormProps {
  onSuccess?: (orderId: string) => void
  onCancel?: () => void
}

interface SuccessData {
  orderId: string
  orderNumber: string
}

export function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null)
  const [cart, setCart] = useState<OrderItem[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<SuccessData | null>(null)

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const iva = Math.round(subtotal * 0.19)
  const total = subtotal + iva
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()

    if (!selectedCustomer) {
      setError('Selecciona un cliente')
      return
    }

    if (cart.length === 0) {
      setError('Agrega al menos un producto')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          })),
          paymentMethod: 'cash',
          notes: notes.trim() || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear el pedido')
      }

      const data = await response.json()

      setSuccessData({
        orderId: data.data.id,
        orderNumber: data.data.orderNumber
      })
    } catch (err) {
      console.error('Error creating order:', err)
      setError(err instanceof Error ? err.message : 'Error al crear el pedido')
      setLoading(false)
    }
  }

  function handleSuccessComplete() {
    if (successData && onSuccess) {
      onSuccess(successData.orderId)
    }
  }

  if (successData) {
    return (
      <OrderSuccess
        orderNumber={successData.orderNumber}
        onComplete={handleSuccessComplete}
      />
    )
  }

  const canSubmit = selectedCustomer && cart.length > 0 && !loading

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 pb-32 md:pb-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente <span className="text-red-500">*</span>
          </label>
          <CustomerSelect
            selected={selectedCustomer}
            onSelect={setSelectedCustomer}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Productos <span className="text-red-500">*</span>
          </label>
          <ProductPicker
            items={cart}
            onItemsChange={setCart}
            disabled={loading}
          />
        </div>

        {cart.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Resumen del Pedido</h3>

            <div className="space-y-2 text-sm">
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between">
                  <span className="text-gray-600">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium">{formatCOP(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCOP(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA (19%)</span>
                <span>{formatCOP(iva)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-nouvie-blue">
                <span>Total</span>
                <span>{formatCOP(total)}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
            rows={3}
            className="input"
            placeholder="Instrucciones especiales, dirección de entrega, etc."
          />
        </div>

        <div className="hidden md:flex gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn-outline flex-1"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary flex-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creando...
              </span>
            ) : (
              'Crear Pedido'
            )}
          </button>
        </div>
      </form>

      {/* Mobile Fixed Bottom Bar */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
              </p>
              <p className="text-lg font-bold text-nouvie-blue">
                {formatCOP(total)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              className="px-6 py-3 bg-gradient-to-r from-nouvie-blue to-nouvie-light-blue text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creando...
                </span>
              ) : (
                'Crear Pedido'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}