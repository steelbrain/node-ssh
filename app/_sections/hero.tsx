import { CHANGELOG_URL } from '@/components/docs'
import { InstallCommand } from '@/components/install-command'

const FACTS = [
  { term: 'Latest release', value: <a href={CHANGELOG_URL}>14.0.0</a> },
  { term: 'Node.js', value: '22 or later' },
  { term: 'Modules', value: 'CommonJS and ESM' },
  { term: 'Types', value: <a href="#typescript">included</a> },
  { term: 'License', value: 'MIT' },
]

export function Hero() {
  return (
    <div className="mx-auto max-w-[1160px] px-4 pt-14 pb-12 sm:px-6 sm:pt-20">
      <h1 className="font-mono text-5xl font-semibold tracking-tight sm:text-6xl">node-ssh</h1>
      <p className="mt-5 max-w-[56ch] text-lg leading-relaxed sm:text-xl">
        A promise-based SSH client for Node.js, built on <a href="https://github.com/mscdex/ssh2">ssh2</a>. Run commands,
        transfer files and whole directories over SFTP, open shells and forward ports, with <code>await</code> instead of
        callbacks.
      </p>
      <div className="mt-8">
        <InstallCommand />
      </div>
      <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-5">
        {FACTS.map((fact) => (
          <div key={fact.term}>
            <dt className="text-fg-muted">{fact.term}</dt>
            <dd className="mt-0.5 font-mono">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
