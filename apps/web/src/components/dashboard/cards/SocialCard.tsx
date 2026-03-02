'use client'

import { Github, Twitter, Mail, Linkedin, Instagram, Globe, MessageCircle, Globe2 } from 'lucide-react'
import { DashboardCard, SocialCardConfig } from '@blog/types'
import { cn } from '@/lib/utils'

interface SocialCardProps {
  card: DashboardCard
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  twitter: Twitter,
  email: Mail,
  linkedin: Linkedin,
  instagram: Instagram,
  website: Globe,
  wechat: MessageCircle,
  weibo: Globe2,
  custom: Globe,
}

const defaultLinks: SocialCardConfig['links'] = [
  { id: '1', platform: 'github', label: 'GitHub', url: 'https://github.com', showLabel: false },
  { id: '2', platform: 'twitter', label: 'Twitter', url: 'https://twitter.com', showLabel: false },
  { id: '3', platform: 'email', label: 'Email', url: 'mailto:example@email.com', showLabel: false },
]

const platformColors: Record<string, string> = {
  github: 'bg-[#24292f] hover:bg-[#24292f]/80 text-white',
  twitter: 'bg-[#1DA1F2] hover:bg-[#1DA1F2]/80 text-white',
  wechat: 'bg-[#07C160] hover:bg-[#07C160]/80 text-white',
  weibo: 'bg-[#E6162D] hover:bg-[#E6162D]/80 text-white',
  instagram: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-80 text-white',
  linkedin: 'bg-[#0A66C2] hover:bg-[#0A66C2]/80 text-white',
  email: 'bg-gray-600 hover:bg-gray-500 text-white',
  website: 'bg-accent-primary hover:bg-accent-primary/80 text-white',
  custom: 'bg-accent-secondary hover:bg-accent-secondary/80 text-white',
}

export function SocialCard({ card }: SocialCardProps) {
  const config = (card.config ?? {}) as SocialCardConfig
  const links = config.links ?? defaultLinks
  const layout = config.layout ?? 'icons'
  const iconSize = config.iconSize ?? 'medium'
  const showBackground = config.showBackground ?? true

  const iconSizeClass = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6',
  }[iconSize]

  const gapClass = {
    icons: 'gap-3',
    list: 'gap-2',
    compact: 'gap-2',
  }[layout]

  return (
    <div className="h-full w-full">
      {layout === 'list' ? (
        <div className="flex flex-col gap-2">
          {links.map((link) => {
            const Icon = iconMap[link.platform] || Globe
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 rounded-lg transition-all hover:scale-[1.02]',
                  showBackground ? 'bg-surface-glass p-3 backdrop-blur-sm' : ''
                )}
              >
                <div className={cn('rounded-lg p-2', platformColors[link.platform])}>
                  <Icon className={iconSizeClass} />
                </div>
                <span className="flex-1 font-medium">{link.label}</span>
              </a>
            )
          })}
        </div>
      ) : layout === 'compact' ? (
        <div
          className={cn(
            'grid h-full w-full',
            'flex flex-wrap',
            'gap-2'
          )}
        >
          {links.map((link) => {
            const Icon = iconMap[link.platform] || Globe
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group relative flex items-center justify-center rounded-lg transition-all hover:scale-110',
                  platformColors[link.platform],
                  link.showLabel ? 'gap-2 px-3 py-2' : 'aspect-square p-3'
                )}
              >
                <Icon className={iconSizeClass} />
                {link.showLabel && (
                  <span className="text-sm font-medium">{link.label}</span>
                )}
              </a>
            )
          })}
        </div>
      ) : (
        <div className={cn('flex h-full w-full flex-wrap items-center justify-center', gapClass)}>
          {links.map((link) => {
            const Icon = iconMap[link.platform] || Globe
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group relative flex items-center justify-center rounded-full transition-all hover:scale-110',
                  platformColors[link.platform],
                  link.showLabel ? 'gap-2 px-4 py-2' : 'aspect-square p-3'
                )}
              >
                <Icon className={iconSizeClass} />
                {link.showLabel && (
                  <span className="text-sm font-medium">{link.label}</span>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
