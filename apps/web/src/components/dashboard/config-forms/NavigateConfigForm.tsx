'use client'

import { Input } from '@/components/ui'
import { Label } from '@/components/ui/label'

interface NavigateConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function NavigateConfigForm({ config, onChange }: NavigateConfigFormProps) {
  const handleNavigateToChange = (value: string) => {
    onChange({ ...config, navigateTo: value })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-content-secondary">Navigation</h3>
      <div className="space-y-2">
        <Label htmlFor="navigateTo">Navigate URL</Label>
        <Input
          id="navigateTo"
          placeholder="/posts, /categories, /about, etc."
          value={config.navigateTo ?? ''}
          onChange={(e) => handleNavigateToChange(e.target.value)}
        />
        <p className="text-xs text-content-muted">
          Enter the path to navigate to when the card is clicked. Leave empty to disable navigation.
        </p>
      </div>
    </div>
  )
}
