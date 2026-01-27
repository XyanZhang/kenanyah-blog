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
          <div className="relative h-32 w-32 overflow-hidden rounded-full ring-4 ring-purple-200/50 shadow-2xl shadow-purple-300/50">
            <Image
              src={profile.avatar}
              alt={profile.name}
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Glow effect behind avatar */}
          <div className="absolute inset-0 -z-10 rounded-full bg-linear-to-br from-purple-400 to-cyan-400 opacity-20 blur-xl" />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="bg-linear-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-2xl font-bold text-transparent">
          {profile.greeting}
        </h2>
        {config.showBio && (
          <p className="text-lg font-medium text-purple-900/70">
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
            className="group rounded-full bg-white/80 p-3 text-purple-600 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-linear-to-br hover:from-purple-500 hover:to-blue-500 hover:text-white hover:shadow-xl hover:shadow-purple-300/50"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href={profile.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-full bg-white/80 p-3 text-blue-600 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-linear-to-br hover:from-blue-500 hover:to-cyan-500 hover:text-white hover:shadow-xl hover:shadow-blue-300/50"
            aria-label="Twitter"
          >
            <Twitter className="h-5 w-5" />
          </a>
          <a
            href={`mailto:${profile.social.email}`}
            className="group rounded-full bg-white/80 p-3 text-cyan-600 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-linear-to-br hover:from-cyan-500 hover:to-purple-500 hover:text-white hover:shadow-xl hover:shadow-cyan-300/50"
            aria-label="Email"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
      )}
    </div>
  )
}
