'use client'

import { ToolCatalogGrid } from '@/components/tools/ToolCatalogGrid'
import { workspaceTools } from '@/components/tools/tool-catalog'

export function WorkspacePageClient() {
  return (
    <main className="min-h-screen px-4 pb-20 sm:px-6 lg:pr-8">
      <div className="mx-auto max-w-5xl">
        <section className="border-b border-black/6 pb-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-content-muted">Workspace</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold tracking-[0] text-content-primary sm:text-5xl">
              个人工作台
            </h1>
            <p className="mt-4 max-w-full text-[15px] leading-7 text-content-secondary">
              这里集中放置资料库配置、PDF 处理、专门学习 Agent 等需要登录后使用的工作流。
            </p>
          </div>
        </section>

        <ToolCatalogGrid tools={workspaceTools} />
      </div>
    </main>
  )
}
