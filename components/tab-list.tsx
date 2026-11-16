'use client'

import { useRef, type KeyboardEvent } from 'react'

const TONES = {
  page: {
    list: 'border-b border-line',
    tab: 'text-fg-muted hover:text-fg aria-selected:text-fg aria-selected:border-accent',
  },
  term: {
    list: 'border-b border-term-line',
    tab: 'text-term-dim hover:text-term-fg aria-selected:text-term-fg aria-selected:border-term-accent',
  },
}

// Tabs with the keyboard behaviour of the WAI-ARIA tabs pattern (arrow keys, Home, End)
export function TabList({
  id,
  label,
  labels,
  selected,
  onSelect,
  tone = 'page',
  className = '',
}: {
  id: string
  label: string
  labels: string[]
  selected: number
  onSelect: (index: number) => void
  tone?: keyof typeof TONES
  className?: string
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  function select(index: number) {
    const next = (index + labels.length) % labels.length
    onSelect(next)
    tabs.current[next]?.focus()
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const target = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: labels.length - 1,
    }[event.key]
    if (target == null) return
    event.preventDefault()
    select(target)
  }

  return (
    <div role="tablist" aria-label={label} className={`flex overflow-x-auto ${TONES[tone].list} ${className}`}>
      {labels.map((text, index) => (
        <button
          key={text}
          ref={(element) => {
            tabs.current[index] = element
          }}
          type="button"
          role="tab"
          id={`${id}-tab-${index}`}
          aria-selected={index === selected}
          aria-controls={`${id}-panel`}
          tabIndex={index === selected ? 0 : -1}
          onClick={() => onSelect(index)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={`-mb-px shrink-0 cursor-pointer border-b-2 border-transparent px-3 py-2 font-mono text-[0.8125rem] whitespace-nowrap ${TONES[tone].tab}`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
