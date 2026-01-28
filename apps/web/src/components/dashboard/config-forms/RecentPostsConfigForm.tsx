'use client'

import { Label, Switch, Input } from '@/components/ui'

interface RecentPostsConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function RecentPostsConfigForm({ config, onChange }: RecentPostsConfigFormProps) {
  const handleChange = (key: string, value: number | boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="limit">Number of Posts</Label>
        <Input
          id="limit"
          type="number"
          value={config.limit ?? 5}
          onChange={(e) => handleChange('limit', Number(e.target.value))}
          min={1}
          max={20}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showExcerpt">Show Excerpt</Label>
        <Switch
          checked={config.showExcerpt ?? true}
          onCheckedChange={(checked) => handleChange('showExcerpt', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showDate">Show Date</Label>
        <Switch
          checked={config.showDate ?? true}
          onCheckedChange={(checked) => handleChange('showDate', checked)}
        />
      </div>
    </div>
  )
}
