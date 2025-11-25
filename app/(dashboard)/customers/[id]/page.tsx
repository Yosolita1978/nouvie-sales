'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CustomerListItem } from '@/types'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<CustomerListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCustomer() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/customers')
        
        if (!response.ok) {
          throw new Error('Failed to fetch customer')
        }

        const data = await response.json()
        
        if (data.success) {
          const found = data.data.find((c: CustomerListItem) => c.id === customerId)
          if (found) {
            setCustomer(found)
          } else {
            setError('Cliente no encontrado')
          }
        } else {
          throw new Error('API returned error')
        }
      } catch (err) {
        console.error('Error fetching customer:', err)
        setError('Error al cargar el cliente')
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      fetchCustomer()
    }
  }, [customerId])

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
          El cliente que buscas no existe o fue eliminado.
        </p>
        <Link href="/customers" className="mt-4 btn-primary inline-block">
          Volver a Clientes
        </Link>
      </div>
    )
  }

  if (!customer) {
    return <div>Cliente no encontrado</div>
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
          <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge-info">CC: {customer.cedula}</span>
            <span className="badge-success">Activo</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={() => alert('Editar cliente - próximo paso!')}
        >
          Editar
        </button>
      </div>

      <div className="card-padded">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Información de Contacto
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-gray-900">
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="text-nouvie-blue hover:underline"
                >
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
              <a
                href={`tel:${customer.phone}`}
                className="text-nouvie-blue hover:underline"
              >
                {customer.phone}
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

      <div className="card-padded">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pedidos de este Cliente
        </h2>
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
          <p className="text-sm">Los pedidos de este cliente aparecerán aquí</p>
        </div>
      </div>
    </div>
  )
}