'use client'

import { Label, Switch } from '@/components/ui'

interface CalendarConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function CalendarConfigForm({ config, onChange }: CalendarConfigFormProps) {
  const handleChange = (key: string, value: boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="showPostDots">Show Post Indicators</Label>
        <Switch
          checked={config.showPostDots ?? true}
          onCheckedChange={(checked) => handleChange('showPostDots', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="highlightToday">Highlight Today</Label>
        <Switch
          checked={config.highlightToday ?? true}
          onCheckedChange={(checked) => handleChange('highlightToday', checked)}
        />
      </div>
    </div>
  )
}
