'use client'

import { Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'

interface TabbarConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

const TABS = [
  { value: 'recent', label: 'Recent' },
  { value: 'about', label: 'About' },
  { value: 'photography', label: 'Photography' },
  { value: 'projects', label: 'Projects' },
] as const

export function TabbarConfigForm({ config, onChange }: TabbarConfigFormProps) {
  const handleChange = (value: string) => {
    onChange({ ...config, defaultTab: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="defaultTab">Default Tab</Label>
        <Select
          value={config.defaultTab ?? 'recent'}
          onValueChange={handleChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select default tab" />
          </SelectTrigger>
          <SelectContent>
            {TABS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
