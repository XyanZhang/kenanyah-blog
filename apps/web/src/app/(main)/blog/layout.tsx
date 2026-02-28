import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '博客',
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
