# node-ssh

node-ssh is an SSH client for Node.js with a Promise-based API. It runs commands, transfers files
and directories over SFTP, opens interactive shells, and forwards TCP ports and Unix sockets.

## Installation

```sh
npm install node-ssh
```

node-ssh needs Node.js 22 or newer. TypeScript projects also need `@types/ssh2`; see
[TypeScript](#typescript).

## Usage

The examples use `await`, so they run inside an `async` function or an ES module.

### Connecting

```js
const { NodeSSH } = require('node-ssh')
// or: import { NodeSSH } from 'node-ssh'

const ssh = new NodeSSH()

await ssh.connect({
  host: 'localhost',
  username: 'steel',
  privateKeyPath: '/home/steel/.ssh/id_rsa',
})
```

`connect` takes [ssh2's connection options][ssh2], such as `port`, `password`, `passphrase` (for
an encrypted key) and `agent`. node-ssh adds:

- `privateKeyPath`: the path of a private key file to read. To pass the key itself, use
  `privateKey` with a string or a `Buffer`.
- `tryKeyboard` and `onKeyboardInteractive`: see
  [Keyboard-interactive authentication](#keyboard-interactive-authentication).

Call `ssh.dispose()` to close the connection when you're done.

### Keyboard-interactive authentication

Some servers ask for the password through keyboard-interactive authentication instead of accepting
it as a `password`. Connecting to them with only `password` fails with
`All configured authentication methods failed`. With `tryKeyboard: true`, node-ssh also tries
keyboard-interactive authentication, and answers with `password` when the server's first prompt
contains "password":

```js
await ssh.connect({
  host: 'localhost',
  username: 'steel',
  password: 'secret',
  tryKeyboard: true,
})
```

To answer the prompts yourself, pass `onKeyboardInteractive`:

```js
const password = 'secret'

await ssh.connect({
  host: 'localhost',
  username: 'steel',
  tryKeyboard: true,
  onKeyboardInteractive(name, instructions, instructionsLang, prompts, finish) {
    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
      finish([password])
    }
  },
})
```

`onKeyboardInteractive` is called only when the server offers keyboard-interactive
authentication. OpenSSH offers it when `KbdInteractiveAuthentication` is `yes` in `sshd_config`;
Debian and Ubuntu set it to `no`. Their servers still accept a `password`.

To choose how to log in while connecting, for example asking for a password only after the server
refused the key, pass ssh2's [`authHandler`][ssh2] option, which node-ssh passes on to ssh2. Or
catch the error and connect again:

```js
try {
  await ssh.connect({ host: 'localhost', username: 'steel', privateKeyPath: '/home/steel/.ssh/id_rsa' })
} catch (error) {
  if (error.level !== 'client-authentication') throw error
  await ssh.connect({ host: 'localhost', username: 'steel', password: await askForPassword() })
}
```

See also [ssh2 issue #604](https://github.com/mscdex/ssh2/issues/604).

### Running commands

```js
const result = await ssh.execCommand('ls -la', { cwd: '/var/www' })
console.log(result.code, result.stdout, result.stderr)
```

`execCommand` resolves with the command's `stdout`, `stderr`, exit `code` and `signal`, whatever
the exit code is. It trims whitespace from the start and end of the output; pass `noTrim: true`
to keep it, for example when reading a file's exact contents.

With `cwd`, the command runs in that directory; a leading `~` is the remote user's home directory.
If the directory doesn't exist, the command doesn't run, and the result has the shell's error in
`stderr` and a non-zero `code`.

`exec` takes the arguments separately and quotes each one for the remote shell:

```js
const subject = await ssh.exec('git', ['log', '-1', '--format=%s'], { cwd: '/var/www' })
```

`exec` resolves with `stdout`, and rejects when the command writes anything to `stderr`, with that
output as the error message. It doesn't look at the exit code. Pass `stream: 'stderr'` to get
`stderr` instead, or `stream: 'both'` to get the same result as `execCommand`, without the
rejection.

To see output as it arrives, pass `onStdout` and `onStderr`. They get each chunk as a `Buffer`:

```js
await ssh.execCommand('npm ci', {
  cwd: '/var/www',
  onStdout(chunk) {
    process.stdout.write(chunk)
  },
  onStderr(chunk) {
    process.stderr.write(chunk)
  },
})
```

For large output, `noBuffer: true` passes the output only to the callbacks, so `result.stdout`
and `result.stderr` are empty strings, and `exec` no longer rejects because of `stderr` output.

`stdin` (a string or a readable stream) is written to the command's stdin; see
[Answering prompts](#answering-prompts).

### Timeouts and stopping commands

`exec` and `execCommand` take a `timeout` in milliseconds, counted from the call. When it passes,
node-ssh asks the server to send `killSignal` (default `'TERM'`) to the command, closes the
command's channel and rejects with an `SSHError` whose `code` is `'ETIMEDOUT'`:

```js
try {
  const result = await ssh.execCommand('./build.sh', { cwd: '/var/www', timeout: 5000 })
  console.log('STDOUT: ' + result.stdout)
} catch (error) {
  if (error.code !== 'ETIMEDOUT') throw error
  console.log('build.sh did not finish within 5 seconds')
}
```

To stop a command yourself, pass an `AbortSignal` as `signal`. Aborting it does the same as the
timeout, and the promise rejects with `signal.reason`. If the signal is already aborted, the
promise rejects right away and the command does not run.

```js
const controller = new AbortController()
const tail = ssh.execCommand('tail -f /var/log/syslog', {
  signal: controller.signal,
  onStdout(chunk) {
    process.stdout.write(chunk)
  },
})
// later
controller.abort()
await tail.catch((error) => console.log(error.name)) // AbortError
```

`killSignal` is one of `ABRT`, `ALRM`, `FPE`, `HUP`, `ILL`, `INT`, `KILL`, `PIPE`, `QUIT`, `SEGV`,
`TERM`, `USR1` and `USR2` (the signal names SSH defines), with or without the `SIG` prefix.

The promise rejects as soon as the timeout passes or the signal aborts, without waiting for the
command to exit. What happens to the command depends on the server:

- OpenSSH (tested with 9.2) sends the signal to the command's process group, so programs that a
  shell command started get it too. A command can ignore or catch the signal and keep running;
  `KILL` can't be ignored.
- Without a pseudo-TTY, closing the channel does not stop the command on OpenSSH. With
  `execOptions: { pty: true }`, OpenSSH also hangs up the terminal when the channel closes, which
  sends `SIGHUP` to the command.
- OpenSSH refuses signal requests for forced commands (such as `command=` in `authorized_keys`),
  and other servers may ignore them. Without a pseudo-TTY, the command then keeps running.

ssh2's `channel.signal()` (on the channel that `onChannel` receives) sends nothing once the
channel's stdin has ended, and `execCommand` ends it right away when `stdin` is a string or not
given. The `timeout` and `signal` options send the signal request in that case too.

### Pseudo-TTY commands

Some programs only run in a terminal, such as `screen` or `tmux` when attaching to a session. Pass
`pty: true` in `execOptions` to give the command a pseudo-TTY:

```js
const result = await ssh.execCommand('tty', { execOptions: { pty: true } })
console.log(result.stdout) // the terminal's device, such as /dev/pts/0
```

A pseudo-TTY gives the remote program one terminal for both of its output streams, so with
`pty: true` everything it writes arrives in `stdout` (and `onStdout`) and `stderr` stays empty.
The terminal also echoes `stdin` into `stdout`, and line endings in the output are `\r\n`.

### Interactive programs

To use an interactive program such as `vim` or `nano` from a script, give it a pseudo-TTY the
size of your terminal and connect it to your terminal. Raw mode sends each key as you type it,
including Esc and Ctrl keys:

```js
process.stdin.setRawMode(true)
let onResize = () => {}
try {
  const result = await ssh.execCommand('vim /tmp/notes.txt', {
    execOptions: {
      pty: { term: process.env.TERM || 'xterm-256color', rows: process.stdout.rows, cols: process.stdout.columns },
    },
    stdin: process.stdin,
    // The output is the program's screen: show it, but don't keep it in result.stdout
    noBuffer: true,
    onStdout: (chunk) => process.stdout.write(chunk),
    // Pass local terminal resizes on to the remote terminal
    onChannel: (channel) => {
      onResize = () => channel.setWindow(process.stdout.rows, process.stdout.columns, 0, 0)
      process.stdout.on('resize', onResize)
    },
  })
  console.log('exit code', result.code)
} finally {
  process.stdout.off('resize', onResize)
  process.stdin.setRawMode(false)
  process.stdin.unpipe()
  process.stdin.pause()
}
```

For an interactive shell, pass the same terminal settings to `requestShell`:

```js
const shell = await ssh.requestShell({
  term: process.env.TERM || 'xterm-256color',
  rows: process.stdout.rows,
  cols: process.stdout.columns,
})
const onResize = () => shell.setWindow(process.stdout.rows, process.stdout.columns, 0, 0)
process.stdout.on('resize', onResize)
process.stdin.setRawMode(true)
process.stdin.pipe(shell)
shell.pipe(process.stdout)
// Typing `exit` closes the shell
shell.on('close', () => {
  process.stdout.off('resize', onResize)
  process.stdin.setRawMode(false)
  process.stdin.unpipe(shell)
  process.stdin.pause()
  ssh.dispose()
})
```

OpenSSH runs the user's login shell (from `/etc/passwd` on most systems) for `requestShell` and
for every command; a `SHELL` variable in `env` does not change that. To use another shell, run it
as the command, such as `'ksh -l'` instead of `'vim /tmp/notes.txt'` in the first example. To run
commands in it without a terminal, pass them as `stdin`; the shell exits at the end of its stdin:

```js
const result = await ssh.execCommand('ksh -l', { stdin: 'echo $0\necho $KSH_VERSION\n' })
```

### Answering prompts

A program that asks questions reads the answers from its stdin. If it reads them without a
terminal, pass all of them as `stdin`:

```js
const result = await ssh.execCommand('./setup.sh', { stdin: 'alice\nsecret\n' })
```

Without a terminal, a program may not print its prompts (bash's `read -p` doesn't) or may not ask
at all. For example, `git clone` of an HTTPS repository that needs a login then fails with
`fatal: could not read Username for '<url>': No such device or address`. For those programs, add a
pseudo-TTY and write each answer once its prompt appears. The terminal echoes what you write into
`stdout` until the program turns echo off, so a password written before its prompt shows up in
`stdout`:

```js
const { PassThrough } = require('stream')

const answers = [
  ['Username:', 'alice\n'],
  ['Password:', 'secret\n'],
]
const stdin = new PassThrough()
let output = ''
const result = await ssh.execCommand('./setup.sh', {
  execOptions: { pty: true },
  stdin,
  onStdout(chunk) {
    output += chunk
    while (answers.length > 0 && output.includes(answers[0][0])) {
      stdin.write(answers.shift()[1])
      if (answers.length === 0) stdin.end()
    }
  },
})
```

With a pseudo-TTY, the end of `stdin` does not end the remote program, so an interactive shell
started this way keeps running until it gets `exit`.

In a `requestShell` session, the commands written after one that starts another shell go to that
shell, until `exit` returns to the first one:

```js
const shell = await ssh.requestShell()
let output = ''
shell.on('data', (chunk) => {
  output += chunk
})
shell.write('bash\n')
shell.write('echo "inside: SHLVL=$SHLVL"\n')
shell.write('exit\n') // leaves the inner shell
shell.write('echo "outside: SHLVL=$SHLVL"\n')
shell.write('exit\n') // leaves the login shell
await new Promise((resolve) => shell.on('close', resolve))
console.log(output.match(/(inside|outside): SHLVL=\d/g)) // [ 'inside: SHLVL=2', 'outside: SHLVL=1' ]
```

### Transferring files

```js
// Local path first, then the remote path, for both directions
await ssh.putFile('/home/steel/notes.txt', '/var/www/notes.txt')
await ssh.getFile('/home/steel/backup.sql', '/var/backups/db.sql')

await ssh.putFiles([
  { local: '/home/steel/a.txt', remote: '/var/www/a.txt' },
  { local: '/home/steel/b.txt', remote: '/var/www/b.txt' },
])
```

Both paths name the file itself: to upload into a directory, put the file name at the end of the
remote path. `putFile` creates missing remote directories.

`putDirectory` and `getDirectory` copy a directory with everything in it:

```js
const path = require('path')

const failed = []
const successful = await ssh.putDirectory('/home/steel/site', '/var/www/site', {
  concurrency: 10,
  validate(itemPath) {
    const name = path.basename(itemPath)
    return !name.startsWith('.') && name !== 'node_modules'
  },
  tick(localPath, remotePath, error) {
    if (error) failed.push(localPath)
  },
})
console.log(successful ? 'all files copied' : `failed: ${failed.join(', ')}`)
```

They copy one file at a time unless you pass `concurrency`; not every server handles many
transfers at once, so try a few values with yours. `validate` gets each path (local paths for
`putDirectory`, remote ones for `getDirectory`), and skips the ones it returns `false` for. By
default, names that start with `.` are skipped. `tick` is called for each file, with an error for
one that failed, and the promise resolves with `false` if any file failed. Pass
`recursive: false` to copy only the files directly in the directory.

### Atomic uploads

While a file uploads, its remote path holds an incomplete file, and a web server reading that path
could serve part of it. With `atomic: true`, `putFile`, `putFiles` and `putDirectory` upload each
file to a hidden temporary file in the same remote directory (`.fileName.<random hex>.tmp`) and
rename it to the remote path once the upload is complete:

```js
await ssh.putFile('/home/steel/Lab/localPath/fileName', '/var/www/fileName', null, null, { atomic: true })
await ssh.putDirectory('/home/steel/Lab/site', '/var/www/site', { atomic: true })
```

When the server supports the `posix-rename@openssh.com` SFTP extension (OpenSSH does), the rename
replaces an existing file in one step. Otherwise node-ssh uses a plain SFTP rename, and if that
fails, deletes the existing file and renames again; the remote path is missing for a moment, so
this fallback is not atomic.

The renamed file is a new file, so it does not keep the mode or owner of the file it replaces;
pass `transferOptions: { mode }` to set its mode. Creating the temporary file needs write
permission on the remote directory, not only on the file. If the upload or the rename fails,
node-ssh deletes the temporary file before rejecting. If the connection drops, the temporary file
can stay behind. `getDirectory` ignores `atomic`.

### Skipping unchanged files

With `skipUnchanged: true`, `putFile`, `putFiles` and `putDirectory` look up each remote path
first, and skip the upload when it is a regular file with the same size and modification time as
the local file. After uploading a file, they set its remote access and modification times to
those of the local file, so the next upload with `skipUnchanged` can skip it. The server's clock
does not matter.

```js
await ssh.putDirectory('/home/steel/Lab/site', '/var/www/site', {
  skipUnchanged: true,
  tick(localPath, remotePath, error, skipped) {
    if (error) {
      console.log('failed', localPath)
    } else if (skipped) {
      console.log('unchanged', localPath)
    } else {
      console.log('uploaded', localPath)
    }
  },
})
```

SFTP sends times in whole seconds, so node-ssh compares the local modification time rounded down
to a second. A file uploaded without `skipUnchanged` has the time of that upload as its
modification time, so the first upload with `skipUnchanged` uploads it again.

The check does not read file contents: a file that changed but kept its size and modification time
(for example one written by a tool that sets a fixed modification time) is skipped. A skipped file
keeps its remote mode and owner, even with `transferOptions: { mode }`.

`putDirectory` passes a fourth argument to `tick`, `skipped`: `true` for a skipped file and
`false` for an uploaded one. `putFile` and `putFiles` don't tell you which files they skipped.
With `atomic`, the times are set on the temporary file before the rename. If the server can't set
the times (for example on a file owned by another user), the upload rejects; without `atomic`,
the remote file already has the new contents at that point. `getDirectory` ignores
`skipUnchanged`.

## API

```ts
// Types from other packages that the declarations below use
import {
  AcceptConnection,
  Channel,
  Client,
  ClientChannel,
  ConnectConfig,
  ExecOptions,
  Prompt,
  PseudoTtyOptions,
  RejectConnection,
  SFTPWrapper,
  ShellOptions,
  TcpConnectionDetails,
  TransferOptions,
  UNIXConnectionDetails,
} from 'ssh2'
import { Readable } from 'stream'

export type Config = ConnectConfig & {
  password?: string
  privateKey?: string | Buffer
  privateKeyPath?: string
  tryKeyboard?: boolean
  onKeyboardInteractive?: (
    name: string,
    instructions: string,
    lang: string,
    prompts: Prompt[],
    finish: (responses: string[]) => void,
  ) => void
}
export interface SSHExecCommandOptions {
  // A leading ~ is the remote user's home directory
  cwd?: string
  stdin?: string | Readable
  execOptions?: ExecOptions
  encoding?: BufferEncoding
  noTrim?: boolean
  noBuffer?: boolean
  timeout?: number
  signal?: AbortSignal
  killSignal?: string
  onChannel?: (clientChannel: ClientChannel) => void
  onStdout?: (chunk: Buffer) => void
  onStderr?: (chunk: Buffer) => void
}
export interface SSHExecCommandResponse {
  stdout: string
  stderr: string
  code: number | null
  signal: string | null
}
export interface SSHExecOptions extends SSHExecCommandOptions {
  stream?: 'stdout' | 'stderr' | 'both'
}
export interface SSHPutFileOptions {
  atomic?: boolean
  skipUnchanged?: boolean
}
export interface SSHPutFilesOptions extends SSHPutFileOptions {
  sftp?: SFTPWrapper | null
  concurrency?: number
  transferOptions?: TransferOptions
}
export interface SSHGetPutDirectoryOptions extends SSHPutFilesOptions {
  tick?: (localFile: string, remoteFile: string, error: Error | null, skipped?: boolean) => void
  validate?: (path: string) => boolean
  recursive?: boolean
}
export type SSHMkdirMethod = 'sftp' | 'exec'
export type SSHForwardInListener = (
  details: TcpConnectionDetails,
  accept: AcceptConnection<ClientChannel>,
  reject: RejectConnection,
) => void
export interface SSHForwardInDetails {
  dispose(): Promise<void>
  port: number
}
export type SSHForwardInStreamLocalListener = (
  info: UNIXConnectionDetails,
  accept: AcceptConnection,
  reject: RejectConnection,
) => void
export interface SSHForwardInStreamLocalDetails {
  dispose(): Promise<void>
}
export class SSHError extends Error {
  code: string | null
  constructor(message: string, code?: string | null)
}

export class NodeSSH {
  connection: Client | null

  connect(config: Config): Promise<this>
  isConnected(): boolean
  requestShell(options?: PseudoTtyOptions | ShellOptions | false): Promise<ClientChannel>
  withShell(
    callback: (channel: ClientChannel) => Promise<void>,
    options?: PseudoTtyOptions | ShellOptions | false,
  ): Promise<void>
  requestSFTP(): Promise<SFTPWrapper>
  withSFTP(callback: (sftp: SFTPWrapper) => Promise<void>): Promise<void>
  execCommand(command: string, options?: SSHExecCommandOptions): Promise<SSHExecCommandResponse>
  exec(
    command: string,
    parameters: string[],
    options?: SSHExecOptions & {
      stream?: 'stdout' | 'stderr'
    },
  ): Promise<string>
  exec(
    command: string,
    parameters: string[],
    options?: SSHExecOptions & {
      stream: 'both'
    },
  ): Promise<SSHExecCommandResponse>
  mkdir(path: string, method?: SSHMkdirMethod, sftp?: SFTPWrapper | null): Promise<void>
  getFile(
    localFile: string,
    remoteFile: string,
    sftp?: SFTPWrapper | null,
    transferOptions?: TransferOptions | null,
  ): Promise<void>
  putFile(
    localFile: string,
    remoteFile: string,
    sftp?: SFTPWrapper | null,
    transferOptions?: TransferOptions | null,
    options?: SSHPutFileOptions,
  ): Promise<void>
  putFiles(files: { local: string; remote: string }[], options?: SSHPutFilesOptions): Promise<void>
  putDirectory(localDirectory: string, remoteDirectory: string, options?: SSHGetPutDirectoryOptions): Promise<boolean>
  getDirectory(localDirectory: string, remoteDirectory: string, options?: SSHGetPutDirectoryOptions): Promise<boolean>
  forwardIn(remoteAddr: string, remotePort: number, onConnection?: SSHForwardInListener): Promise<SSHForwardInDetails>
  forwardOut(srcIP: string, srcPort: number, dstIP: string, dstPort: number): Promise<Channel>
  forwardInStreamLocal(
    socketPath: string,
    onConnection?: SSHForwardInStreamLocalListener,
  ): Promise<SSHForwardInStreamLocalDetails>
  forwardOutStreamLocal(socketPath: string): Promise<Channel>
  dispose(): void
}
```

## TypeScript

node-ssh includes its type declarations. They use types from `ssh2`, so TypeScript projects also
need `@types/ssh2` (node-ssh lists it as an optional peer dependency, which package managers
don't install for you):

```sh
npm install --save-dev @types/ssh2
```

No other compiler options are needed. Import `NodeSSH` by name (`import { NodeSSH } from 'node-ssh'`).
node-ssh has no default export, so TypeScript reports `import NodeSSH from 'node-ssh'` as an error.

## License

MIT. See [LICENSE.md](LICENSE.md).

[ssh2]: https://github.com/mscdex/ssh2
