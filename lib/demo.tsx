import type { PlayerEvent, PlayerSession } from '@/components/session-player'
import recording from '@/recordings/sessions.json'
import type { ReactNode } from 'react'

import { highlight } from './highlight'

// What the examples show for the connection. The recordings connected to a local test server instead.
export const DEMO_PREAMBLE = `import { NodeSSH } from 'node-ssh'

const ssh = new NodeSSH()
await ssh.connect({
  host: 'web-1.example.com',
  username: 'deploy',
  privateKeyPath: '/home/you/.ssh/id_ed25519',
})`

export const DEMO_EPILOGUE = 'ssh.dispose()'

// In the order the player shows them
const DETAILS: { id: string; title: string; caption: ReactNode }[] = [
  {
    id: 'run-command',
    title: 'Run a command',
    caption: (
      <>
        <code>execCommand</code> resolves with the exit code, the signal and the trimmed output, also when the command fails,
        so check <code>code</code>. A <code>cwd</code> that starts with <code>~/</code> is relative to the remote user’s home
        directory (new in 14.0.0).
      </>
    ),
  },
  {
    id: 'stream-abort',
    title: 'Stream and abort',
    caption: (
      <>
        <code>onStdout</code> gets each chunk as the server sends it. When the <code>AbortSignal</code> aborts, node-ssh asks
        the server to send <code>TERM</code> to <code>tail</code>, closes the channel and rejects with{' '}
        <code>signal.reason</code> (new in 14.0.0).
      </>
    ),
  },
  {
    id: 'timeout',
    title: 'Time out',
    caption: (
      <>
        When <code>timeout</code> passes, node-ssh asks the server to send <code>killSignal</code> (<code>TERM</code> unless
        set) to the command, closes the channel and rejects with an <code>SSHError</code> whose code is{' '}
        <code>ETIMEDOUT</code>. OpenSSH sends the signal to the command’s process group (new in 14.0.0).
      </>
    ),
  },
  {
    id: 'upload',
    title: 'Upload changes',
    caption: (
      <>
        <code>skipUnchanged</code> skips files whose remote copy has the same size and modification time, and{' '}
        <code>tick</code> gets <code>skipped</code> as a fourth argument. <code>atomic</code> uploads each file to a hidden
        temporary file and renames it into place (both new in 14.0.0).
      </>
    ),
  },
  {
    id: 'escaping',
    title: 'Escape arguments',
    caption: (
      <>
        <code>exec</code> escapes each parameter before the remote shell sees it. <code>execCommand</code> sends the command
        as written, so the shell expands <code>$HOME</code> and runs the second command.
      </>
    ),
  },
  {
    id: 'error-message',
    title: 'Read the error',
    caption: (
      <>
        SFTP servers answer an upload onto a directory with a bare <code>Failure</code>. Since 14.0.0, node-ssh adds which
        path is a directory and what to pass instead.
      </>
    ),
  },
]

export interface Demo {
  sessions: PlayerSession[]
  preambleHtml: string
  preambleLineCount: number
  epilogueHtml: string
}

export async function getDemo(): Promise<Demo> {
  const sessions = await Promise.all(
    DETAILS.map(async ({ id, title, caption }) => {
      const recorded = recording.sessions.find((item) => item.id === id)
      if (recorded == null) {
        throw new Error(`recordings/sessions.json has no session ${id}`)
      }
      return {
        id,
        title,
        caption,
        codeHtml: await highlight(recorded.code, 'js'),
        lineCount: recorded.code.split('\n').length,
        events: recorded.events as PlayerEvent[],
        durationMs: recorded.durationMs,
      }
    }),
  )

  return {
    sessions,
    preambleHtml: await highlight(DEMO_PREAMBLE, 'js'),
    preambleLineCount: DEMO_PREAMBLE.split('\n').length,
    epilogueHtml: await highlight(DEMO_EPILOGUE, 'js'),
  }
}
