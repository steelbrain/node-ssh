import { Code } from '@/components/code'
import { H3, Section } from '@/components/docs'
import { API_DECLARATIONS } from '@/lib/api-declarations'
import { highlight } from '@/lib/highlight'
import type { ReactNode } from 'react'

interface Member {
  name: string
  signature: string
  description: ReactNode
  guide?: string
}

const GROUPS: { title: string; members: Member[] }[] = [
  {
    title: 'Connection',
    members: [
      {
        name: 'connect',
        signature: 'connect(config: Config): Promise<this>',
        description: (
          <>
            Opens the connection and resolves with the instance once the server accepts the login. Throws an{' '}
            <code>AssertionError</code> for invalid <code>config</code>.
          </>
        ),
        guide: 'connect',
      },
      {
        name: 'isConnected',
        signature: 'isConnected(): boolean',
        description: <>Whether the connection is ready and hasn’t ended or closed.</>,
      },
      {
        name: 'dispose',
        signature: 'dispose(): void',
        description: <>Ends the connection, after pending SFTP close replies or 2 seconds, whichever comes first.</>,
        guide: 'errors',
      },
      {
        name: 'connection',
        signature: 'connection: Client | null',
        description: (
          <>
            ssh2’s <code>Client</code> while connected, otherwise <code>null</code>. For ssh2 features node-ssh doesn’t wrap,
            and for errors on an idle connection.
          </>
        ),
      },
    ],
  },
  {
    title: 'Commands',
    members: [
      {
        name: 'execCommand',
        signature: 'execCommand(command: string, options?: SSHExecCommandOptions): Promise<SSHExecCommandResponse>',
        description: (
          <>
            Runs <code>command</code> in the remote user’s shell and resolves with <code>stdout</code>, <code>stderr</code>,{' '}
            <code>code</code> and <code>signal</code> when it exits.
          </>
        ),
        guide: 'commands',
      },
      {
        name: 'exec',
        signature: `exec(
  command: string,
  parameters: string[],
  options?: SSHExecOptions & { stream?: 'stdout' | 'stderr' },
): Promise<string>
exec(
  command: string,
  parameters: string[],
  options?: SSHExecOptions & { stream: 'both' },
): Promise<SSHExecCommandResponse>`,
        description: (
          <>
            Escapes <code>parameters</code> and runs the command. Resolves with <code>stdout</code> and rejects if anything
            was written to stderr, unless <code>stream</code> says otherwise.
          </>
        ),
        guide: 'commands',
      },
    ],
  },
  {
    title: 'Files',
    members: [
      {
        name: 'putFile',
        signature: `putFile(
  localFile: string,
  remoteFile: string,
  sftp?: SFTPWrapper | null,
  transferOptions?: TransferOptions | null,
  options?: SSHPutFileOptions,
): Promise<void>`,
        description: (
          <>
            Uploads a file and creates missing remote directories. <code>options</code>: <code>atomic</code>,{' '}
            <code>skipUnchanged</code>.
          </>
        ),
        guide: 'files',
      },
      {
        name: 'putFiles',
        signature: `putFiles(
  files: { local: string; remote: string }[],
  options?: SSHPutFilesOptions,
): Promise<void>`,
        description: (
          <>
            Uploads files, <code>concurrency</code> at a time. Rejects on the first failure, with the files uploaded before
            it in <code>error.transferred</code>.
          </>
        ),
        guide: 'files',
      },
      {
        name: 'putDirectory',
        signature: `putDirectory(
  localDirectory: string,
  remoteDirectory: string,
  options?: SSHGetPutDirectoryOptions,
): Promise<boolean>`,
        description: (
          <>
            Uploads a directory. Resolves with <code>false</code> if any file failed.
          </>
        ),
        guide: 'directories',
      },
      {
        name: 'getFile',
        signature: `getFile(
  localFile: string,
  remoteFile: string,
  sftp?: SFTPWrapper | null,
  transferOptions?: TransferOptions | null,
): Promise<void>`,
        description: <>Downloads a file. The local path comes first.</>,
        guide: 'files',
      },
      {
        name: 'getDirectory',
        signature: `getDirectory(
  localDirectory: string,
  remoteDirectory: string,
  options?: SSHGetPutDirectoryOptions,
): Promise<boolean>`,
        description: (
          <>
            Downloads a directory into an existing local directory. Resolves with <code>false</code> if any file failed.
            Ignores <code>atomic</code> and <code>skipUnchanged</code>.
          </>
        ),
        guide: 'directories',
      },
      {
        name: 'mkdir',
        signature: "mkdir(path: string, method?: 'sftp' | 'exec', sftp?: SFTPWrapper | null): Promise<void>",
        description: (
          <>
            Creates a remote directory and its parents, over SFTP (the default) or with <code>mkdir -p</code>.
          </>
        ),
        guide: 'mkdir',
      },
    ],
  },
  {
    title: 'Shells and SFTP sessions',
    members: [
      {
        name: 'requestShell',
        signature: 'requestShell(options?: PseudoTtyOptions | ShellOptions | false): Promise<ClientChannel>',
        description: <>Opens an interactive shell.</>,
        guide: 'sessions',
      },
      {
        name: 'withShell',
        signature: `withShell(
  callback: (channel: ClientChannel) => Promise<void>,
  options?: PseudoTtyOptions | ShellOptions | false,
): Promise<void>`,
        description: <>Opens a shell, passes it to the callback and destroys it when the callback settles.</>,
        guide: 'sessions',
      },
      {
        name: 'requestSFTP',
        signature: 'requestSFTP(): Promise<SFTPWrapper>',
        description: <>Opens an SFTP session.</>,
        guide: 'sessions',
      },
      {
        name: 'withSFTP',
        signature: 'withSFTP(callback: (sftp: SFTPWrapper) => Promise<void>): Promise<void>',
        description: <>Opens an SFTP session, passes it to the callback and ends it when the callback settles.</>,
        guide: 'reuse-sftp',
      },
    ],
  },
  {
    title: 'Port forwarding',
    members: [
      {
        name: 'forwardIn',
        signature: `forwardIn(
  remoteAddr: string,
  remotePort: number,
  onConnection?: SSHForwardInListener,
): Promise<SSHForwardInDetails>`,
        description: (
          <>
            Listens on the server and calls <code>onConnection</code> for each connection. Resolves with <code>port</code>{' '}
            and <code>dispose()</code>.
          </>
        ),
        guide: 'forwarding',
      },
      {
        name: 'forwardOut',
        signature: 'forwardOut(srcIP: string, srcPort: number, dstIP: string, dstPort: number): Promise<Channel>',
        description: (
          <>
            Opens a channel to <code>dstIP:dstPort</code> as seen from the server.
          </>
        ),
        guide: 'forwarding',
      },
      {
        name: 'forwardInStreamLocal',
        signature: `forwardInStreamLocal(
  socketPath: string,
  onConnection?: SSHForwardInStreamLocalListener,
): Promise<SSHForwardInStreamLocalDetails>`,
        description: (
          <>
            <code>forwardIn</code> for a Unix domain socket on the server. Resolves with <code>dispose()</code>.
          </>
        ),
        guide: 'forwarding',
      },
      {
        name: 'forwardOutStreamLocal',
        signature: 'forwardOutStreamLocal(socketPath: string): Promise<Channel>',
        description: (
          <>
            <code>forwardOut</code> to a Unix domain socket on the server.
          </>
        ),
        guide: 'forwarding',
      },
    ],
  },
]

async function MemberEntry({ member }: { member: Member }) {
  const html = await highlight(member.signature, 'ts')
  return (
    <div id={`api-${member.name}`} className="scroll-mt-6 border-t border-line py-4">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <p className="mt-2 max-w-[72ch] text-[0.9375rem]">
        {member.description}
        {member.guide != null ? (
          <>
            {' '}
            <a href={`#${member.guide}`} className="whitespace-nowrap">
              Guide
            </a>
          </>
        ) : null}
      </p>
    </div>
  )
}

export function ApiReference() {
  return (
    <Section id="api" title="API reference">
      <div className="prose">
        <p>
          The package exports <code>NodeSSH</code>, <code>SSHError</code> and the types below. Methods of{' '}
          <code>NodeSSH</code>:
        </p>
      </div>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <H3>{group.title}</H3>
          <div className="border-b border-line">
            {group.members.map((member) => (
              <MemberEntry key={member.name} member={member} />
            ))}
          </div>
        </div>
      ))}
      <H3>Types</H3>
      <div className="prose">
        <p>
          <code>SSHError</code> extends <code>Error</code> with <code>code: string | null</code>. The option and result
          types, in full:
        </p>
      </div>
      <details className="group my-5 rounded-md border border-line">
        <summary className="cursor-pointer px-4 py-2.5 font-mono text-sm select-none hover:bg-surface">
          Type declarations <span className="text-fg-muted">({API_DECLARATIONS.split('\n').length} lines)</span>
        </summary>
        <div className="border-t border-line px-3 pb-1">
          <Code code={API_DECLARATIONS} lang="ts" title="node-ssh" />
        </div>
      </details>
    </Section>
  )
}
