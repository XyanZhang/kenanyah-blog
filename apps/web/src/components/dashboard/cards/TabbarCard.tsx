'use client'

import { useState } from 'react'
import { DashboardCard, TabbarCardConfig } from '@blog/types'
import { FileText, Info, Camera, FolderOpen } from 'lucide-react'

interface TabbarCardProps {
  card: DashboardCard
}

type TabKey = 'recent' | 'about' | 'photography' | 'projects'

interface TabItem {
  key: TabKey
  label: string
  icon: React.ReactNode
}

const tabs: TabItem[] = [
  { key: 'recent', label: '近期文章', icon: <FileText className="h-4 w-4" /> },
  { key: 'about', label: '关于网站', icon: <Info className="h-4 w-4" /> },
  { key: 'photography', label: '生活摄影', icon: <Camera className="h-4 w-4" /> },
  { key: 'projects', label: '项目合集', icon: <FolderOpen className="h-4 w-4" /> },
]

export function TabbarCard({ card }: TabbarCardProps) {
  const config = card.config as TabbarCardConfig
  const [activeTab, setActiveTab] = useState<TabKey>(config.defaultTab || 'recent')

  return (
    <div className="flex h-full flex-col">
      <nav className="flex gap-1 rounded-xl bg-surface-tertiary/80 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
              transition-all duration-200
              ${
                activeTab === tab.key
                  ? 'bg-surface-primary text-accent-primary shadow-sm'
                  : 'text-content-tertiary hover:bg-surface-glass hover:text-content-primary'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-4 flex-1 overflow-auto">
        <TabContent tab={activeTab} />
      </div>
    </div>
  )
}

function TabContent({ tab }: { tab: TabKey }) {
  switch (tab) {
    case 'recent':
      return <RecentContent />
    case 'about':
      return <AboutContent />
    case 'photography':
      return <PhotographyContent />
    case 'projects':
      return <ProjectsContent />
    default:
      return null
  }
}

function RecentContent() {
  const posts = [
    { title: 'Next.js 15 新特性解析', date: '2026-01-25' },
    { title: 'React Server Components 实战', date: '2026-01-22' },
    { title: 'TypeScript 5.7 类型体操', date: '2026-01-18' },
  ]

  return (
    <ul className="space-y-2">
      {posts.map((post, index) => (
        <li
          key={index}
          className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-surface-hover"
        >
          <span className="font-medium text-content-secondary">{post.title}</span>
          <span className="text-xs text-content-muted">{post.date}</span>
        </li>
      ))}
    </ul>
  )
}

function AboutContent() {
  return (
    <div className="space-y-3 text-sm text-content-secondary">
      <p>这是一个使用 Next.js 15 和 React 19 构建的个人博客网站。</p>
      <p>专注于前端开发、技术分享和生活记录。</p>
      <div className="flex gap-2 pt-2">
        <span className="rounded-full bg-accent-primary-light px-2 py-1 text-xs text-accent-primary-dark">Next.js</span>
        <span className="rounded-full bg-accent-secondary-light px-2 py-1 text-xs text-accent-secondary">React</span>
        <span className="rounded-full bg-accent-tertiary-light px-2 py-1 text-xs text-accent-tertiary">TypeScript</span>
      </div>
    </div>
  )
}

function PhotographyContent() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="aspect-square rounded-lg bg-gradient-to-br from-accent-primary-light to-accent-secondary-light"
        />
      ))}
    </div>
  )
}

function ProjectsContent() {
  const projects = [
    { name: 'Blog', description: '个人博客系统' },
    { name: 'CLI Tool', description: '命令行工具集' },
    { name: 'Component Library', description: 'React 组件库' },
  ]

  return (
    <ul className="space-y-2">
      {projects.map((project, index) => (
        <li
          key={index}
          className="rounded-lg border border-line-primary p-3 transition-colors hover:border-line-hover hover:bg-accent-primary-subtle/50"
        >
          <h4 className="font-medium text-content-primary">{project.name}</h4>
          <p className="text-xs text-content-muted">{project.description}</p>
        </li>
      ))}
    </ul>
  )
}
