'use client'

import { useState } from 'react'
import { Settings, Trash2 } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { Button } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { CardConfigDialog } from './CardConfigDialog'

interface CardToolbarProps {
  cardId: string
}

export function CardToolbar({ cardId }: CardToolbarProps) {
  const { layout, removeCard } = useDashboard()
  const [configOpen, setConfigOpen] = useState(false)

  const card = layout?.cards.find((c) => c.id === cardId)
  if (!card) return null

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this card?')) {
      removeCard(cardId)
    }
  }

  return (
    <>
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                setConfigOpen(true)
              }}
              className="h-8 w-8 rounded-md bg-white/80 backdrop-blur-sm hover:bg-white"
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
              className="h-8 w-8 rounded-md bg-white/80 backdrop-blur-sm hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Card</TooltipContent>
        </Tooltip>
      </div>

      <CardConfigDialog
        card={card}
        open={configOpen}
        onOpenChange={setConfigOpen}
      />
    </>
  )
}
