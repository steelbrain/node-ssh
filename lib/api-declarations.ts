// The API block of the node-ssh README (development branch at d335322, released as 14.0.0)
export const API_DECLARATIONS = `// Types from other packages that the declarations below use
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
}`
