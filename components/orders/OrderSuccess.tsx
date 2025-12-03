'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface OrderSuccessProps {
  orderNumber: string
  onComplete: () => void
}

export function OrderSuccess({ orderNumber, onComplete }: OrderSuccessProps) {
  const [phase, setPhase] = useState<'spinning' | 'success'>('spinning')

  useEffect(() => {
    const successTimer = setTimeout(() => {
      setPhase('success')
    }, 1500)

    const redirectTimer = setTimeout(() => {
      onComplete()
    }, 3000)

    return () => {
      clearTimeout(successTimer)
      clearTimeout(redirectTimer)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-4">
      {phase === 'spinning' && (
        <div className="flex flex-col items-center">
          <div className="animate-spin" style={{ animationDuration: '1.5s' }}>
            <Image
              src="/nouvie-spinner.png"
              alt="Procesando..."
              width={80}
              height={80}
              priority
            />
          </div>
          <p className="mt-6 text-gray-500">Creando pedido...</p>
        </div>
      )}

      {phase === 'success' && (
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Pedido Creado!
          </h2>
          <p className="text-xl text-nouvie-blue font-semibold">
            {orderNumber}
          </p>
          <p className="text-gray-400 mt-6 text-sm">
            Redirigiendo...
          </p>
        </div>
      )}
    </div>
  )
}