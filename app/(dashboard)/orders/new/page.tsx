'use client'

import { useRouter } from 'next/navigation'
import { OrderForm } from '@/components/orders'

export default function NewOrderPage() {
  const router = useRouter()

  function handleSuccess(orderId: string) {
    router.push(`/orders/${orderId}`)
  }

  function handleCancel() {
    router.push('/orders')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Pedido</h1>
        <p className="text-gray-600 mt-1">
          Crea un pedido para un cliente
        </p>
      </div>

      <div className="card-padded">
        <OrderForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}