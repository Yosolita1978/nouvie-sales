'use client'

import { signOut } from 'next-auth/react'

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="btn-outline btn-sm"
    >
      Cerrar Sesión
    </button>
  )
}