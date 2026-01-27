'use client'

import { User, Github, Twitter, Mail } from 'lucide-react'
import { DashboardCard, ProfileCardConfig } from '@blog/types'

interface ProfileCardProps {
  card: DashboardCard
}

export function ProfileCard({ card }: ProfileCardProps) {
  const config = card.config as ProfileCardConfig

  // Mock data - replace with actual user data
  const profile = {
    name: 'John Doe',
    username: '@johndoe',
    bio: 'Full-stack developer passionate about building great web experiences.',
    avatar: null,
    social: {
      github: 'https://github.com/johndoe',
      twitter: 'https://twitter.com/johndoe',
      email: 'john@example.com',
    },
  }

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
      {config.showAvatar && (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <User className="h-10 w-10" />
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
        <p className="text-sm text-gray-500">{profile.username}</p>
      </div>

      {config.showBio && (
        <p className="text-sm text-gray-600">{profile.bio}</p>
      )}

      {config.showSocialLinks && (
        <div className="flex gap-3">
          <a
            href={profile.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href={profile.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Twitter className="h-5 w-5" />
          </a>
          <a
            href={`mailto:${profile.social.email}`}
            className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
      )}
    </div>
  )
}
