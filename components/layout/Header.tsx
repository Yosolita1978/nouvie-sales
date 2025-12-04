'use client'

import { useState } from 'react'
import Image from 'next/image'
import { signOut } from 'next-auth/react'

interface HeaderProps {
  userName: string
}

export function Header({ userName }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
        {/* Mobile logo */}
        <div className="md:hidden">
          <Image
            src="/nouvie-logo.png"
            alt="Nouvie"
            width={100}
            height={32}
            priority
          />
        </div>
        
        {/* Desktop title */}
        <h1 className="hidden md:block text-lg md:text-xl font-semibold text-nouvie-navy">
          Herramienta de Administración de Nouvie Ventas
        </h1>
        
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1 -m-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Menú de usuario"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-nouvie-blue to-nouvie-turquoise text-white rounded-full flex items-center justify-center font-medium shadow-sm text-lg">
              {userName.charAt(0).toUpperCase()}
            </div>
            <svg className="h-5 w-5 text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                <div className="px-4 py-4 bg-gradient-to-r from-nouvie-pale-blue/30 to-white border-b border-gray-100">
                  <p className="text-base font-medium text-nouvie-navy">{userName}</p>
                  <p className="text-sm text-nouvie-light-blue">Administrador</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full px-4 py-4 text-left text-base text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors flex items-center gap-3"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}