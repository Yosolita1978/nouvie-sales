'use client'

import { useState, useEffect } from 'react'

interface DashboardStats {
  customers: number
  products: number
  orders: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard')
        
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }

        const data = await response.json()

        if (data.success) {
          setStats(data.data)
        } else {
          throw new Error('API returned error')
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        setError('Error al cargar las estadísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Panel</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Clientes</h3>
          {loading ? (
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold text-nouvie-blue">{stats?.customers ?? 0}</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Productos</h3>
          {loading ? (
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold text-nouvie-turquoise">{stats?.products ?? 0}</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Pedidos</h3>
          {loading ? (
            <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold text-purple-600">{stats?.orders ?? 0}</p>
          )}
        </div>
      </div>
    </div>
  )
}