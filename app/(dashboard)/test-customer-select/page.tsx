'use client'

import { useState } from 'react'
import { CustomerSelect } from '@/components/customers'
import type { CustomerListItem } from '@/types'

export default function TestCustomerSelectPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null)

  function handleCustomerSelect(customer: CustomerListItem | null) {
    setSelectedCustomer(customer)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Test CustomerSelect</h2>
        <p className="text-gray-600">
          Try searching for customers by name or cédula
        </p>
      </div>

      {/* The CustomerSelect Component */}
      <div className="space-y-2">
        <label className="label">Seleccionar Cliente</label>
        <CustomerSelect
          onSelect={handleCustomerSelect}
          selected={selectedCustomer}
        />
      </div>

      {/* Debug output */}
      <div className="card-padded">
        <h3 className="font-semibold mb-3">Estado Actual:</h3>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
          {JSON.stringify(
            selectedCustomer
              ? {
                  id: selectedCustomer.id,
                  cedula: selectedCustomer.cedula,
                  name: selectedCustomer.name,
                  email: selectedCustomer.email,
                  phone: selectedCustomer.phone,
                  city: selectedCustomer.city
                }
              : null,
            null,
            2
          )}
        </pre>
      </div>

      {/* Usage examples */}
      <div className="card-padded">
        <h3 className="font-semibold mb-3">Búsquedas Sugeridas:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Busca <code className="bg-gray-100 px-2 py-1 rounded">MARIA</code> para ver múltiples resultados</li>
          <li>• Busca <code className="bg-gray-100 px-2 py-1 rounded">39683399</code> para buscar por cédula</li>
          <li>• Busca <code className="bg-gray-100 px-2 py-1 rounded">Bogotá</code> (no encontrará nada - solo busca nombre/cédula)</li>
        </ul>
      </div>
    </div>
  )
}