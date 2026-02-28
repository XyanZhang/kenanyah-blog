import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '写文章',
}

export default function BlogEditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
