import { withAuth } from 'next-auth/middleware'

const authMiddleware = withAuth({
  pages: {
    signIn: '/login'
  }
})

export function proxy(request: Parameters<typeof authMiddleware>[0], event: Parameters<typeof authMiddleware>[1]) {
  return authMiddleware(request, event)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/customers/:path*',
    '/orders/:path*',
    '/products/:path*'
  ]
}