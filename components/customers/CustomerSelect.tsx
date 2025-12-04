'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { Modal } from '@/components/ui'
import { CustomerForm } from './CustomerForm'
import type { CustomerListItem, CustomersApiResponse } from '@/types'

interface CustomerSelectProps {
  onSelect: (customer: CustomerListItem) => void
  selected?: CustomerListItem | null
  placeholder?: string
  disabled?: boolean
}

export function CustomerSelect({
  onSelect,
  selected = null,
  placeholder = 'Buscar por cédula o nombre...',
  disabled = false
}: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    async function fetchCustomers() {
      if (debouncedSearch.length < 2) {
        setCustomers([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/customers?search=${encodeURIComponent(debouncedSearch)}`
        )

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
        setError('Error al buscar clientes')
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [debouncedSearch])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function handleSelect(customer: CustomerListItem) {
    onSelect(customer)
    setIsOpen(false)
    setSearch('')
    setCustomers([])
  }

  function handleChange() {
    onSelect(null as unknown as CustomerListItem)
    setIsOpen(true)
    setSearch('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  function handleOpenNewCustomerModal() {
    setIsModalOpen(true)
    setIsOpen(false)
  }

  async function handleCustomerCreated() {
    setIsModalOpen(false)
    
    try {
      const response = await fetch('/api/customers')
      const data: CustomersApiResponse = await response.json()
      
      if (data.success && data.data.length > 0) {
        const sortedCustomers = [...data.data].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return dateB - dateA
        })
        
        const newestCustomer = sortedCustomers[0]
        onSelect(newestCustomer)
      }
    } catch (err) {
      console.error('Error fetching new customer:', err)
    }
  }

  if (selected) {
    return (
      <div className="card p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-gray-900 truncate">
              {selected.name}
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Cédula:</span> {selected.cedula}
              </p>
              <p>
                <span className="font-medium">Teléfono:</span> {selected.phone}
              </p>
              {selected.city && (
                <p>
                  <span className="font-medium">Ciudad:</span> {selected.city}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleChange}
            disabled={disabled}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-nouvie-blue border-2 border-nouvie-blue rounded-lg hover:bg-nouvie-blue hover:text-white active:bg-nouvie-navy transition-colors"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Search Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="input pr-12"
            autoComplete="off"
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
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
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto overscroll-contain">
            {/* Add New Customer Button */}
            <button
              type="button"
              onClick={handleOpenNewCustomerModal}
              className="w-full px-4 py-4 text-left bg-nouvie-pale-blue/20 hover:bg-nouvie-pale-blue/30 active:bg-nouvie-pale-blue/40 border-b border-gray-200 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-nouvie-blue rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-nouvie-blue">Nuevo Cliente</p>
                <p className="text-sm text-gray-500">Crear un cliente nuevo</p>
              </div>
            </button>

            {/* Helper text */}
            {search.length > 0 && search.length < 2 && (
              <div className="px-4 py-4 text-center text-gray-500">
                Escribe al menos 2 caracteres para buscar
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="px-4 py-4 text-center text-red-600">
                {error}
              </div>
            )}

            {/* Loading state */}
            {loading && !error && search.length >= 2 && (
              <div className="px-4 py-4 text-center text-gray-500">
                Buscando...
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && search.length >= 2 && customers.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">
                <p className="font-medium">No se encontraron clientes</p>
                <button
                  type="button"
                  onClick={handleOpenNewCustomerModal}
                  className="mt-2 text-nouvie-blue hover:underline font-medium"
                >
                  Crear cliente nuevo →
                </button>
              </div>
            )}

            {/* Results */}
            {!loading && !error && customers.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(customer)}
                      className="w-full px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 focus:bg-gray-50 focus:outline-none transition-colors"
                    >
                      <p className="font-medium text-gray-900">
                        {customer.name}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm text-gray-500">
                        <span>CC: {customer.cedula}</span>
                        {customer.city && <span>{customer.city}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Cancel button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setSearch('')
              }}
              className="w-full px-4 py-4 text-center text-gray-600 hover:text-gray-800 active:bg-gray-100 bg-gray-50 border-t border-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* New Customer Modal */}
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
    </>
  )
}