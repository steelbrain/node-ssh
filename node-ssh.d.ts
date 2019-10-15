// Minimal type of all the config options ssh2 accepts
interface Config {
  host: string,
  port: number,
  username: string,
  password?: string,
  privateKey?: string,
  onKeyboardInteractive?: () => void,
}

interface ConfigGiven {
  host: string,
  port?: number,
  username: string,
  password?: string,
  privateKey?: string,
  onKeyboardInteractive?: () => void | boolean,
}

interface PutFilesOptions {
  sftp?: object,
  sftpOptions: object,
  concurrency: number,
}

interface PutDirectoryOptions {
  sftp?: object,
  sftpOptions: object,
  concurrency: number,
  recursive: boolean,
  tick: (localPath: string, remotePath: string, error?: Error) => void,
  validate: (localPath: string) => boolean,
}

class SSH {
  constructor()

  public connect(config: ConfigGiven): Promise<this>;

  public async requestShell(): Promise<object>

  public async requestSFTP(): Promise<object>

  public async mkdir(path: string, type: 'exec' | 'sftp' = 'sftp', givenSftp?: object = null): Promise<void>

  public async exec(
    command: string,
    parameters: Array<string> = [],
    options: {
      cwd?: string
      stdin?: string
      stream?: string
      options?: Object
      onStdout?: (chunk: Buffer) => void
      onStderr?: (chunk: Buffer) => void
    } = {},
  ): Promise<string | Object>

  public async execCommand(
    givenCommand: string,
    options: {
      cwd?: string
      stdin?: string
      options?: Object
      onStdout?: (chunk: Buffer) => void
      onStderr?: (chunk: Buffer) => void
    } = {},
  ): Promise<{ stdout: string; stderr: string; code: number; signal?: string }>

  public async getFile(
    localFile: string,
    remoteFile: string,
    givenSftp?: object = null,
    givenOpts?: object = null,
  ): Promise<void>

  public async putFile(
    localFile: string,
    remoteFile: string,
    givenSftp?: object = null,
    givenOpts?: object = null,
  ): Promise<void>

  public async putFiles(files: Array<{ local: string; remote: string }>, givenConfig: object = {}): Promise<void>

  public async putDirectory(localDirectory: string, remoteDirectory: string, givenConfig: object = {}): Promise<boolean>

  public dispose(): void
}
export = SSH
