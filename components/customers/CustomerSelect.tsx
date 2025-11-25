'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { CustomerListItem, CustomersApiResponse } from '@/types'

// Props for the CustomerSelect component
interface CustomerSelectProps {
  /** Called when a customer is selected */
  onSelect: (customer: CustomerListItem) => void
  /** Currently selected customer (optional) */
  selected?: CustomerListItem | null
  /** Placeholder text for the search input */
  placeholder?: string
  /** Whether the component is disabled */
  disabled?: boolean
}

export function CustomerSelect({
  onSelect,
  selected = null,
  placeholder = 'Buscar por cédula o nombre...',
  disabled = false
}: CustomerSelectProps) {
  // State
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(search, 300)

  // Fetch customers when debounced search changes
  useEffect(() => {
    async function fetchCustomers() {
      // Don't search if less than 2 characters
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

  // Close dropdown when clicking outside
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

  // Handle customer selection
  function handleSelect(customer: CustomerListItem) {
    onSelect(customer)
    setIsOpen(false)
    setSearch('')
    setCustomers([])
  }

  // Handle "Cambiar" button click
  function handleChange() {
    onSelect(null as unknown as CustomerListItem) // Clear selection
    setIsOpen(true)
    setSearch('')
    // Focus the input after state update
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // If a customer is selected, show their info
  if (selected) {
    return (
      <div className="card p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-semibold text-lg text-gray-900">
              {selected.name}
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Cédula:</span> {selected.cedula}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {selected.email || 'No registrado'}
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
            className="btn-outline btn-sm"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  // Show search interface
  return (
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
          className="input pr-10"
          autoComplete="off"
        />
        
        {/* Search icon or loading spinner */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
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
      {isOpen && search.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Error state */}
          {error && (
            <div className="p-4 text-center text-red-600">
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && !error && (
            <div className="p-4 text-center text-gray-500">
              Buscando...
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && customers.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No se encontraron clientes
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
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
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
        </div>
      )}

      {/* Helper text */}
      {isOpen && search.length > 0 && search.length < 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          Escribe al menos 2 caracteres para buscar
        </div>
      )}
    </div>
  )
}