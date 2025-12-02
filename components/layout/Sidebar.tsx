'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/dashboard',
    label: 'Panel',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    href: '/customers',
    label: 'Clientes',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    href: '/products',
    label: 'Productos',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    href: '/orders',
    label: 'Pedidos',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  }
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    if (href === '/orders') {
      return pathname === '/orders' || pathname.startsWith('/orders/')
    }
    return pathname.startsWith(href)
  }

  function isNewOrder(): boolean {
    return pathname === '/orders/new'
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <Image
              src="/nouvie-logo.png"
              alt="Nouvie"
              width={140}
              height={45}
              priority
            />
          </div>

          {/* Primary Action: Nuevo Pedido */}
          <div className="mt-6 px-3">
            <Link
              href="/orders/new"
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                isNewOrder()
                  ? 'bg-nouvie-turquoise text-white'
                  : 'bg-gradient-to-r from-nouvie-turquoise to-nouvie-light-blue text-white hover:opacity-90'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Pedido
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex-1 px-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href) && !isNewOrder()
                    ? 'bg-gradient-to-r from-nouvie-blue to-nouvie-light-blue text-white'
                    : 'text-gray-700 hover:bg-nouvie-pale-blue/30'
                }`}
              >
                <span className={isActive(item.href) && !isNewOrder() ? 'text-white' : 'text-nouvie-light-blue group-hover:text-nouvie-blue'}>
                  {item.icon}
                </span>
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Tagline at bottom */}
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-nouvie-light-blue italic text-center">
            The Gift From Nature
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16 pb-safe">
          {/* Regular nav items */}
          {navItems.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.href) && !isNewOrder()
                  ? 'text-nouvie-blue'
                  : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className={`text-xs mt-1 ${isActive(item.href) && !isNewOrder() ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          ))}

          {/* Center: Nuevo Pedido (prominent) */}
          <Link
            href="/orders/new"
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <div className={`flex items-center justify-center w-12 h-12 rounded-full -mt-4 shadow-lg ${
              isNewOrder()
                ? 'bg-nouvie-turquoise'
                : 'bg-gradient-to-r from-nouvie-turquoise to-nouvie-light-blue'
            }`}>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className={`text-xs mt-1 ${isNewOrder() ? 'font-medium text-nouvie-turquoise' : 'text-gray-400'}`}>
              Nuevo
            </span>
          </Link>

          {/* Remaining nav items */}
          {navItems.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.href) && !isNewOrder()
                  ? 'text-nouvie-blue'
                  : 'text-gray-400'
              }`}
            >
              {item.icon}
              <span className={`text-xs mt-1 ${isActive(item.href) && !isNewOrder() ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}