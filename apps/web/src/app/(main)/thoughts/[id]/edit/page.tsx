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
    <main className="min-h-screen px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 md:pl-24 md:pr-8 md:py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/thoughts"
          className="mb-6 inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-accent-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          返回思考流
        </Link>
        <div className="mb-8 rounded-[28px] border border-line-primary bg-surface-glass p-5 backdrop-blur-sm sm:p-6">
          <h1 className="text-2xl font-semibold text-content-primary">
            编辑思考
          </h1>
        </div>
        <ThoughtComposeForm mode="edit" thoughtId={id} />
      </div>
    </main>
  )
}
