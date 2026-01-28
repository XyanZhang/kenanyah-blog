'use client'

import { Label, Switch, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'

interface CategoriesConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function CategoriesConfigForm({ config, onChange }: CategoriesConfigFormProps) {
  const handleChange = (key: string, value: string | number | boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Display Type</Label>
        <Select
          value={config.type ?? 'categories'}
          onValueChange={(value) => handleChange('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="categories">Categories</SelectItem>
            <SelectItem value="tags">Tags</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="limit">Display Limit</Label>
        <Input
          id="limit"
          type="number"
          value={config.limit ?? 10}
          onChange={(e) => handleChange('limit', Number(e.target.value))}
          min={1}
          max={50}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showCount">Show Count</Label>
        <Switch
          checked={config.showCount ?? true}
          onCheckedChange={(checked) => handleChange('showCount', checked)}
        />
      </div>
    </div>
  )
}
