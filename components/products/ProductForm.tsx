'use client'

import { useState } from 'react'
import { formatCOP } from '@/lib/utils'

interface ProductFormData {
  name: string
  category: string
  unit: string
  price: string
  stock: string
  minStock: string
}

interface ProductFormProps {
  onSuccess: (productId: string) => void
  onCancel: () => void
}

const CATEGORIES = [
  { value: '', label: 'Seleccionar categoría...' },
  { value: 'Productos', label: 'Productos' },
  { value: 'Envases', label: 'Envases' },
  { value: 'Etiquetas', label: 'Etiquetas' },
  { value: 'Merchandising', label: 'Merchandising' },
  { value: 'Otros', label: 'Otros' }
]

const UNITS = [
  { value: '', label: 'Seleccionar unidad...' },
  { value: 'und', label: 'Unidad (und)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'litro', label: 'Litro' },
  { value: 'galón', label: 'Galón' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramos (g)' }
]

const initialFormData: ProductFormData = {
  name: '',
  category: '',
  unit: '',
  price: '',
  stock: '0',
  minStock: '5'
}

export function ProductForm({ onSuccess, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<ProductFormData>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: Partial<ProductFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nombre es requerido'
    }

    if (!formData.category) {
      newErrors.category = 'Categoría es requerida'
    }

    if (!formData.unit) {
      newErrors.unit = 'Unidad es requerida'
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Precio es requerido'
    } else {
      const priceNum = parseFloat(formData.price)
      if (isNaN(priceNum) || priceNum < 0) {
        newErrors.price = 'Precio debe ser un número positivo'
      }
    }

    if (formData.stock.trim()) {
      const stockNum = parseInt(formData.stock)
      if (isNaN(stockNum) || stockNum < 0) {
        newErrors.stock = 'Stock debe ser un número positivo'
      }
    }

    if (formData.minStock.trim()) {
      const minStockNum = parseInt(formData.minStock)
      if (isNaN(minStockNum) || minStockNum < 0) {
        newErrors.minStock = 'Stock mínimo debe ser un número positivo'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
    setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    setApiError(null)

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0,
          minStock: parseInt(formData.minStock) || 5
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors) {
          setApiError(data.errors.join(', '))
        } else {
          setApiError(data.message || 'Error al crear el producto')
        }
        return
      }

      onSuccess(data.data.id)
    } catch (err) {
      console.error('Error creating product:', err)
      setApiError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const pricePreview = formData.price
    ? formatCOP(parseFloat(formData.price) || 0)
    : null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}

      <div>
        <label htmlFor="name" className="label">
          Nombre del Producto <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'input-error' : 'input'}
          placeholder="Shampoo Anticaspa 500ml"
          disabled={loading}
        />
        {errors.name && <p className="error-message">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="label">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={errors.category ? 'select border-red-500' : 'select'}
            disabled={loading}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.category && <p className="error-message">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="unit" className="label">
            Unidad <span className="text-red-500">*</span>
          </label>
          <select
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className={errors.unit ? 'select border-red-500' : 'select'}
            disabled={loading}
          >
            {UNITS.map(unit => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
          {errors.unit && <p className="error-message">{errors.unit}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="price" className="label">
          Precio (COP) <span className="text-red-500">*</span>
        </label>
        <input
          id="price"
          name="price"
          type="number"
          inputMode="numeric"
          min="0"
          step="100"
          value={formData.price}
          onChange={handleChange}
          className={errors.price ? 'input-error' : 'input'}
          placeholder="45000"
          disabled={loading}
        />
        {pricePreview && !errors.price && (
          <p className="text-sm text-gray-500 mt-1">{pricePreview}</p>
        )}
        {errors.price && <p className="error-message">{errors.price}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="stock" className="label">
            Stock Actual
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            inputMode="numeric"
            min="0"
            value={formData.stock}
            onChange={handleChange}
            className={errors.stock ? 'input-error' : 'input'}
            placeholder="0"
            disabled={loading}
          />
          {errors.stock && <p className="error-message">{errors.stock}</p>}
        </div>

        <div>
          <label htmlFor="minStock" className="label">
            Stock Mínimo (alerta)
          </label>
          <input
            id="minStock"
            name="minStock"
            type="number"
            inputMode="numeric"
            min="0"
            value={formData.minStock}
            onChange={handleChange}
            className={errors.minStock ? 'input-error' : 'input'}
            placeholder="5"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Recibirás alertas cuando el stock baje de este número
          </p>
          {errors.minStock && <p className="error-message">{errors.minStock}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 btn-outline"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 btn-primary"
        >
          {loading ? 'Guardando...' : 'Guardar Producto'}
        </button>
      </div>
    </form>
  )
}