import type { ReactNode } from 'react'

export const REPO_URL = 'https://github.com/steelbrain/node-ssh'
export const NPM_URL = 'https://www.npmjs.com/package/node-ssh'
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`

export function Section({
  id,
  title,
  children,
  className = '',
}: {
  id: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-6 ${className}`}>
      <h2 id={`${id}-title`} className="font-mono text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        <a href={`#${id}`} className="text-fg no-underline hover:underline">
          {title}
        </a>
      </h2>
      {children}
    </section>
  )
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-10 mb-3 scroll-mt-6 font-mono text-lg font-semibold">
      {id != null ? (
        <a href={`#${id}`} className="text-fg no-underline hover:underline">
          {children}
        </a>
      ) : (
        children
      )}
    </h3>
  )
}

// A link to an issue or pull request in the node-ssh repository
export function Issue({ number }: { number: number }) {
  return (
    <a href={`${REPO_URL}/issues/${number}`} className="font-mono text-[0.875em] whitespace-nowrap">
      #{number}
    </a>
  )
}

export interface Option {
  name: string
  type: string
  default?: string
  children: ReactNode
}

export function Options({ label, items }: { label: string; items: Option[] }) {
  return (
    <dl aria-label={label} className="my-5 border-t border-line">
      {items.map((item) => (
        <div
          key={item.name}
          className="grid gap-x-6 gap-y-1 border-b border-line py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
        >
          <dt className="min-w-0">
            <code className="!border-0 !bg-transparent !p-0 font-mono text-[0.9375rem] font-medium">{item.name}</code>
            <div className="font-mono text-xs break-words text-fg-muted">{item.type}</div>
          </dt>
          <dd className="min-w-0 text-[0.9375rem]">
            {item.children}
            {item.default != null ? (
              <span className="mt-1 block text-sm text-fg-muted">
                Default: <code>{item.default}</code>
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
