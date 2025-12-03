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
  paymentStatus: string
  shippingStatus: string
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  invoiceNumber: string | null
  notes: string | null
  createdAt: string
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  } | null
  items: OrderItem[]
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado'
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800'
}

const shippingStatusLabels: Record<string, string> = {
  preparing: 'Por Enviar',
  shipped: 'Enviado',
  delivered: 'Entregado'
}

const shippingStatusColors: Record<string, string> = {
  preparing: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800'
}

const paymentMethodLabels: Record<string, string> = {
  cash: '💵 Efectivo',
  nequi: '📱 Nequi',
  bank: '🏦 Banco',
  link: '🔗 Link'
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
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Invoice number editing state
  const [editingInvoice, setEditingInvoice] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [savingInvoice, setSavingInvoice] = useState(false)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/orders/${id}`)
        if (!response.ok) throw new Error('Error al cargar el pedido')
        const data = await response.json()
        if (data.success) {
          setOrder(data.data)
          setInvoiceNumber(data.data.invoiceNumber || '')
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

  async function handlePaymentStatusChange(newStatus: string) {
    if (!order || updating) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus })
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

  async function handleShippingStatusChange(newStatus: string) {
    if (!order || updating) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingStatus: newStatus })
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

  async function handleSaveInvoiceNumber() {
    if (!order || savingInvoice) return

    setSavingInvoice(true)
    setInvoiceError(null)

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNumber: invoiceNumber.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setInvoiceError(data.error || 'Error al guardar')
        return
      }

      if (data.success) {
        setOrder(data.data)
        setEditingInvoice(false)
      }
    } catch (err) {
      console.error('Error saving invoice number:', err)
      setInvoiceError('Error de conexión')
    } finally {
      setSavingInvoice(false)
    }
  }

  function handleCancelInvoiceEdit() {
    setInvoiceNumber(order?.invoiceNumber || '')
    setInvoiceError(null)
    setEditingInvoice(false)
  }

  async function handleDownloadPdf() {
    if (!order || downloadingPdf) return

    setDownloadingPdf(true)
    try {
      const response = await fetch(`/api/orders/${id}/pdf`)

      if (!response.ok) {
        throw new Error('Error al generar PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${order.orderNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading PDF:', err)
      setError('Error al descargar el PDF')
    } finally {
      setDownloadingPdf(false)
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

  const deleteMessage = `¿Estás segura de que quieres eliminar el pedido ${order.orderNumber}? Esta acción no se puede deshacer.`

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
          <p className="text-gray-500 text-sm" suppressHydrationWarning>
            {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${paymentStatusColors[order.paymentStatus]}`}>
            {paymentStatusLabels[order.paymentStatus]}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${shippingStatusColors[order.shippingStatus]}`}>
            {shippingStatusLabels[order.shippingStatus]}
          </span>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-3 py-1.5 text-sm bg-nouvie-blue text-white rounded-lg hover:bg-nouvie-navy transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {downloadingPdf ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </>
            )}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
          {order.customer ? (
            <div className="space-y-2">
              <Link
                href={`/customers/${order.customer.id}`}
                className="font-medium text-nouvie-blue hover:underline"
              >
                {order.customer.name}
              </Link>
              {order.customer.phone && (
                <p className="text-gray-600 text-sm">📞 {order.customer.phone}</p>
              )}
              {order.customer.address && (
                <p className="text-gray-600 text-sm">📍 {order.customer.address}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Cliente no disponible</p>
          )}
        </div>

        {/* Invoice Number */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Número de Factura</h2>
            {!editingInvoice && (
              <button
                onClick={() => setEditingInvoice(true)}
                className="text-sm text-nouvie-blue hover:underline"
              >
                Editar
              </button>
            )}
          </div>

          {editingInvoice ? (
            <div className="space-y-3">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej: FAC-2025-001"
                className="input"
                disabled={savingInvoice}
              />
              {invoiceError && (
                <p className="text-sm text-red-600">{invoiceError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCancelInvoiceEdit}
                  disabled={savingInvoice}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveInvoiceNumber}
                  disabled={savingInvoice}
                  className="flex-1 px-3 py-2 text-sm bg-nouvie-blue text-white rounded-lg hover:bg-nouvie-navy transition-colors disabled:opacity-50"
                >
                  {savingInvoice ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <p className={order.invoiceNumber ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
              {order.invoiceNumber || 'Sin asignar'}
            </p>
          )}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Método de Pago</h2>
        <p className="text-gray-900">
          {paymentMethodLabels[order.paymentMethod] || order.paymentMethod}
        </p>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Estado de Pago</h2>
        <div className="flex flex-wrap gap-2">
          {(['pending', 'partial', 'paid'] as const).map((status) => (
            <button
              key={status}
              onClick={() => handlePaymentStatusChange(status)}
              disabled={updating || order.paymentStatus === status}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                order.paymentStatus === status
                  ? paymentStatusColors[status]
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {paymentStatusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Shipping Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Estado de Envío</h2>
        <div className="flex flex-wrap gap-2">
          {(['preparing', 'shipped', 'delivered'] as const).map((status) => (
            <button
              key={status}
              onClick={() => handleShippingStatusChange(status)}
              disabled={updating || order.shippingStatus === status}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                order.shippingStatus === status
                  ? shippingStatusColors[status]
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {shippingStatusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
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

      {/* Notes */}
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
        message={deleteMessage}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}