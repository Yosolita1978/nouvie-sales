'use client'

import { useState, useEffect, useRef } from 'react'
import type { CustomerListItem } from '@/types'

type DocumentType = 'cedula' | 'nit' | 'cedula_extranjeria'

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'cedula', label: 'Cédula' },
  { value: 'nit', label: 'NIT' },
  { value: 'cedula_extranjeria', label: 'Cédula Extranjería' },
]

interface CustomerFormData {
  documentType: DocumentType
  cedula: string
  name: string
  email: string
  phone: string
  address: string
  city: string
}

interface CustomerFormProps {
  onSuccess: (updatedCustomer?: CustomerListItem) => void
  onCancel: () => void
  customer?: CustomerListItem | null
  mode?: 'create' | 'edit'
}

// Status banner shown at the top of the form.
// An "error" banner can optionally offer a "Reintentar" (retry) button.
interface FormBanner {
  type: 'error' | 'success'
  message: string
  canRetry: boolean
}

function getInitialFormData(customer?: CustomerListItem | null): CustomerFormData {
  if (customer) {
    return {
      documentType: (customer.documentType as DocumentType) || 'cedula',
      cedula: customer.cedula,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      address: customer.address || '',
      city: customer.city || ''
    }
  }
  return {
    documentType: 'cedula',
    cedula: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  }
}

export function CustomerForm({ onSuccess, onCancel, customer, mode = 'create' }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>(() => getInitialFormData(customer))
  const isEditMode = mode === 'edit'
  const [errors, setErrors] = useState<Partial<CustomerFormData>>({})
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
    const newErrors: Partial<CustomerFormData> = {}

    if (!formData.cedula.trim()) {
      newErrors.cedula = 'Número de documento es requerido'
    } else if (formData.documentType === 'cedula' && !/^\d{6,10}$/.test(formData.cedula.trim())) {
      newErrors.cedula = 'Cédula debe tener entre 6 y 10 dígitos'
    } else if (formData.documentType === 'nit' && !/^\d{9,10}$/.test(formData.cedula.trim())) {
      newErrors.cedula = 'NIT debe tener entre 9 y 10 dígitos'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nombre es requerido'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Email no es válido'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Teléfono es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof CustomerFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
    setBanner(null)
  }

  // Sends the data to the API. Kept separate from handleSubmit so the
  // "Reintentar" button can re-send the same data without re-validating.
  async function saveCustomer() {
    setLoading(true)
    setBanner(null)

    try {
      const url = isEditMode ? `/api/customers/${customer?.id}` : '/api/customers'
      const method = isEditMode ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setBanner({
            type: 'error',
            message: `Ya existe un cliente con la cédula ${formData.cedula}.`,
            canRetry: false
          })
        } else if (data.errors) {
          setBanner({ type: 'error', message: data.errors.join('. '), canRetry: false })
        } else {
          // Server or unknown error — worth retrying.
          setBanner({
            type: 'error',
            message:
              data.message ||
              data.error ||
              (isEditMode ? 'No se pudo actualizar el cliente.' : 'No se pudo crear el cliente.'),
            canRetry: true
          })
        }
        return
      }

      // Saved. Re-read the customer from the API to confirm what actually
      // persisted, so what we show equals what is in the database.
      let savedCustomer: CustomerListItem = data.data
      if (isEditMode && customer?.id) {
        try {
          const verify = await fetch(`/api/customers/${customer.id}`)
          if (verify.ok) {
            const verifyData = await verify.json()
            if (verifyData.success) {
              savedCustomer = verifyData.data
            }
          }
        } catch {
          // If the confirmation read fails, fall back to the save response.
        }
      }

      setBanner({
        type: 'success',
        message: isEditMode ? 'Cliente actualizado exitosamente.' : 'Cliente creado exitosamente.',
        canRetry: false
      })

      // Brief pause so the success message is seen before the modal closes.
      window.setTimeout(() => onSuccess(savedCustomer), 900)
    } catch (err) {
      console.error(isEditMode ? 'Error updating customer:' : 'Error creating customer:', err)
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

    saveCustomer()
  }

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
                  onClick={saveCustomer}
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
        <label className="label">
          Tipo de Documento <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, documentType: type.value }))}
              disabled={formDisabled}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.documentType === type.value
                  ? 'bg-nouvie-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              } disabled:opacity-50`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="cedula" className="label">
          {formData.documentType === 'nit' ? 'NIT' : formData.documentType === 'cedula_extranjeria' ? 'Cédula de Extranjería' : 'Cédula'} <span className="text-red-500">*</span>
        </label>
        <input
          id="cedula"
          name="cedula"
          type="text"
          inputMode={formData.documentType === 'cedula_extranjeria' ? 'text' : 'numeric'}
          value={formData.cedula}
          onChange={handleChange}
          className={errors.cedula ? 'input-error' : 'input'}
          placeholder={formData.documentType === 'nit' ? '900123456' : formData.documentType === 'cedula_extranjeria' ? 'Número de documento' : '1234567890'}
          disabled={formDisabled}
        />
        {errors.cedula && <p className="error-message">{errors.cedula}</p>}
      </div>

      <div>
        <label htmlFor="name" className="label">
          Nombre Completo <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'input-error' : 'input'}
          placeholder="María García López"
          disabled={formDisabled}
        />
        {errors.name && <p className="error-message">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'input-error' : 'input'}
          placeholder="maria@ejemplo.com"
          disabled={formDisabled}
        />
        {errors.email && <p className="error-message">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="label">
          Teléfono <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={formData.phone}
          onChange={handleChange}
          className={errors.phone ? 'input-error' : 'input'}
          placeholder="300 123 4567"
          disabled={formDisabled}
        />
        {errors.phone && <p className="error-message">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="address" className="label">
          Dirección
        </label>
        <input
          id="address"
          name="address"
          type="text"
          value={formData.address}
          onChange={handleChange}
          className="input"
          placeholder="Calle 123 #45-67"
          disabled={formDisabled}
        />
      </div>

      <div>
        <label htmlFor="city" className="label">
          Ciudad
        </label>
        <input
          id="city"
          name="city"
          type="text"
          value={formData.city}
          onChange={handleChange}
          className="input"
          placeholder="Bogotá"
          disabled={formDisabled}
        />
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
            ? (isEditMode ? 'Actualizando...' : 'Guardando...')
            : isSuccess
              ? '¡Guardado!'
              : (isEditMode ? 'Actualizar Cliente' : 'Guardar Cliente')
          }
        </button>
      </div>
    </form>
  )
}
