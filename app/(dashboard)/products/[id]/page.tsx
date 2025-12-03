'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCOP } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui'

interface ProductWithCount {
  id: string
  name: string
  type: string
  category: string
  unit: string
  price: number
  stock: number
  minStock: number
  active: boolean
  createdAt: string
  orderCount: number
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<ProductWithCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/products/' + productId)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Producto no encontrado')
        } else {
          throw new Error('Failed to fetch product')
        }
        return
      }

      const data = await response.json()

      if (data.success) {
        setProduct(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('Error al cargar el producto')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch('/api/products/' + productId, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setDeleteError(data.error || 'Error al eliminar')
        setDeleting(false)
        return
      }

      router.push('/products')
    } catch (err) {
      console.error('Error deleting product:', err)
      setDeleteError('Error de conexión')
      setDeleting(false)
    }
  }

  function handleCloseDialog() {
    setShowDeleteDialog(false)
    setDeleteError(null)
  }

  function getStockStatus() {
    if (!product) return { label: '', className: '' }
    if (product.stock === 0) {
      return { label: 'Agotado', className: 'badge-danger' }
    }
    if (product.stock <= product.minStock) {
      return { label: 'Stock Bajo', className: 'badge-warning' }
    }
    return { label: 'En Stock', className: 'badge-success' }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="card-padded space-y-4">
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
          El producto que buscas no existe o fue eliminado.
        </p>
        <Link href="/products" className="mt-4 btn-primary inline-block">
          Volver a Productos
        </Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p>Producto no encontrado</p>
      </div>
    )
  }

  const hasOrders = product.orderCount > 0
  const canDelete = !hasOrders && !deleteError
  const stockStatus = getStockStatus()

  let deleteMessage = ''
  if (deleteError) {
    deleteMessage = deleteError
  } else if (hasOrders) {
    deleteMessage = 'Este producto está en ' + product.orderCount + ' pedido' + (product.orderCount !== 1 ? 's' : '') + '. No se puede eliminar.'
  } else {
    deleteMessage = '¿Estás segura de que quieres eliminar ' + product.name + '? Esta acción no se puede deshacer.'
  }

  return (
    <div className="space-y-6">
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
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge-info">{product.category}</span>
            <span className={stockStatus.className}>{stockStatus.label}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          Eliminar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-padded">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Producto
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Precio</dt>
              <dd className="mt-1 text-2xl font-bold text-nouvie-blue">
                {formatCOP(product.price)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Unidad</dt>
              <dd className="mt-1 text-gray-900">{product.unit}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Categoría</dt>
              <dd className="mt-1 text-gray-900">{product.category}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tipo</dt>
              <dd className="mt-1 text-gray-900 capitalize">{product.type}</dd>
            </div>
          </dl>
        </div>

        <div className="card-padded">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Inventario
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Stock Actual</dt>
              <dd className="mt-1">
                <span className="text-2xl font-bold text-gray-900">{product.stock}</span>
                <span className="text-gray-500 ml-2">{product.unit}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Stock Mínimo (alerta)</dt>
              <dd className="mt-1 text-gray-900">{product.minStock} {product.unit}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Estado</dt>
              <dd className="mt-1">
                <span className={stockStatus.className}>{stockStatus.label}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">En pedidos</dt>
              <dd className="mt-1 text-gray-900">
                {product.orderCount} pedido{product.orderCount !== 1 ? 's' : ''}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {product.stock <= product.minStock && product.stock > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-800">
              El stock está por debajo del mínimo. Considera reabastecer este producto.
            </p>
          </div>
        </div>
      )}

      {product.stock === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">
              Este producto está agotado y no se puede agregar a nuevos pedidos.
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDialog}
        onConfirm={canDelete ? handleDelete : handleCloseDialog}
        title="Eliminar Producto"
        message={deleteMessage}
        confirmLabel={canDelete ? 'Eliminar' : 'Entendido'}
        cancelLabel={canDelete ? 'Cancelar' : 'Cerrar'}
        variant={canDelete ? 'danger' : 'default'}
        loading={deleting}
      />
    </div>
  )
}