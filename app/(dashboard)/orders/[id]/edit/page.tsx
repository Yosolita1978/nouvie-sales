'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OrderForm } from '@/components/orders/OrderForm'
import type { OrderWithDetails } from '@/types'

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  function handleSuccess() {
    router.push(`/orders/${id}`)
  }

  function handleCancel() {
    router.push(`/orders/${id}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-nouvie-blue" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error || 'Pedido no encontrado'}
        </div>
        <Link href="/orders" className="mt-4 inline-flex items-center gap-2 text-nouvie-blue hover:underline py-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a pedidos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/orders/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-nouvie-blue mb-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {order.orderNumber}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Editar Pedido</h1>
        <p className="text-gray-600 mt-1">
          {order.orderNumber} — {order.customer?.name}
        </p>
      </div>

      <div className="card-padded">
        <OrderForm
          editOrder={order}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
