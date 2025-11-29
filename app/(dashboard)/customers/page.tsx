'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { CustomerCard, CustomerGridSkeleton, CustomerForm } from '@/components/customers'
import { Modal } from '@/components/ui/index'
import type { CustomerListItem, CustomersApiResponse } from '@/types'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const url = debouncedSearch
        ? `/api/customers?search=${encodeURIComponent(debouncedSearch)}`
        : '/api/customers'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }

      const data: CustomersApiResponse = await response.json()

      if (data.success) {
        setCustomers(data.data)
      } else {
        throw new Error('API returned error')
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError('Error al cargar los clientes. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  function handleCustomerCreated() {
    setIsModalOpen(false)
    fetchCustomers()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">
            {loading ? (
              'Cargando...'
            ) : (
              `${customers.length} cliente${customers.length !== 1 ? 's' : ''} encontrado${customers.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          + Nuevo Cliente
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o cédula..."
          className="input pl-10"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-red-600 flex-shrink-0"
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
            <p className="text-red-800">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchCustomers()}
            className="mt-3 btn-outline btn-sm"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Customer Grid */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <CustomerGridSkeleton count={9} />}

          {!loading &&
            customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && customers.length === 0 && (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No se encontraron clientes
          </h3>
          <p className="mt-2 text-gray-500">
            {search
              ? `No hay clientes que coincidan con "${search}"`
              : 'Comienza agregando tu primer cliente'}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-4 btn-outline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}

      {/* Create Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Cliente"
      >
        <CustomerForm
          onSuccess={handleCustomerCreated}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}