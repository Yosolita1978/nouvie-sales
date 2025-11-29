import Link from 'next/link'
import { formatCOP, getStockStatus, getStockStatusLabel } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const stockStatus = getStockStatus(product)

  const stockBadgeClasses = {
    'in-stock': 'badge-success',
    'low-stock': 'badge-warning',
    'out-of-stock': 'badge-danger'
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="card-clickable p-4 block"
    >
      {/* Product Name */}
      <h3 className="font-semibold text-gray-900 text-lg truncate">
        {product.name}
      </h3>

      {/* Category Badge */}
      <div className="mt-2">
        <span className="badge-info">
          {product.category}
        </span>
      </div>

      {/* Price and Unit */}
      <div className="mt-3">
        <p className="text-xl font-bold text-nouvie-blue">
          {formatCOP(product.price)}
        </p>
        <p className="text-sm text-gray-500">
          por {product.unit}
        </p>
      </div>

      {/* Stock Info */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{product.stock}</span> en stock
        </div>
        <span className={stockBadgeClasses[stockStatus]}>
          {getStockStatusLabel(stockStatus)}
        </span>
      </div>
    </Link>
  )
}