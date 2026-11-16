import { CHANGELOG_URL, NPM_URL, REPO_URL } from '@/components/docs'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-4 px-4 py-8 text-sm text-fg-muted sm:flex-row sm:justify-between sm:px-6">
        <p className="max-w-[60ch]">
          node-ssh is written by <a href="https://aneesiqbal.ai/">Anees Iqbal</a> (steelbrain) and contributors, builds on{' '}
          <a href="https://github.com/mscdex/ssh2">ssh2</a> by Brian White, and is released under the MIT license.
        </p>
        <ul className="flex gap-5">
          <li>
            <a href={REPO_URL}>GitHub</a>
          </li>
          <li>
            <a href={NPM_URL}>npm</a>
          </li>
          <li>
            <a href={CHANGELOG_URL}>Changelog</a>
          </li>
          <li>
            <a href={`${REPO_URL}/issues`}>Issues</a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
