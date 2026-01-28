'use client'

import { useState } from 'react'
import { Settings, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { useNavStore } from '@/store/nav-store'
import { NavConfigDialog } from './NavConfigDialog'

export function NavToolbar() {
  const { resetConfig } = useNavStore()
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  return (
    <>
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-surface-primary/90 p-1 shadow-lg backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsConfigOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">配置导航</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetConfig}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">重置位置</TooltipContent>
        </Tooltip>
      </div>

      <NavConfigDialog open={isConfigOpen} onOpenChange={setIsConfigOpen} />
    </>
  )
}
