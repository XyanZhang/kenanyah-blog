'use client'

import { useState, useCallback } from 'react'
import { CardType, DashboardCard } from '@blog/types'
import { useDashboard } from '@/hooks/useDashboard'
import { RESIZE_CONSTRAINTS } from '@/lib/constants/dashboard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Slider,
  Input,
} from '@/components/ui'
import { ProfileConfigForm } from './config-forms/ProfileConfigForm'
import { StatsConfigForm } from './config-forms/StatsConfigForm'
import { CategoriesConfigForm } from './config-forms/CategoriesConfigForm'
import { RecentPostsConfigForm } from './config-forms/RecentPostsConfigForm'
import { TabbarConfigForm } from './config-forms/TabbarConfigForm'
import { LatestPostsConfigForm } from './config-forms/LatestPostsConfigForm'
import { RandomPostsConfigForm } from './config-forms/RandomPostsConfigForm'
import { CalendarConfigForm } from './config-forms/CalendarConfigForm'
import { ClockConfigForm } from './config-forms/ClockConfigForm'
import { ImageConfigForm } from './config-forms/ImageConfigForm'
import { SocialConfigForm } from './config-forms/SocialConfigForm'
import { MottoConfigForm } from './config-forms/MottoConfigForm'
import { WeatherConfigForm } from './config-forms/WeatherConfigForm'
import { MusicConfigForm } from './config-forms/MusicConfigForm'
import { ReadingConfigForm } from './config-forms/ReadingConfigForm'
import { NavigateConfigForm } from './config-forms/NavigateConfigForm'

interface CardConfigDialogProps {
  card: DashboardCard
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getCardTypeLabel(type: CardType): string {
  const labels: Record<CardType, string> = {
    [CardType.PROFILE]: 'Profile',
    [CardType.STATS]: 'Stats',
    [CardType.CATEGORIES]: 'Categories',
    [CardType.RECENT_POSTS]: 'Recent Posts',
    [CardType.TABBAR]: 'Tab Bar',
    [CardType.LATEST_POSTS]: 'Latest Posts',
    [CardType.RANDOM_POSTS]: 'Random Posts',
    [CardType.CALENDAR]: 'Calendar',
    [CardType.CLOCK]: 'Clock',
    [CardType.IMAGE]: 'Image',
    [CardType.SOCIAL]: 'Social Links',
    [CardType.MOTTO]: 'Motto',
    [CardType.WEATHER]: 'Weather',
    [CardType.MUSIC]: 'Music',
    [CardType.READING]: 'Reading',
  }
  return labels[type]
}

function getConfigForm(type: CardType) {
  const forms: Record<CardType, React.ComponentType<{ config: Record<string, any>; onChange: (config: Record<string, any>) => void }>> = {
    [CardType.PROFILE]: ProfileConfigForm,
    [CardType.STATS]: StatsConfigForm,
    [CardType.CATEGORIES]: CategoriesConfigForm,
    [CardType.RECENT_POSTS]: RecentPostsConfigForm,
    [CardType.TABBAR]: TabbarConfigForm,
    [CardType.LATEST_POSTS]: LatestPostsConfigForm,
    [CardType.RANDOM_POSTS]: RandomPostsConfigForm,
    [CardType.CALENDAR]: CalendarConfigForm,
    [CardType.CLOCK]: ClockConfigForm,
    [CardType.IMAGE]: ImageConfigForm,
    [CardType.SOCIAL]: SocialConfigForm,
    [CardType.MOTTO]: MottoConfigForm,
    [CardType.WEATHER]: WeatherConfigForm,
    [CardType.MUSIC]: MusicConfigForm,
    [CardType.READING]: ReadingConfigForm,
  }
  return forms[type]
}

function clampDimension(value: number): number {
  return Math.max(
    RESIZE_CONSTRAINTS.minWidth,
    Math.min(RESIZE_CONSTRAINTS.maxWidth, value)
  )
}

export function CardConfigDialog({ card, open, onOpenChange }: CardConfigDialogProps) {
  const { updateCard } = useDashboard()

  const [dimensionInputs, setDimensionInputs] = useState({
    width: String(card.customDimensions?.width ?? 300),
    height: String(card.customDimensions?.height ?? 300),
  })
  const [borderRadius, setBorderRadius] = useState(card.borderRadius ?? 40)
  const [padding, setPadding] = useState(card.padding ?? 24)
  const [config, setConfig] = useState<Record<string, any>>(card.config)

  const handleDimensionInput = useCallback(
    (key: 'width' | 'height', value: string) => {
      setDimensionInputs((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleDimensionBlur = useCallback(
    (key: 'width' | 'height') => {
      const num = Number(dimensionInputs[key])
      if (isNaN(num) || num === 0) {
        setDimensionInputs((prev) => ({
          ...prev,
          [key]: String(card.customDimensions?.[key] ?? 300),
        }))
        return
      }
      setDimensionInputs((prev) => ({
        ...prev,
        [key]: String(clampDimension(num)),
      }))
    },
    [dimensionInputs, card.customDimensions]
  )

  const handleSave = useCallback(() => {
    const width = clampDimension(Number(dimensionInputs.width) || 300)
    const height = clampDimension(Number(dimensionInputs.height) || 300)
    updateCard(card.id, {
      customDimensions: { width, height },
      borderRadius,
      padding,
      config,
    })
    onOpenChange(false)
  }, [card.id, dimensionInputs, borderRadius, padding, config, updateCard, onOpenChange])

  const handleCancel = useCallback(() => {
    setDimensionInputs({
      width: String(card.customDimensions?.width ?? 300),
      height: String(card.customDimensions?.height ?? 300),
    })
    setBorderRadius(card.borderRadius ?? 40)
    setPadding(card.padding ?? 24)
    setConfig(card.config)
    onOpenChange(false)
  }, [card, onOpenChange])

  const ConfigForm = getConfigForm(card.type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {getCardTypeLabel(card.type)} Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-content-secondary">General Settings</h3>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensionInputs.width}
                  onChange={(e) => handleDimensionInput('width', e.target.value)}
                  onBlur={() => handleDimensionBlur('width')}
                  min={RESIZE_CONSTRAINTS.minWidth}
                  max={RESIZE_CONSTRAINTS.maxWidth}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={dimensionInputs.height}
                  onChange={(e) => handleDimensionInput('height', e.target.value)}
                  onBlur={() => handleDimensionBlur('height')}
                  min={RESIZE_CONSTRAINTS.minHeight}
                  max={RESIZE_CONSTRAINTS.maxHeight}
                />
              </div>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="borderRadius">Border Radius</Label>
                <span className="text-sm text-content-muted">{borderRadius}px</span>
              </div>
              <Slider
                value={borderRadius}
                onValueChange={setBorderRadius}
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Padding */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="padding">Padding</Label>
                <span className="text-sm text-content-muted">{padding}px</span>
              </div>
              <Slider
                value={padding}
                onValueChange={setPadding}
                min={0}
                max={64}
                step={4}
              />
            </div>
          </div>

          {/* Navigation */}
          <NavigateConfigForm config={config} onChange={setConfig} />

          {/* Card-specific Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-content-secondary">Card Settings</h3>
            <ConfigForm config={config} onChange={setConfig} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
