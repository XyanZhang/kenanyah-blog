'use client'

import { Settings, Trash2 } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { Button } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'

interface CardToolbarProps {
  cardId: string
  onOpenConfig: () => void
}

export function CardToolbar({ cardId, onOpenConfig }: CardToolbarProps) {
  const { layout, removeCard } = useDashboard()

  const card = layout?.cards.find((c) => c.id === cardId)
  if (!card) return null

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this card?')) {
      removeCard(cardId)
    }
  }

  return (
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onOpenConfig()
            }}
            className="h-8 w-8 rounded-md bg-surface-glass backdrop-blur-sm hover:bg-surface-primary"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Configure Card</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            className="h-8 w-8 rounded-md bg-surface-glass backdrop-blur-sm hover:bg-ui-destructive-light hover:text-ui-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete Card</TooltipContent>
      </Tooltip>
    </div>
  )
}
