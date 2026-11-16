'use client'

import { useEffect, useRef, useState } from 'react'

export function CopyButton({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current)
    },
    [],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    if (timer.current != null) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`cursor-pointer rounded px-1.5 py-0.5 font-mono text-xs text-fg-muted hover:bg-line hover:text-fg ${className}`}
    >
      {copied ? 'Copied' : label}
      <span className="sr-only" aria-live="polite">
        {copied ? ' to clipboard' : ''}
      </span>
    </button>
  )
}
