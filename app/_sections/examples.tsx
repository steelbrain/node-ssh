import { SessionPlayer } from '@/components/session-player'
import { getDemo } from '@/lib/demo'

export async function Examples() {
  const demo = await getDemo()

  return (
    <section id="examples" aria-labelledby="examples-title" className="mx-auto max-w-[1160px] scroll-mt-6 px-4 sm:px-6">
      <h2 id="examples-title" className="mb-4 font-mono text-lg font-semibold">
        Examples with recorded output
      </h2>
      <SessionPlayer
        sessions={demo.sessions}
        preambleHtml={demo.preambleHtml}
        preambleLineCount={demo.preambleLineCount}
        epilogueHtml={demo.epilogueHtml}
      />
      <p className="mt-3 max-w-[90ch] text-sm text-fg-muted">
        Each example ran with node-ssh 14.0.0 against OpenSSH 9.2 on Debian 12, and its output plays back at the speed it was
        recorded. The host name and key path in the code stand in for the test server’s.
      </p>
    </section>
  )
}
