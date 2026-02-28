'use client'
import { Label, Switch, Input, Button } from '@/components/ui'
import { FiPlus, FiTrash2 } from 'react-icons/fi'

interface MusicTrack {
  audioUrl: string
  title: string
  artist?: string
  coverUrl?: string
}

interface MusicConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function MusicConfigForm({ config, onChange }: MusicConfigFormProps) {
  const handleToggle = (key: string, value: boolean) => {
    onChange({ ...config, [key]: value })
  }

  const playlist: MusicTrack[] = config.playlist || []
  const hasPlaylist = playlist.length > 0

  const addTrack = () => {
    const newTrack: MusicTrack = {
      audioUrl: '',
      title: '',
      artist: '',
      coverUrl: '',
    }
    onChange({ ...config, playlist: [...playlist, newTrack] })
  }

  const updateTrack = (index: number, field: keyof MusicTrack, value: string) => {
    const newPlaylist = [...playlist]
    newPlaylist[index] = { ...newPlaylist[index], [field]: value }
    onChange({ ...config, playlist: newPlaylist })
  }

  const removeTrack = (index: number) => {
    const newPlaylist = playlist.filter((_, i) => i !== index)
    onChange({ ...config, playlist: newPlaylist })
  }

  return (
    <div className="space-y-4">
      {/* 单曲模式 */}
      <div className="space-y-2">
        <Label htmlFor="title">Song Title</Label>
        <Input
          id="title"
          value={config.title ?? ''}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          placeholder="Enter song title"
          disabled={hasPlaylist}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist">Artist</Label>
        <Input
          id="artist"
          value={config.artist ?? ''}
          onChange={(e) => onChange({ ...config, artist: e.target.value })}
          placeholder="Enter artist name"
          disabled={hasPlaylist}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coverUrl">Cover Image URL</Label>
        <Input
          id="coverUrl"
          value={config.coverUrl ?? ''}
          onChange={(e) => onChange({ ...config, coverUrl: e.target.value })}
          placeholder="Enter cover image URL"
          disabled={hasPlaylist}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audioUrl">Audio URL</Label>
        <Input
          id="audioUrl"
          value={config.audioUrl ?? ''}
          onChange={(e) => onChange({ ...config, audioUrl: e.target.value })}
          placeholder="Enter audio file URL"
          disabled={hasPlaylist}
        />
      </div>

      {/* 播放列表模式 */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Label>Playlist Mode</Label>
          <Switch
            checked={hasPlaylist}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange({ ...config, playlist: [{ audioUrl: config.audioUrl || '', title: config.title || 'Song 1', artist: config.artist || '', coverUrl: config.coverUrl || '' }] })
              } else {
                const firstTrack = playlist[0] || {}
                onChange({ ...config, playlist: [], title: firstTrack.title || '', artist: firstTrack.artist || '', coverUrl: firstTrack.coverUrl || '', audioUrl: firstTrack.audioUrl || '' })
              }
            }}
          />
        </div>

        {hasPlaylist && (
          <div className="space-y-3">
            {playlist.map((track, index) => (
              <div key={index} className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Track {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTrack(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <FiTrash2 size={14} />
                  </Button>
                </div>
                <Input
                  value={track.title}
                  onChange={(e) => updateTrack(index, 'title', e.target.value)}
                  placeholder="Track title"
                />
                <Input
                  value={track.artist || ''}
                  onChange={(e) => updateTrack(index, 'artist', e.target.value)}
                  placeholder="Artist (optional)"
                />
                <Input
                  value={track.audioUrl}
                  onChange={(e) => updateTrack(index, 'audioUrl', e.target.value)}
                  placeholder="Audio URL (WAV/MP3)"
                />
                <Input
                  value={track.coverUrl || ''}
                  onChange={(e) => updateTrack(index, 'coverUrl', e.target.value)}
                  placeholder="Cover URL (optional)"
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addTrack}
              className="w-full"
            >
              <FiPlus size={16} className="mr-2" />
              Add Track
            </Button>
          </div>
        )}
      </div>

      {/* 其他设置 */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="autoPlay">Auto Play</Label>
          <Switch
            checked={config.autoPlay ?? false}
            onCheckedChange={(checked) => handleToggle('autoPlay', checked)}
          />
        </div>
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
      <div className="flex items-center justify-between">
        <Label>切换页面时继续播放</Label>
        <Switch
          checked={config.persistAcrossPages ?? false}
          onCheckedChange={(checked) => handleToggle('persistAcrossPages', checked)}
        />
      </div>
      <p className="text-xs text-muted-foreground">开启后，在站内切换页面时音乐不会中断，底部会显示迷你播放条</p>
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="simplifiedMode">Simplified Mode</Label>
          <Switch
            checked={config.simplifiedMode ?? false}
            onCheckedChange={(checked) => handleToggle('simplifiedMode', checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Show compact player with music icon, title, and progress</p>
      </div>
    </div>
  )
}
