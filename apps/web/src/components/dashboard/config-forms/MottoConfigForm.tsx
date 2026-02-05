'use client'

import { useCallback } from 'react'
import { MottoCardConfig } from '@blog/types'
import { Label } from '@/components/ui'
import { Input } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

interface MottoConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function MottoConfigForm({ config, onChange }: MottoConfigFormProps) {
  const updateConfig = useCallback(
    (key: keyof MottoCardConfig, value: any) => {
      onChange({ ...config, [key]: value })
    },
    [config, onChange]
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="motto">Motto Text</Label>
        <Input
          id="motto"
          value={config.motto || ''}
          onChange={(e) => updateConfig('motto', e.target.value)}
          placeholder="Enter your motto..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">Author</Label>
        <Input
          id="author"
          value={config.author || ''}
          onChange={(e) => updateConfig('author', e.target.value)}
          placeholder="Author name (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Font Style</Label>
          <Select
            value={config.fontStyle || 'serif'}
            onValueChange={(value: 'serif' | 'sans' | 'mono') => updateConfig('fontStyle', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="sans">Sans</SelectItem>
              <SelectItem value="mono">Mono</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Text Size</Label>
          <Select
            value={config.textSize || 'medium'}
            onValueChange={(value: 'small' | 'medium' | 'large') => updateConfig('textSize', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Text Align</Label>
          <Select
            value={config.textAlign || 'center'}
            onValueChange={(value: 'left' | 'center' | 'right') => updateConfig('textAlign', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Divider Style</Label>
          <Select
            value={config.dividerStyle || 'line'}
            onValueChange={(value: 'line' | 'dots' | 'bracket') => updateConfig('dividerStyle', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="dots">Dots</SelectItem>
              <SelectItem value="bracket">Bracket</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="showDivider"
          checked={config.showDivider !== false}
          onChange={(e) => updateConfig('showDivider', e.target.checked)}
          className="h-4 w-4 rounded border-border-primary"
        />
        <Label htmlFor="showDivider">Show Divider</Label>
      </div>
    </div>
  )
}
