import type { Metadata } from 'next'
import { Nav } from '@/components/navigation'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Blog',
    template: '%s | Blog',
  },
  description: 'A modern blog application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <div style={{ viewTransitionName: 'page-content' }}>{children}</div>
      </body>
    </html>
  )
}
