import { CHANGELOG_URL, NPM_URL, REPO_URL } from '@/components/docs'
import Link from 'next/link'

const LINKS = [
  { href: '#guide', label: 'Guide', wide: true },
  { href: '#api', label: 'API', wide: true },
  { href: CHANGELOG_URL, label: 'Changelog', wide: true },
  { href: REPO_URL, label: 'GitHub', wide: false },
  { href: NPM_URL, label: 'npm', wide: false },
]

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-mono text-[0.9375rem] font-semibold text-fg no-underline">
          node-ssh <span className="font-normal text-fg-muted">14.0.0</span>
        </Link>
        <nav aria-label="Site">
          <ul className="flex gap-4 text-sm sm:gap-5">
            {LINKS.map((link) => (
              <li key={link.label} className={link.wide ? 'hidden md:block' : undefined}>
                <a href={link.href} className="text-fg no-underline hover:underline">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
