'use client'

import { Label, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'

interface ClockConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

const FONT_OPTIONS = [
  { value: 'mono', label: 'Monospace' },
  { value: 'sans', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
]

export function ClockConfigForm({ config, onChange }: ClockConfigFormProps) {
  const handleToggle = (key: string, value: boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="format24h">24-Hour Format</Label>
        <Switch
          checked={config.format24h ?? true}
          onCheckedChange={(checked) => handleToggle('format24h', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showSeconds">Show Seconds</Label>
        <Switch
          checked={config.showSeconds ?? true}
          onCheckedChange={(checked) => handleToggle('showSeconds', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showDate">Show Date</Label>
        <Switch
          checked={config.showDate ?? true}
          onCheckedChange={(checked) => handleToggle('showDate', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="fontStyle">Font Style</Label>
        <Select
          value={config.fontStyle ?? 'mono'}
          onValueChange={(value) => onChange({ ...config, fontStyle: value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
