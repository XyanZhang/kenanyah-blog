'use client'

import { FileText, Eye, MessageCircle } from 'lucide-react'
import { DashboardCard, StatsCardConfig } from '@blog/types'

interface StatsCardProps {
  card: DashboardCard
}

export function StatsCard({ card }: StatsCardProps) {
  const config = card.config as StatsCardConfig

  // Mock data - replace with actual API data
  const stats = {
    posts: 42,
    views: 12543,
    comments: 387,
  }

  const metricConfig = {
    posts: {
      label: 'Posts',
      value: stats.posts,
      icon: FileText,
      color: 'text-accent-secondary',
      bgColor: 'bg-accent-secondary-light',
    },
    views: {
      label: 'Views',
      value: stats.views.toLocaleString(),
      icon: Eye,
      color: 'text-ui-success-text',
      bgColor: 'bg-ui-success',
    },
    comments: {
      label: 'Comments',
      value: stats.comments,
      icon: MessageCircle,
      color: 'text-accent-primary',
      bgColor: 'bg-accent-primary-light',
    },
  }

  const displayMetrics = config.metrics.map((metric) => metricConfig[metric])

  return (
    <div className="flex h-full flex-col justify-center space-y-4">
      <h3 className="text-center text-lg font-semibold text-content-primary">Statistics</h3>
      <div className="grid grid-cols-1 gap-4">
        {displayMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className="flex items-center gap-4 rounded-xl bg-surface-glass/60 p-4 backdrop-blur-sm border border-line-glass/50"
            >
              <div className={`rounded-full p-3 ${metric.bgColor}`}>
                <Icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-content-primary">{metric.value}</div>
                <div className="text-sm text-content-muted">{metric.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
