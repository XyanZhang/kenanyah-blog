'use client'

import Image from 'next/image'
import { Github, Twitter, Mail } from 'lucide-react'
import { DashboardCard, ProfileCardConfig } from '@blog/types'

interface ProfileCardProps {
  card: DashboardCard
}

export function ProfileCard({ card }: ProfileCardProps) {
  const config = card.config as ProfileCardConfig

  const profile = {
    name: 'Kenanyah',
    avatar: '/images/avatar/kenanyah.png',
    greeting: 'Hello, I\'m Kenanyah',
    subtitle: 'Nice to meet you.',
    social: {
      github: 'https://github.com/XyanZhang',
      twitter: 'https://twitter.com/kenanyah',
      email: 'kenanyah@example.com',
    },
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center space-y-6 text-center">
      {config.showAvatar && (
        <div className="relative">
          <div
            className="relative h-32 w-32 overflow-hidden rounded-full ring-accent-primary-light/50 shadow-2xl"
            style={{ '--tw-shadow-color': 'var(--theme-shadow-accent)' } as React.CSSProperties}
          >
            <Image
              src={profile.avatar}
              alt={profile.name}
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Glow effect behind avatar */}
          <div className="absolute inset-0 -z-10 rounded-full bg-linear-to-br from-accent-primary-muted to-accent-tertiary opacity-20 blur-xl" />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="bg-linear-to-r from-accent-primary via-accent-secondary to-accent-tertiary bg-clip-text text-2xl font-bold text-transparent">
          {profile.greeting}
        </h2>
        {config.showBio && (
          <p className="text-lg font-medium text-accent-primary-dark">
            {profile.subtitle}
          </p>
        )}
      </div>

      {config.showSocialLinks && (
        <div className="flex gap-3">
          <a
            href={profile.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-full bg-surface-glass p-3 text-accent-primary shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-accent-primary hover:text-content-inverse hover:shadow-xl"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href={profile.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-full bg-surface-glass p-3 text-accent-secondary shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-accent-secondary hover:text-content-inverse hover:shadow-xl"
            aria-label="Twitter"
          >
            <Twitter className="h-5 w-5" />
          </a>
          <a
            href={`mailto:${profile.social.email}`}
            className="group rounded-full bg-surface-glass p-3 text-accent-tertiary shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-accent-tertiary hover:text-content-inverse hover:shadow-xl"
            aria-label="Email"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
      )}
    </div>
  )
}
