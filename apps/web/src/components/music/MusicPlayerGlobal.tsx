'use client'

import { useState } from 'react'
import { useMusicPlayerStore } from '@/store/music-player-store'
import { MusicPlayerFloatingTrigger } from './MusicPlayerFloatingTrigger'
import { GlobalMusicBar } from './GlobalMusicBar'

/**
 * 全局音乐入口：有播放会话时在页面左下角显示浮动图标，点击后底部播放栏以动画展开/收起。
 */
export function MusicPlayerGlobal() {
  const config = useMusicPlayerStore((s) => s.config)
  const isPlaying = useMusicPlayerStore((s) => s.isPlaying)
  const [isBarOpen, setIsBarOpen] = useState(false)

  if (!config) return null

  return (
    <>
      <MusicPlayerFloatingTrigger
        isPlaying={isPlaying}
        onClick={() => setIsBarOpen((open) => !open)}
      />
      <GlobalMusicBar
        isExpanded={isBarOpen}
        onCollapse={() => setIsBarOpen(false)}
      />
    </>
  )
}
