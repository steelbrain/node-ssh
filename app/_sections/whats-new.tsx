import { CHANGELOG_URL, H3, Issue, Options, Section } from '@/components/docs'

export function WhatsNew() {
  return (
    <Section id="whats-new" title="What’s new in 14.0.0">
      <div className="prose">
        <p>
          14.0.0 requires Node.js 22 or later. These are the main changes; the <a href={CHANGELOG_URL}>changelog</a> has all
          of them.
        </p>
      </div>

      <H3>New options</H3>
      <Options
        label="New options"
        items={[
          {
            name: 'timeout, signal, killSignal',
            type: 'exec, execCommand',
            children: (
              <>
                Stop a command after a number of milliseconds or when an <code>AbortSignal</code> aborts.{' '}
                <a href="#timeouts">Timeouts</a>
              </>
            ),
          },
          {
            name: 'noBuffer',
            type: 'exec, execCommand',
            children: (
              <>
                Send output only to <code>onStdout</code> and <code>onStderr</code>. Without it, output too large for a
                string now rejects with <code>ERR_OUTPUT_TOO_LARGE</code> instead of crashing the process.{' '}
                <a href="#large-output">Large output</a>
              </>
            ),
          },
          {
            name: 'atomic',
            type: 'putFile, putFiles, putDirectory',
            children: (
              <>
                Upload to a temporary file and rename it into place, so readers never see a partial file.{' '}
                <a href="#atomic">Atomic uploads</a>
              </>
            ),
          },
          {
            name: 'skipUnchanged',
            type: 'putFile, putFiles, putDirectory',
            children: (
              <>
                Skip files whose remote copy has the same size and modification time.{' '}
                <a href="#skip-unchanged">Skipping unchanged files</a>
              </>
            ),
          },
        ]}
      />

      <H3>Behaviour changes</H3>
      <div className="prose">
        <ul>
          <li>
            An error on an idle connection, such as <code>ECONNRESET</code>, no longer crashes the process.{' '}
            <Issue number={132} />
          </li>
          <li>
            <code>exec</code> and <code>execCommand</code> reject when the connection fails during the command or a callback
            such as <code>onStdout</code> throws. They used to resolve with <code>code: null</code>, or close the connection.{' '}
            <Issue number={132} /> <Issue number={257} />
          </li>
          <li>
            With <code>cwd</code>, the command no longer runs when <code>cd</code> fails, and a leading <code>~</code> is the
            remote user’s home directory. <Issue number={443} />
          </li>
          <li>
            The CommonJS and ESM builds each have their own type declarations, which no longer need{' '}
            <code>esModuleInterop</code>. TypeScript now rejects <code>import NodeSSH from &apos;node-ssh&apos;</code>;
            import <code>{'{ NodeSSH }'}</code> by name. <Issue number={444} />
          </li>
        </ul>
      </div>
    </Section>
  )
}
