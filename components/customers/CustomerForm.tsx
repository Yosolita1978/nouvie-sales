'use client'

import { useState } from 'react'
import type { CustomerListItem } from '@/types'

interface CustomerFormData {
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

function getInitialFormData(customer?: CustomerListItem | null): CustomerFormData {
  if (customer) {
    return {
      cedula: customer.cedula,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      address: customer.address || '',
      city: customer.city || ''
    }
  }
  return {
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
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: Partial<CustomerFormData> = {}

    // Only validate cedula in create mode
    if (!isEditMode) {
      if (!formData.cedula.trim()) {
        newErrors.cedula = 'Cédula es requerida'
      } else if (!/^\d{8,10}$/.test(formData.cedula.trim())) {
        newErrors.cedula = 'Cédula debe tener entre 8 y 10 dígitos'
      }
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
    setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    setApiError(null)

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
          setApiError(`Ya existe un cliente con la cédula ${formData.cedula}`)
        } else if (data.errors) {
          setApiError(data.errors.join(', '))
        } else {
          setApiError(data.message || data.error || (isEditMode ? 'Error al actualizar el cliente' : 'Error al crear el cliente'))
        }
        return
      }

      onSuccess(data.data)
    } catch (err) {
      console.error(isEditMode ? 'Error updating customer:' : 'Error creating customer:', err)
      setApiError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {apiError}
        </div>
      )}

      <div>
        <label htmlFor="cedula" className="label">
          Cédula <span className="text-red-500">*</span>
        </label>
        <input
          id="cedula"
          name="cedula"
          type="text"
          inputMode="numeric"
          value={formData.cedula}
          onChange={handleChange}
          className={`${errors.cedula ? 'input-error' : 'input'} ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="1234567890"
          disabled={loading || isEditMode}
        />
        {isEditMode && (
          <p className="text-xs text-gray-500 mt-1">La cédula no puede ser modificada</p>
        )}
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
          className="flex-1 btn-primary"
        >
          {loading
            ? (isEditMode ? 'Actualizando...' : 'Guardando...')
            : (isEditMode ? 'Actualizar Cliente' : 'Guardar Cliente')
          }
        </button>
      </div>
    </form>
  )
}