import type { Metadata } from 'next'
import { BlogEditor } from '@/components/blog/BlogEditor'

export const metadata: Metadata = {
  title: '写文章',
}

export default function BlogEditorPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] w-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-content-primary">
              写文章
            </h1>
            <p className="text-sm text-content-tertiary">
              支持 Markdown 编辑、实时预览和图片上传，后续会在此接入 AI
              写作助手能力。
            </p>
          </div>
          <BlogEditor />
        </div>
      </div>
    </main>
  )
}

