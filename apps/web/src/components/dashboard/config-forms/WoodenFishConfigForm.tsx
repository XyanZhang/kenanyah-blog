'use client'

interface WoodenFishConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

/** 木鱼卡片无需额外配置，仅展示提示 */
export function WoodenFishConfigForm({ config: _config, onChange: _onChange }: WoodenFishConfigFormProps) {
  return (
    <p className="text-sm text-content-muted">
      点击或悬停木鱼即可积功德，功德+1 飘字动效会自动展示。无需额外配置。
    </p>
  )
}
