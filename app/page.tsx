import { ApiReference } from './_sections/api'
import { Examples } from './_sections/examples'
import { Footer } from './_sections/footer'
import { Commands, Connect, Errors, Files, Forwarding, Sessions, TypeScript } from './_sections/guide'
import { Header } from './_sections/header'
import { Hero } from './_sections/hero'
import { WhatsNew } from './_sections/whats-new'

const CONTENTS = [
  { id: 'whats-new', label: 'What’s new in 14.0.0' },
  { id: 'connect', label: 'Connect' },
  { id: 'commands', label: 'Run commands' },
  { id: 'timeouts', label: 'Timeouts', nested: true },
  { id: 'files', label: 'Transfer files' },
  { id: 'directories', label: 'Directories', nested: true },
  { id: 'atomic', label: 'Atomic uploads', nested: true },
  { id: 'skip-unchanged', label: 'Skipping unchanged files', nested: true },
  { id: 'sessions', label: 'Shells and SFTP' },
  { id: 'forwarding', label: 'Port forwarding' },
  { id: 'errors', label: 'Errors and disconnecting' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'api', label: 'API reference' },
]

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Examples />
        <div
          id="guide"
          className="mx-auto mt-20 max-w-[1160px] scroll-mt-6 px-4 sm:px-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12"
        >
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-6">
              <p className="mb-2 font-mono text-xs text-fg-muted">On this page</p>
              <ul className="space-y-1 text-sm">
                {CONTENTS.map((item) => (
                  <li key={item.id} className={item.nested ? 'pl-3' : undefined}>
                    <a
                      href={`#${item.id}`}
                      className={`no-underline hover:underline ${item.nested ? 'text-fg-muted' : 'text-fg'}`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
          <div className="min-w-0 space-y-20">
            <WhatsNew />
            <Connect />
            <Commands />
            <Files />
            <Sessions />
            <Forwarding />
            <Errors />
            <TypeScript />
            <ApiReference />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
