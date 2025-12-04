'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCOP, formatDate } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui'

interface CustomerOrder {
  id: string
  orderNumber: string
  total: number
  paymentStatus: string
  shippingStatus: string
  createdAt: string
}

interface CustomerWithOrders {
  id: string
  cedula: string
  name: string
  email: string | null
  phone: string
  address: string | null
  city: string | null
  active: boolean
  createdAt: string
  orders: CustomerOrder[]
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado'
}

const PAYMENT_STATUS_BADGES: Record<string, string> = {
  pending: 'badge-warning',
  partial: 'badge-info',
  paid: 'badge-success'
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<CustomerWithOrders | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchCustomer = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/customers/${customerId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Cliente no encontrado')
        } else {
          throw new Error('Failed to fetch customer')
        }
        return
      }

      const data = await response.json()

      if (data.success) {
        setCustomer(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Error fetching customer:', err)
      setError('Error al cargar el cliente')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setDeleteError(data.error || 'Error al eliminar')
        setDeleting(false)
        return
      }

      router.push('/customers')
    } catch (err) {
      console.error('Error deleting customer:', err)
      setDeleteError('Error de conexión')
      setDeleting(false)
    }
  }

  function handleCloseDialog() {
    setShowDeleteDialog(false)
    setDeleteError(null)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="bg-white rounded-xl p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-40"></div>
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
        <p className="mt-2 text-gray-500">
          El cliente que buscas no existe o fue eliminado.
        </p>
        <Link href="/customers" className="mt-4 btn-primary inline-block">
          Volver a Clientes
        </Link>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p>Cliente no encontrado</p>
      </div>
    )
  }

  const hasOrders = customer.orders.length > 0
  const canDelete = !hasOrders && !deleteError

  let deleteMessage = ''
  if (deleteError) {
    deleteMessage = deleteError
  } else if (hasOrders) {
    deleteMessage = `Este cliente tiene ${customer.orders.length} pedido${customer.orders.length !== 1 ? 's' : ''}. Debes eliminar los pedidos primero.`
  } else {
    deleteMessage = `¿Estás segura de que quieres eliminar a ${customer.name}? Esta acción no se puede deshacer.`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-nouvie-blue mb-1 py-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Atrás
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{customer.name}</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="flex-shrink-0 px-4 py-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors font-medium"
          >
            Eliminar
          </button>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge-info">CC: {customer.cedula}</span>
          <span className="badge-success">Activo</span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Información de Contacto
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-gray-900">
              {customer.email ? (
                <a href={'mailto:' + customer.email} className="text-nouvie-blue hover:underline break-all">
                  {customer.email}
                </a>
              ) : (
                <span className="text-gray-400">No registrado</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
            <dd className="mt-1 text-gray-900">
              <a href={'tel:' + customer.phone} className="text-nouvie-blue hover:underline inline-flex items-center gap-2 py-1">
                📞 {customer.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Dirección</dt>
            <dd className="mt-1 text-gray-900">
              {customer.address ? customer.address : <span className="text-gray-400">No registrada</span>}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Ciudad</dt>
            <dd className="mt-1 text-gray-900">
              {customer.city ? customer.city : <span className="text-gray-400">No registrada</span>}
            </dd>
          </div>
        </dl>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Pedidos de este Cliente
          </h2>
          {hasOrders && (
            <span className="text-sm text-gray-500">
              {customer.orders.length} pedido{customer.orders.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!hasOrders && (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-2">No hay pedidos registrados</p>
            <Link href="/orders/new" className="mt-4 btn-primary inline-block">
              Crear Pedido
            </Link>
          </div>
        )}

        {hasOrders && (
          <div className="divide-y divide-gray-100 -mx-4 sm:-mx-6">
            {customer.orders.map((order) => (
              <Link
                key={order.id}
                href={'/orders/' + order.id}
                className="flex items-center justify-between py-4 px-4 sm:px-6 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {order.orderNumber}
                    </span>
                    <span className={PAYMENT_STATUS_BADGES[order.paymentStatus]}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <span className="font-semibold text-nouvie-blue text-lg flex-shrink-0">
                  {formatCOP(order.total)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDialog}
        onConfirm={canDelete ? handleDelete : handleCloseDialog}
        title="Eliminar Cliente"
        message={deleteMessage}
        confirmLabel={canDelete ? 'Eliminar' : 'Entendido'}
        cancelLabel={canDelete ? 'Cancelar' : 'Cerrar'}
        variant={canDelete ? 'danger' : 'default'}
        loading={deleting}
      />
    </div>
  )
}