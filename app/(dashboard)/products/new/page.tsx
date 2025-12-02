'use client'

import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/products'

export default function NewProductPage() {
  const router = useRouter()

  function handleSuccess() {
    router.push('/products')
  }

  function handleCancel() {
    router.push('/products')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Producto</h1>
        <p className="text-gray-600 mt-1">
          Agrega un producto al catálogo
        </p>
      </div>

      <div className="card-padded">
        <ProductForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}