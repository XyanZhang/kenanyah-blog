import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '关于',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen pl-24 pr-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-line-primary bg-surface-glass p-8 backdrop-blur-sm">
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-content-secondary leading-relaxed">
              欢迎来到我的个人博客！这是一个使用 Next.js 15、React 19、Hono、Prisma 和 PostgreSQL 构建的全栈博客应用。
            </p>
            <p className="text-content-tertiary mt-4">
              我专注于前端与全栈工程实践，喜欢探索新技术并分享学习心得。这个博客既是技术成长记录，也是架构实验与产品打磨的「试验田」。
            </p>

            <h2 className="text-xl font-semibold text-content-primary mt-8 mb-4">技术栈</h2>
            <div className="flex flex-wrap gap-2">
              {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Hono', 'Prisma', 'PostgreSQL', 'pgvector'].map(
                (tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-accent-primary-light px-3 py-1 text-sm text-accent-primary-dark"
                  >
                    {tech}
                  </span>
                ),
              )}
            </div>

            <h2 className="text-xl font-semibold text-content-primary mt-8 mb-4">技术实现难点</h2>
            <ul className="list-disc pl-5 space-y-2 text-content-secondary">
              <li>
                前后端一体化：通过 monorepo 管理 Next.js 前端与 Hono 后端，复用类型定义与校验逻辑，降低接口维护成本。
              </li>
              <li>
                语义搜索能力：使用 PostgreSQL + pgvector 为文章构建向量索引，支持基于语义的内容检索与推荐。
              </li>
              <li>
                可配置首页布局：通过配置化的卡片系统与拖拽布局，实现「所见即所得」的个人主页编排体验。
              </li>
              <li>生产部署链路：结合 Docker、数据库迁移与一键打包脚本，打通从本地开发到线上部署的完整流程。</li>
            </ul>

            <h2 className="text-xl font-semibold text-content-primary mt-8 mb-4">这里都在展示什么</h2>
            <ul className="list-disc pl-5 space-y-2 text-content-secondary">
              <li>技术文章：记录前端工程化、全栈开发、性能优化等方面的实践与思考。</li>
              <li>项目与作品：沉淀日常 side project、组件设计和交互体验上的探索。</li>
              <li>摄影与生活：用图片、文字和音乐，保留一些生活里的细节与情绪。</li>
              <li>碎片化思考：不成文的想法、读书笔记与灵感片段，也会零散地更新在这里。</li>
            </ul>

            <div className="mt-8 text-content-tertiary text-sm space-y-2">
              <p>
                希望这个项目既能帮我系统化地打磨技术能力，也能在多年之后，成为回望当下的一本「电子日记」。
              </p>
              <p className="font-medium">
                网站整体 UI 设计灵感参考自{' '}
                <a
                  href="https://www.yysuni.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-content-secondary"
                >
                  YYsuni
                </a>
                。
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
