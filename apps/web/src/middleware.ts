import { NextResponse, type NextRequest } from 'next/server'

const WORKSPACE_PREFIX = '/workspace'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (!pathname.startsWith(WORKSPACE_PREFIX)) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get('access_token')?.value
  if (accessToken) {
    return NextResponse.next()
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/workspace/:path*'],
}
