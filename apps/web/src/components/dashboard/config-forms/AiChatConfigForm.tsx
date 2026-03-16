import { Label, Input } from '@/components/ui'
import type { AiChatCardConfig } from '@blog/types'

interface AiChatConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function AiChatConfigForm({ config, onChange }: AiChatConfigFormProps) {
  const typed = (config || {}) as AiChatCardConfig

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="aiChatTitle">标题</Label>
        <Input
          id="aiChatTitle"
          value={typed.title ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              title: e.target.value,
            })
          }
          placeholder="例如：AI 小助手"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiChatSubtitle">副标题</Label>
        <Input
          id="aiChatSubtitle"
          value={typed.subtitle ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              subtitle: e.target.value,
            })
          }
          placeholder="例如：和智能助手聊聊想法、写作灵感或技术问题。"
        />
      </div>
    </div>
  )
}

