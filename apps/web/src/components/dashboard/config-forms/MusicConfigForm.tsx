'use client'

import { Label, Switch, Input } from '@/components/ui'

interface MusicConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function MusicConfigForm({ config, onChange }: MusicConfigFormProps) {
  const handleToggle = (key: string, value: boolean) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Song Title</Label>
        <Input
          id="title"
          value={config.title ?? ''}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="Enter song title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist">Artist</Label>
        <Input
          id="artist"
          value={config.artist ?? ''}
          onChange={(e) => onChange({ ...config, artist: e.target.value })}
          placeholder="Enter artist name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coverUrl">Cover Image URL</Label>
        <Input
          id="coverUrl"
          value={config.coverUrl ?? ''}
          onChange={(e) => onChange({ ...config, coverUrl: e.target.value })}
          placeholder="Enter cover image URL"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audioUrl">Audio URL</Label>
        <Input
          id="audioUrl"
          value={config.audioUrl ?? ''}
          onChange={(e) => onChange({ ...config, audioUrl: e.target.value })}
          placeholder="Enter audio file URL"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="autoPlay">Auto Play</Label>
        <Switch
          checked={config.autoPlay ?? false}
          onCheckedChange={(checked) => handleToggle('autoPlay', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showProgress">Show Progress Bar</Label>
        <Switch
          checked={config.showProgress ?? true}
          onCheckedChange={(checked) => handleToggle('showProgress', checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showVolume">Show Volume Control</Label>
        <Switch
          checked={config.showVolume ?? true}
          onCheckedChange={(checked) => handleToggle('showVolume', checked)}
        />
      </div>
    </div>
  )
}
