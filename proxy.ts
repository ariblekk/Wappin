import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('appwrite-session')
  const { pathname } = request.nextUrl

  // 1. Jika mencoba mengakses dashboard tanpa session
  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Jika mencoba mengakses login saat session aktif
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Tentukan jalur mana saja yang akan diproses oleh middleware
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
