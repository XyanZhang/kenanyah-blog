'use client'

import { Label, Switch, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'

interface ImageConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

const OBJECT_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
]

export function ImageConfigForm({ config, onChange }: ImageConfigFormProps) {
  const handleChange = (key: string, value: string | boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="src">Image URL</Label>
        <Input
          id="src"
          type="text"
          value={config.src ?? ''}
          onChange={(e) => handleChange('src', e.target.value)}
          placeholder="/images/cover.jpg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="alt">Alt Text</Label>
        <Input
          id="alt"
          type="text"
          value={config.alt ?? ''}
          onChange={(e) => handleChange('alt', e.target.value)}
          placeholder="Image description"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="objectFit">Object Fit</Label>
        <Select
          value={config.objectFit ?? 'cover'}
          onValueChange={(value) => handleChange('objectFit', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OBJECT_FIT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="showOverlay">Show Overlay</Label>
        <Switch
          checked={config.showOverlay ?? false}
          onCheckedChange={(checked) => handleChange('showOverlay', checked)}
        />
      </div>

      {config.showOverlay && (
        <div className="space-y-2">
          <Label htmlFor="overlayText">Overlay Text</Label>
          <Input
            id="overlayText"
            type="text"
            value={config.overlayText ?? ''}
            onChange={(e) => handleChange('overlayText', e.target.value)}
            placeholder="Enter overlay text"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="linkUrl">Link URL (optional)</Label>
        <Input
          id="linkUrl"
          type="text"
          value={config.linkUrl ?? ''}
          onChange={(e) => handleChange('linkUrl', e.target.value)}
          placeholder="https://example.com"
        />
      </div>
    </div>
  )
}
