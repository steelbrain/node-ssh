Node-SSH - SSH2 with Promises
=========

Node-SSH is an extremely lightweight Promise wrapper for [ssh2][ssh2].

#### Installation

```sh
$ npm install node-ssh # If you're using npm
$ yarn add node-ssh # If you're using Yarn
```

#### Example

```js
const fs = require('fs')
const path = require('path')
const {NodeSSH} = require('node-ssh')

const ssh = new NodeSSH()

ssh.connect({
  host: 'localhost',
  username: 'steel',
  privateKeyPath: '/home/steel/.ssh/id_rsa'
})

// or with inline privateKey

ssh.connect({
  host: 'localhost',
  username: 'steel',
  privateKey: Buffer.from('...')
})
.then(function() {
  // Local, Remote
  ssh.putFile('/home/steel/Lab/localPath/fileName', '/home/steel/Lab/remotePath/fileName').then(function() {
    console.log("The File thing is done")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Array<Shape('local' => string, 'remote' => string)>
  ssh.putFiles([{ local: '/home/steel/Lab/localPath/fileName', remote: '/home/steel/Lab/remotePath/fileName' }]).then(function() {
    console.log("The File thing is done")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Local, Remote
  ssh.getFile('/home/steel/Lab/localPath', '/home/steel/Lab/remotePath').then(function(Contents) {
    console.log("The File's contents were successfully downloaded")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Putting entire directories
  const failed = []
  const successful = []
  ssh.putDirectory('/home/steel/Lab', '/home/steel/Lab', {
    recursive: true,
    concurrency: 10,
    // ^ WARNING: Not all servers support high concurrency
    // try a bunch of values and see what works on your server
    validate: function(itemPath) {
      const baseName = path.basename(itemPath)
      return baseName.substr(0, 1) !== '.' && // do not allow dot files
             baseName !== 'node_modules' // do not allow node_modules
    },
    tick: function(localPath, remotePath, error) {
      if (error) {
        failed.push(localPath)
      } else {
        successful.push(localPath)
      }
    }
  }).then(function(status) {
    console.log('the directory transfer was', status ? 'successful' : 'unsuccessful')
    console.log('failed transfers', failed.join(', '))
    console.log('successful transfers', successful.join(', '))
  })
  // Command
  ssh.execCommand('hh_client --json', { cwd:'/var/www' }).then(function(result) {
    console.log('STDOUT: ' + result.stdout)
    console.log('STDERR: ' + result.stderr)
  })
  // Command output is trimmed by default. Pass noTrim when leading or trailing
  // whitespace is meaningful, such as reading exact file contents.
  ssh.execCommand('git show --textconv HEAD:README.md', { noTrim: true }).then(function(result) {
    console.log('STDOUT: ' + result.stdout)
  })
  // Command with escaped params
  ssh.exec('hh_client', ['--json'], { cwd: '/var/www', stream: 'stdout', execOptions: { pty: true } }).then(function(result) {
    console.log('STDOUT: ' + result)
  })
  // With streaming stdout/stderr callbacks
  ssh.exec('hh_client', ['--json'], {
    cwd: '/var/www',
    onStdout(chunk) {
      console.log('stdoutChunk', chunk.toString('utf8'))
    },
    onStderr(chunk) {
      console.log('stderrChunk', chunk.toString('utf8'))
    },
  })
  // Large output: noBuffer passes output only to the callbacks, so result.stdout and
  // result.stderr are empty strings. With exec(), stderr output then no longer throws.
  ssh.execCommand('cat /var/log/syslog', {
    noBuffer: true,
    onStdout(chunk) {
      process.stdout.write(chunk)
    },
  })
})
```

#### Pseudo-TTY commands

Some terminal programs, such as `screen` or `tmux`, require a pseudo-TTY. Pass
`pty: true` through `execOptions` when running those commands:

```js
const result = await ssh.execCommand('screen -r', {
  execOptions: { pty: true }
})

console.log('STDOUT: ' + result.stdout)
console.log('STDERR: ' + result.stderr)
```

A pseudo-TTY gives the remote program one terminal for both of its output streams, so with
`pty: true` everything it writes arrives in `stdout` (and `onStdout`) and `stderr` stays empty.
The terminal also echoes `stdin` into `stdout`, and line endings in the output are `\r\n`.

#### Atomic uploads

While a file uploads, its remote path holds an incomplete file, and a web server
reading that path could serve part of it. With `atomic: true`, `putFile`,
`putFiles` and `putDirectory` upload each file to a hidden temporary file in the
same remote directory (`.fileName.<random hex>.tmp`) and rename it to the remote
path once the upload is complete:

```js
await ssh.putFile('/home/steel/Lab/localPath/fileName', '/var/www/fileName', null, null, { atomic: true })
await ssh.putDirectory('/home/steel/Lab/site', '/var/www/site', { atomic: true })
```

When the server supports the `posix-rename@openssh.com` SFTP extension (OpenSSH
does), the rename replaces an existing file in one step. Otherwise node-ssh uses
a plain SFTP rename, and if that fails, deletes the existing file and renames
again; the remote path is missing for a moment, so this fallback is not atomic.

The renamed file is a new file, so it does not keep the mode or owner of the file
it replaces; pass `transferOptions: { mode }` to set its mode. If the upload or
the rename fails, node-ssh deletes the temporary file before rejecting. If the
connection drops, the temporary file can stay behind. `getDirectory` ignores
`atomic`.

#### API

```ts
// API reference in Typescript typing format:
import SSH2, {
  AcceptConnection,
  Channel,
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
import stream from 'stream'

// ^ You do NOT need to import these package, these are here for reference of where the
// types are coming from.

export type Config = ConnectConfig & {
  password?: string
  privateKey?: string
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
  cwd?: string
  stdin?: string | stream.Readable
  execOptions?: ExecOptions
  encoding?: BufferEncoding
  noTrim?: boolean
  noBuffer?: boolean
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
}
export interface SSHPutFilesOptions extends SSHPutFileOptions {
  sftp?: SFTPWrapper | null
  concurrency?: number
  transferOptions?: TransferOptions
}
export interface SSHGetPutDirectoryOptions extends SSHPutFilesOptions {
  tick?: (localFile: string, remoteFile: string, error: Error | null) => void
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
  connection: SSH2.Client | null

  connect(config: Config): Promise<this>
  isConnected(): boolean
  requestShell(options?: PseudoTtyOptions | ShellOptions | false): Promise<ClientChannel>
  withShell(
    callback: (channel: ClientChannel) => Promise<void>,
    options?: PseudoTtyOptions | ShellOptions | false,
  ): Promise<void>
  requestSFTP(): Promise<SFTPWrapper>
  withSFTP(callback: (sftp: SFTPWrapper) => Promise<void>): Promise<void>
  execCommand(givenCommand: string, options?: SSHExecCommandOptions): Promise<SSHExecCommandResponse>
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
  mkdir(path: string, method?: SSHMkdirMethod, givenSftp?: SFTPWrapper | null): Promise<void>
  getFile(
    localFile: string,
    remoteFile: string,
    givenSftp?: SFTPWrapper | null,
    transferOptions?: TransferOptions | null,
  ): Promise<void>
  putFile(
    localFile: string,
    remoteFile: string,
    givenSftp?: SFTPWrapper | null,
    transferOptions?: TransferOptions | null,
    options?: SSHPutFileOptions,
  ): Promise<void>
  putFiles(
    files: {
      local: string
      remote: string
    }[],
    { concurrency, sftp: givenSftp, transferOptions, atomic }?: SSHPutFilesOptions,
  ): Promise<void>
  putDirectory(
    localDirectory: string,
    remoteDirectory: string,
    { concurrency, sftp: givenSftp, transferOptions, recursive, tick, validate, atomic }?: SSHGetPutDirectoryOptions,
  ): Promise<boolean>
  getDirectory(
    localDirectory: string,
    remoteDirectory: string,
    { concurrency, sftp: givenSftp, transferOptions, recursive, tick, validate }?: SSHGetPutDirectoryOptions,
  ): Promise<boolean>
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

### Typescript support

`node-ssh` requires extra dependencies while working under Typescript. Please install them as shown below

```
yarn add --dev @types/ssh2
# OR
npm install --save-dev @types/ssh2
```

If you're still running into issues, try adding these to your `tsconfig.json`

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  }
}
```

### Keyboard-interactive user authentication

In some cases you have to enable keyboard-interactive user authentication.
Otherwise you will get an `All configured authentication methods failed` error.

#### Example:

```js
const password = 'test'

ssh.connect({
  host: 'localhost',
  username: 'steel',
  port: 22,
  password,
  tryKeyboard: true,
})

// Or if you want to add some custom keyboard-interactive logic:

ssh.connect({
  host: 'localhost',
  username: 'steel',
  port: 22,
  tryKeyboard: true,
  onKeyboardInteractive(name, instructions, instructionsLang, prompts, finish) {
    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
      finish([password])
    }
  }
})
```

For further information see: https://github.com/mscdex/ssh2/issues/604

### License
This project is licensed under the terms of MIT license. See the LICENSE file for more info.

[ssh2]:https://github.com/mscdex/ssh2
