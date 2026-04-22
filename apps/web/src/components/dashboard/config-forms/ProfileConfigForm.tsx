'use client'

import { Label, Switch, Input } from '@/components/ui'

interface ProfileConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function ProfileConfigForm({ config, onChange }: ProfileConfigFormProps) {
  const handleChange = (key: string, value: boolean | string) => {
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
      {config.showAvatar !== false && (
        <div className="space-y-2">
          <Label htmlFor="avatar">自定义头像 URL</Label>
          <Input
            id="avatar"
            type="text"
            value={config.avatar ?? ''}
            onChange={(e) => handleChange('avatar', e.target.value)}
            placeholder="/images/avatar/avatar.png"
          />
          <p className="text-xs text-muted-foreground">
            留空则不显示头像，可填相对路径如 /images/avatar/avatar.png
          </p>
        </div>
      )}
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
