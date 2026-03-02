'use client'

import { Label, Switch, Input } from '@/components/ui'

interface ReadingConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function ReadingConfigForm({ config, onChange }: ReadingConfigFormProps) {
  const handleToggle = (key: string, value: boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bookTitle">Book Title</Label>
        <Input
          id="bookTitle"
          value={config.bookTitle ?? ''}
          onChange={(e) => onChange({ ...config, bookTitle: e.target.value })}
          placeholder="Enter book title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="author">Author</Label>
        <Input
          id="author"
          value={config.author ?? ''}
          onChange={(e) => onChange({ ...config, author: e.target.value })}
          placeholder="Enter author name"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showProgress">Show Progress</Label>
        <Switch
          checked={config.showProgress ?? true}
          onCheckedChange={(checked) => handleToggle('showProgress', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showStreak">Show Streak</Label>
        <Switch
          checked={config.showStreak ?? true}
          onCheckedChange={(checked) => handleToggle('showStreak', checked)}
        />
      </div>
    </div>
  )
}
