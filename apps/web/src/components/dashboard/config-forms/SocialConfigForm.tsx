'use client'

import { Label, Input, Select, Button, Switch } from '@/components/ui'
import { Trash2, Plus, Github, Twitter, Mail, Linkedin, Instagram, Globe, MessageCircle, Globe2 } from 'lucide-react'
import { useState } from 'react'
import { SocialLink, SocialCardConfig } from '@blog/types'

interface SocialConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

const platformOptions = [
  { value: 'github', label: 'GitHub', icon: Github },
  { value: 'twitter', label: 'Twitter', icon: Twitter },
  { value: 'wechat', label: 'WeChat', icon: MessageCircle },
  { value: 'weibo', label: 'Weibo', icon: Globe2 },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'custom', label: 'Custom', icon: Globe },
]

const defaultConfig: SocialCardConfig = {
  layout: 'icons',
  links: [
    { id: '1', platform: 'github', label: 'GitHub', url: 'https://github.com/yourusername', showLabel: false },
    { id: '2', platform: 'twitter', label: 'Twitter', url: 'https://twitter.com/yourusername', showLabel: false },
    { id: '3', platform: 'email', label: 'Email', url: 'mailto:your@email.com', showLabel: false },
  ],
  iconSize: 'medium',
  showBackground: true,
  columns: 4,
}

export function SocialConfigForm({ config, onChange }: SocialConfigFormProps) {
  const socialConfig: SocialCardConfig = { ...defaultConfig, ...config }
  const [newLink, setNewLink] = useState<Partial<SocialLink>>({
    platform: 'github',
    label: '',
    url: '',
    showLabel: false,
  })

  const updateConfig = (updates: Partial<SocialCardConfig>) => {
    onChange({ ...socialConfig, ...updates })
  }

  const addLink = () => {
    if (newLink.label && newLink.url) {
      const link: SocialLink = {
        id: Date.now().toString(),
        platform: newLink.platform as SocialLink['platform'],
        label: newLink.label,
        url: newLink.url,
        showLabel: newLink.showLabel ?? false,
      }
      updateConfig({ links: [...socialConfig.links, link] })
      setNewLink({ platform: 'github', label: '', url: '', showLabel: false })
    }
  }

  const removeLink = (id: string) => {
    updateConfig({ links: socialConfig.links.filter((l) => l.id !== id) })
  }

  const updateLink = (id: string, updates: Partial<SocialLink>) => {
    updateConfig({
      links: socialConfig.links.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Layout Style</Label>
        <Select
          value={socialConfig.layout}
          onValueChange={(value: string) => updateConfig({ layout: value as SocialCardConfig['layout'] })}
        >
          <option value="icons">Icons Only</option>
          <option value="compact">Compact (with labels)</option>
          <option value="list">List View</option>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Icon Size</Label>
        <Select
          value={socialConfig.iconSize}
          onValueChange={(value: string) => updateConfig({ iconSize: value as SocialCardConfig['iconSize'] })}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </Select>
      </div>

      {socialConfig.layout !== 'list' && (
        <div className="space-y-3">
          <Label>Columns</Label>
          <Input
            type="number"
            min={1}
            max={6}
            value={socialConfig.columns}
            onChange={(e) => updateConfig({ columns: parseInt(e.target.value) || 1 })}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label>Show Background</Label>
        <Switch
          checked={socialConfig.showBackground}
          onCheckedChange={(checked) => updateConfig({ showBackground: checked })}
        />
      </div>

      <div className="border-t pt-4">
        <Label className="mb-3">Social Links</Label>
        <div className="space-y-3">
          {socialConfig.links.map((link) => {
            const platform = platformOptions.find((p) => p.value === link.platform)
            const Icon = platform?.icon || Globe
            return (
              <div key={link.id} className="flex items-center gap-2 rounded-lg bg-surface-glass p-3">
                <Icon className="h-4 w-4" />
                <div className="flex-1">
                  <Input
                    value={link.label}
                    placeholder="Label"
                    onChange={(e) => updateLink(link.id, { label: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={link.url}
                    placeholder="URL"
                    onChange={(e) => updateLink(link.id, { url: e.target.value })}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <Select
            value={newLink.platform}
            onValueChange={(value) => setNewLink({ ...newLink, platform: value as SocialLink['platform'] })}
          >
            {platformOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
          <Input
            value={newLink.label}
            placeholder="Label"
            onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
          />
          <Input
            value={newLink.url}
            placeholder="URL"
            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
          />
          <Button onClick={addLink} disabled={!newLink.label || !newLink.url}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
