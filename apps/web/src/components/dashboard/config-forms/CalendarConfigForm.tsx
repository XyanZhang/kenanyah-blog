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
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="showAnnotations">显示日期标注</Label>
          <p className="text-xs text-content-muted mt-0.5">点击日期可添加/编辑标注（与账号绑定）</p>
        </div>
        <Switch
          checked={config.showAnnotations !== false}
          onCheckedChange={(checked) => handleChange('showAnnotations', checked)}
        />
      </div>
    </div>
  )
}
