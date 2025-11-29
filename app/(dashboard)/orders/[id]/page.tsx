'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCOP, formatDateTime } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pendiente', badge: 'badge-warning' },
  { value: 'partial', label: 'Parcial', badge: 'badge-info' },
  { value: 'paid', label: 'Pagado', badge: 'badge-success' }
]

const SHIPPING_STATUSES = [
  { value: 'preparing', label: 'Por Enviar', badge: 'badge-warning' },
  { value: 'shipped', label: 'Enviado', badge: 'badge-info' },
  { value: 'delivered', label: 'Entregado', badge: 'badge-success' }
]

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  nequi: 'Nequi',
  bank: 'Transferencia Bancaria',
  link: 'Link de Pago'
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/orders/${orderId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Pedido no encontrado')
        } else {
          throw new Error('Failed to fetch order')
        }
        return
      }

      const data = await response.json()

      if (data.success) {
        setOrder(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      setError('Error al cargar el pedido')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  async function updateStatus(
    type: 'payment' | 'shipping',
    status: string
  ) {
    setUpdating(true)
    setUpdateMessage(null)

    try {
      const body =
        type === 'payment'
          ? { paymentStatus: status }
          : { shippingStatus: status }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        setUpdateMessage(data.error || 'Error al actualizar')
        return
      }

      setOrder(data.data)
      setUpdateMessage(data.message)

      setTimeout(() => setUpdateMessage(null), 3000)
    } catch (err) {
      console.error('Error updating order:', err)
      setUpdateMessage('Error de conexión')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="card-padded space-y-4">
          <div className="h-6 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
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
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
        <Link href="/orders" className="mt-4 btn-primary inline-block">
          Volver a Pedidos
        </Link>
      </div>
    )
  }

  if (!order) return null

  const currentPayment = PAYMENT_STATUSES.find(s => s.value === order.paymentStatus)
  const currentShipping = SHIPPING_STATUSES.find(s => s.value === order.shippingStatus)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {order.orderNumber}
          </h1>
          <p className="text-gray-600 mt-1">
            {formatDateTime(order.orderDate)}
          </p>
        </div>
      </div>

      {/* Update Message */}
      {updateMessage && (
        <div className="bg-nouvie-pale-blue/30 border border-nouvie-blue/20 text-nouvie-navy px-4 py-3 rounded-lg">
          {updateMessage}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Status */}
        <div className="card-padded">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Estado de Pago
          </h2>

          <div className="flex items-center gap-2 mb-4">
            <span className={currentPayment?.badge}>
              {currentPayment?.label}
            </span>
            {order.paymentDate && (
              <span className="text-sm text-gray-500">
                {formatDateTime(order.paymentDate)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PAYMENT_STATUSES.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => updateStatus('payment', status.value)}
                disabled={updating || order.paymentStatus === status.value}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  order.paymentStatus === status.value
                    ? 'bg-nouvie-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {order.paymentStatus !== 'paid' && (
            <p className="mt-3 text-sm text-gray-500">
              Al marcar como &quot;Pagado&quot;, el stock se descontará automáticamente.
            </p>
          )}
        </div>

        {/* Shipping Status */}
        <div className="card-padded">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Estado de Envío
          </h2>

          <div className="flex items-center gap-2 mb-4">
            <span className={currentShipping?.badge}>
              {currentShipping?.label}
            </span>
            {order.shippingDate && (
              <span className="text-sm text-gray-500">
                Enviado: {formatDateTime(order.shippingDate)}
              </span>
            )}
            {order.deliveryDate && (
              <span className="text-sm text-gray-500">
                Entregado: {formatDateTime(order.deliveryDate)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {SHIPPING_STATUSES.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => updateStatus('shipping', status.value)}
                disabled={updating || order.shippingStatus === status.value}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  order.shippingStatus === status.value
                    ? 'bg-nouvie-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="card-padded">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Cliente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Nombre</p>
            <p className="font-medium">{order.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cédula</p>
            <p className="font-medium">{order.customer.cedula}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Teléfono</p>
            <p className="font-medium">{order.customer.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{order.customer.email || 'No registrado'}</p>
          </div>
          {order.customer.address && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Dirección</p>
              <p className="font-medium">
                {order.customer.address}
                {order.customer.city && `, ${order.customer.city}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="card-padded">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Productos
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                  Producto
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                  Precio
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                  Cantidad
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 px-2">
                    <p className="font-medium text-gray-900">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.product.category}
                    </p>
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600">
                    {formatCOP(item.unitPrice)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-600">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-gray-900">
                    {formatCOP(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCOP(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA (19%)</span>
            <span className="font-medium">{formatCOP(order.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-nouvie-blue">{formatCOP(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-padded">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Método de Pago
          </h2>
          <p className="text-gray-600">
            {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
          </p>
        </div>

        {order.notes && (
          <div className="card-padded">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Notas
            </h2>
            <p className="text-gray-600">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}