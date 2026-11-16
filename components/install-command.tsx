'use client'

import { useState } from 'react'

import { CopyButton } from './copy-button'
import { TabList } from './tab-list'

const COMMANDS = [
  { manager: 'npm', command: 'npm install node-ssh' },
  { manager: 'yarn', command: 'yarn add node-ssh' },
  { manager: 'pnpm', command: 'pnpm add node-ssh' },
]

export function InstallCommand() {
  const [selected, setSelected] = useState(0)
  const { command } = COMMANDS[selected]

  return (
    <div className="max-w-md rounded-md border border-line bg-surface">
      <TabList
        id="install"
        label="Package manager"
        labels={COMMANDS.map((item) => item.manager)}
        selected={selected}
        onSelect={setSelected}
      />
      <div
        role="tabpanel"
        id="install-panel"
        aria-labelledby={`install-tab-${selected}`}
        className="flex items-center justify-between gap-3 py-2.5 pr-2 pl-3"
      >
        <code className="!border-0 !bg-transparent !p-0 font-mono text-[0.9375rem]">
          <span className="text-fg-muted select-none">$ </span>
          {command}
        </code>
        <CopyButton text={command} />
      </div>
    </div>
  )
}
