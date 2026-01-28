'use client'

import { Label, Switch } from '@/components/ui'

interface ProfileConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function ProfileConfigForm({ config, onChange }: ProfileConfigFormProps) {
  const handleChange = (key: string, value: boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="showAvatar">Show Avatar</Label>
        <Switch
          checked={config.showAvatar ?? true}
          onCheckedChange={(checked) => handleChange('showAvatar', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showBio">Show Bio</Label>
        <Switch
          checked={config.showBio ?? true}
          onCheckedChange={(checked) => handleChange('showBio', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showSocialLinks">Show Social Links</Label>
        <Switch
          checked={config.showSocialLinks ?? true}
          onCheckedChange={(checked) => handleChange('showSocialLinks', checked)}
        />
      </div>
    </div>
  )
}
