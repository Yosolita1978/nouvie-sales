'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui'
import { CustomerForm } from './CustomerForm'
import type { CustomerListItem } from '@/types'

interface CustomerCardProps {
  customer: CustomerListItem
  onCustomerUpdated?: (updatedCustomer: CustomerListItem) => void
}

export function CustomerCard({ customer, onCustomerUpdated }: CustomerCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [currentCustomer, setCurrentCustomer] = useState(customer)

  function handleEditClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsEditModalOpen(true)
  }

  function handleCustomerUpdated(updatedCustomer?: CustomerListItem) {
    setIsEditModalOpen(false)
    if (updatedCustomer) {
      setCurrentCustomer(updatedCustomer)
      onCustomerUpdated?.(updatedCustomer)
    }
  }

  return (
    <>
      <div className="card-clickable p-4 relative group">
        <Link
          href={`/customers/${currentCustomer.id}`}
          className="block"
        >
          {/* Customer Name */}
          <h3 className="font-semibold text-gray-900 text-lg truncate pr-16">
            {currentCustomer.name}
          </h3>

          {/* Cedula Badge */}
          <div className="mt-2">
            <span className="badge-info">
              CC: {currentCustomer.cedula}
            </span>
          </div>

          {/* Contact Info */}
          <div className="mt-3 space-y-1 text-sm text-gray-600">
            {/* Email */}
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="truncate">
                {currentCustomer.email || 'Sin email'}
              </span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span>{currentCustomer.phone}</span>
            </div>

            {/* City */}
            {currentCustomer.city && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{currentCustomer.city}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Edit Button - positioned in top right */}
        <button
          type="button"
          onClick={handleEditClick}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-nouvie-blue hover:bg-nouvie-pale-blue/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Editar cliente"
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cliente"
      >
        <CustomerForm
          customer={currentCustomer}
          mode="edit"
          onSuccess={handleCustomerUpdated}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>
    </>
  )
}
