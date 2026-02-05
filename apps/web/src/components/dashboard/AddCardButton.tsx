'use client'

import { useState, useImperativeHandle, forwardRef } from 'react'
import { User, BarChart3, FolderTree, FileText, LayoutGrid, Clock, Shuffle, Calendar, Timer, ImageIcon, Link2, Quote, CloudSun } from 'lucide-react'
import { CardType, CardSize } from '@blog/types'
import { useDashboard } from '@/hooks/useDashboard'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'

const cardTypeOptions = [
  { value: CardType.PROFILE, label: 'Profile', icon: User, description: 'Personal information' },
  { value: CardType.STATS, label: 'Statistics', icon: BarChart3, description: 'Blog statistics' },
  { value: CardType.CATEGORIES, label: 'Categories', icon: FolderTree, description: 'Category cloud' },
  { value: CardType.RECENT_POSTS, label: 'Recent Posts', icon: FileText, description: 'Latest articles' },
  { value: CardType.TABBAR, label: 'Tabbar', icon: LayoutGrid, description: '多标签导航卡片' },
  { value: CardType.LATEST_POSTS, label: 'Latest Posts', icon: Clock, description: '最新文章列表' },
  { value: CardType.RANDOM_POSTS, label: 'Random Posts', icon: Shuffle, description: '随机推荐文章' },
  { value: CardType.CALENDAR, label: 'Calendar', icon: Calendar, description: '日历组件' },
  { value: CardType.CLOCK, label: 'Clock', icon: Timer, description: '透明电子时钟' },
  { value: CardType.IMAGE, label: 'Image', icon: ImageIcon, description: '封面图片卡片' },
  { value: CardType.SOCIAL, label: 'Social Links', icon: Link2, description: '社交媒体链接' },
  { value: CardType.MOTTO, label: 'Motto', icon: Quote, description: '座右铭卡片' },
  { value: CardType.WEATHER, label: 'Weather', icon: CloudSun, description: 'Q版天气卡片' },
]

const cardSizeOptions = [
  { value: CardSize.SMALL, label: 'Small (200x200)' },
  { value: CardSize.MEDIUM, label: 'Medium (300x300)' },
  { value: CardSize.LARGE, label: 'Large (400x400)' },
  { value: CardSize.WIDE, label: 'Wide (600x300)' },
  { value: CardSize.TALL, label: 'Tall (300x600)' },
]

export interface AddCardDialogHandle {
  open: () => void
}

export const AddCardDialog = forwardRef<AddCardDialogHandle>(function AddCardDialog(_props, ref) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<CardType>(CardType.PROFILE)
  const [selectedSize, setSelectedSize] = useState<CardSize>(CardSize.MEDIUM)
  const { addCard } = useDashboard()

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
  }))

  const handleAdd = () => {
    addCard(selectedType, selectedSize)
    setIsOpen(false)
    setSelectedType(CardType.PROFILE)
    setSelectedSize(CardSize.MEDIUM)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Card</DialogTitle>
          <DialogDescription>
            Choose a card type and size to add to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Type</label>
            <div className="grid grid-cols-2 gap-2">
              {cardTypeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedType(option.value)}
                    className={`
                      flex items-center gap-3 rounded-lg border p-3 text-left transition-colors
                      ${selectedType === option.value
                        ? 'border-line-focus bg-surface-selected'
                        : 'border-line-primary hover:border-line-secondary'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 text-content-tertiary" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-content-muted">{option.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Card Size</label>
            <Select value={selectedSize} onValueChange={(v) => setSelectedSize(v as CardSize)}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {cardSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
