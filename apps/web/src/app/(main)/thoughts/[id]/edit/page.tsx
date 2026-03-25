import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ThoughtComposeForm } from '@/components/thoughts'

export const metadata: Metadata = {
  title: '编辑思考',
  description: '编辑历史想法',
}

export default async function EditThoughtPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/thoughts"
          className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-accent-primary mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          返回思考流
        </Link>
        <h1 className="text-2xl font-semibold text-content-primary mb-8">
          编辑思考
        </h1>
        <ThoughtComposeForm mode="edit" thoughtId={id} />
      </div>
    </main>
  )
}
