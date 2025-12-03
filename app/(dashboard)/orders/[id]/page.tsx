'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  product: {
    id: string
    name: string
    unit: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  notes: string | null
  createdAt: string
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  }
  items: OrderItem[]
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders/${id}`)
        if (!response.ok) throw new Error('Error al cargar el pedido')
        const data = await response.json()
        if (data.success) {
          setOrder(data.data)
        } else {
          throw new Error(data.error)
        }
      } catch (err) {
        console.error('Error fetching order:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar el pedido')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [id])

  async function handleStatusChange(newStatus: string) {
    if (!order || updating) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Error al actualizar')

      const data = await response.json()
      if (data.success) {
        setOrder(data.data)
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Error al actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      router.push('/orders')
    } catch (err) {
      console.error('Error deleting order:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar el pedido')
      setDeleting(false)
      setShowDeleteDialog(false)
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

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex justify-center items-center min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-nouvie-blue" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Pedido no encontrado'}
        </div>
        <Link href="/orders" className="mt-4 inline-block text-nouvie-blue hover:underline">
          ← Volver a pedidos
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/orders" className="text-sm text-gray-500 hover:text-nouvie-blue">
            ← Volver a pedidos
          </Link>
          <h1 className="text-2xl font-bold text-nouvie-navy mt-1">
            Pedido {order.orderNumber}
          </h1>
          <p className="text-gray-500 text-sm">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
          <div className="space-y-2">
            <p className="font-medium text-nouvie-blue">{order.customer.name}</p>
            {order.customer.phone && (
              <p className="text-gray-600 text-sm">📞 {order.customer.phone}</p>
            )}
            {order.customer.address && (
              <p className="text-gray-600 text-sm">📍 {order.customer.address}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Cambiar Estado</h2>
          <div className="flex flex-wrap gap-2">
            {['pending', 'confirmed', 'delivered', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={updating || order.status === status}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  order.status === status
                    ? statusColors[status]
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Productos</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{item.product.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} {item.product.unit} × {formatCOP(item.unitPrice)}
                </p>
              </div>
              <p className="font-semibold text-nouvie-blue">{formatCOP(item.subtotal)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCOP(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA (19%)</span>
            <span>{formatCOP(order.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-nouvie-blue">
            <span>Total</span>
            <span>{formatCOP(order.total)}</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Notas</h2>
          <p className="text-gray-600">{order.notes}</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Eliminar Pedido"
        message={`¿Estás segura de que quieres eliminar el pedido ${order.orderNumber}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}