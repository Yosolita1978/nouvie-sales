'use client'

import { useState, useEffect, useRef } from 'react'
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

// Status banner shown at the top of the form.
// An "error" banner can optionally offer a "Reintentar" (retry) button.
interface FormBanner {
  type: 'error' | 'success'
  message: string
  canRetry: boolean
}

const CATEGORIES = [
  { value: '', label: 'Seleccionar categoría...' },
  { value: 'Hogar', label: 'Hogar' },
  { value: 'Capilar', label: 'Capilar' },
  { value: 'Institucional', label: 'Institucional' },
  { value: 'Ordeño', label: 'Ordeño' },
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
  const [banner, setBanner] = useState<FormBanner | null>(null)
  const [loading, setLoading] = useState(false)

  const bannerRef = useRef<HTMLDivElement>(null)

  // Whenever a banner appears, scroll it into view so it can't be missed
  // (important inside the scrollable mobile modal).
  useEffect(() => {
    if (banner) {
      bannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [banner])

  const isSuccess = banner?.type === 'success'
  const formDisabled = loading || isSuccess

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
    setBanner(null)
  }

  // Sends the data to the API. Kept separate from handleSubmit so the
  // "Reintentar" button can re-send the same data without re-validating.
  async function saveProduct() {
    setLoading(true)
    setBanner(null)

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
          setBanner({ type: 'error', message: data.errors.join('. '), canRetry: false })
        } else {
          // Server or unknown error — worth retrying.
          setBanner({
            type: 'error',
            message: data.message || data.error || 'No se pudo crear el producto.',
            canRetry: true
          })
        }
        return
      }

      const newProductId: string = data.data.id

      setBanner({ type: 'success', message: 'Producto creado exitosamente.', canRetry: false })

      // Brief pause so the success message is seen before the modal closes.
      window.setTimeout(() => onSuccess(newProductId), 900)
    } catch (err) {
      console.error('Error creating product:', err)
      setBanner({
        type: 'error',
        message: 'Error de conexión. Revisa tu internet e intenta de nuevo.',
        canRetry: true
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      setBanner({
        type: 'error',
        message: 'Revisa los campos marcados en rojo y vuelve a intentar.',
        canRetry: false
      })
      return
    }

    saveProduct()
  }

  const pricePreview = formData.price
    ? formatCOP(parseFloat(formData.price) || 0)
    : null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Loud, scroll-into-view status banner */}
      {banner && (
        <div
          ref={bannerRef}
          role="alert"
          className={
            banner.type === 'success'
              ? 'rounded-lg border-2 border-green-300 bg-green-50 px-4 py-3'
              : 'rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3'
          }
        >
          <div className="flex items-start gap-3">
            {banner.type === 'success' ? (
              <svg className="h-6 w-6 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className={banner.type === 'success' ? 'font-semibold text-green-800' : 'font-semibold text-red-800'}>
                {banner.message}
              </p>
              {banner.canRetry && (
                <button
                  type="button"
                  onClick={saveProduct}
                  disabled={loading}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
                >
                  {loading ? 'Reintentando...' : 'Reintentar'}
                </button>
              )}
            </div>
          </div>
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
          disabled={formDisabled}
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
            disabled={formDisabled}
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
            disabled={formDisabled}
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
          disabled={formDisabled}
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
            disabled={formDisabled}
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
            disabled={formDisabled}
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
          disabled={formDisabled}
          className="flex-1 btn-primary"
        >
          {loading
            ? 'Guardando...'
            : isSuccess
              ? '¡Guardado!'
              : 'Guardar Producto'
          }
        </button>
      </div>
    </form>
  )
}
