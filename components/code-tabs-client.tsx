'use client'

import { useState } from 'react'

import { CopyButton } from './copy-button'
import { TabList } from './tab-list'

export interface RenderedTab {
  label: string
  code: string
  html: string
}

export function CodeTabsClient({ id, label, tabs }: { id: string; label: string; tabs: RenderedTab[] }) {
  const [selected, setSelected] = useState(0)
  const tab = tabs[selected]

  return (
    <div className="my-5 rounded-md border border-line bg-surface">
      <div className="flex items-end justify-between gap-2 pr-2">
        <TabList
          id={id}
          label={label}
          labels={tabs.map((item) => item.label)}
          selected={selected}
          onSelect={setSelected}
          className="min-w-0 flex-1"
        />
        <CopyButton text={tab.code} className="mb-1.5" />
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${selected}`}
        className="code-padded border-t border-line"
        dangerouslySetInnerHTML={{ __html: tab.html }}
      />
    </div>
  )
}
