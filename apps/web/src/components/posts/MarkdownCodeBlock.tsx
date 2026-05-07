'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'

type MarkdownCodeBlockProps = {
  className?: string
  children: React.ReactNode
}

function getCodeText(children: React.ReactNode) {
  if (Array.isArray(children)) return children.join('')
  return String(children ?? '')
}

function getLanguage(className?: string) {
  const match = /language-([\w-]+)/.exec(className ?? '')
  return match?.[1] ?? 'text'
}

export function MarkdownCodeBlock({ className, children }: MarkdownCodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const code = useMemo(() => getCodeText(children).replace(/\n$/, ''), [children])
  const language = getLanguage(className)

  const copyCode = async () => {
    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <figure className="md-code-block">
      <figcaption className="md-code-block__bar">
        <span className="md-code-block__lang">{language}</span>
        <button
          type="button"
          onClick={copyCode}
          className="md-code-block__copy"
          aria-label={copied ? '已复制代码' : '复制代码'}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </figcaption>
      <pre>
        <code className={className}>{code}</code>
      </pre>
    </figure>
  )
}
