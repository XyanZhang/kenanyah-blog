'use client'

import { Label, Switch } from '@/components/ui'

interface StatsConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

const METRICS = [
  { key: 'posts', label: 'Posts Count' },
  { key: 'views', label: 'Views Count' },
  { key: 'comments', label: 'Comments Count' },
] as const

export function StatsConfigForm({ config, onChange }: StatsConfigFormProps) {
  const metrics = (config.metrics as string[]) ?? ['posts', 'views', 'comments']

  const handleToggleMetric = (metric: string, enabled: boolean) => {
    const newMetrics = enabled
      ? [...metrics, metric]
      : metrics.filter((m) => m !== metric)
    onChange({ ...config, metrics: newMetrics })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Select which metrics to display</p>
      {METRICS.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={key}>{label}</Label>
          <Switch
            checked={metrics.includes(key)}
            onCheckedChange={(checked) => handleToggleMetric(key, checked)}
          />
        </div>
      ))}
    </div>
  )
}
