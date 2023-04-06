import fs from 'fs'
import fsPath from 'path'
import makeDir from 'make-dir'
import stream from 'stream'
import isStream from 'is-stream'
import shellEscape from 'shell-escape'
import scanDirectory from 'sb-scandir'
import { PromiseQueue } from 'sb-promise-queue'
import invariant, { AssertionError } from 'assert'
import SSH2, {
  ConnectConfig,
  ClientChannel,
  SFTPWrapper,
  ExecOptions,
  PseudoTtyOptions,
  ShellOptions,
  Channel,
  TcpConnectionDetails,
  AcceptConnection,
  RejectConnection,
  UNIXConnectionDetails,
} from 'ssh2'
// eslint-disable-next-line import/no-extraneous-dependencies
import { Prompt, Stats, TransferOptions } from 'ssh2-streams'

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

export interface SSHPutFilesOptions {
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
  reject: RejectConnection
) => void;
export interface SSHForwardInDetails {
  unforward(): Promise<void>;
  port: number;
}

export type SSHForwardInStreamLocalListener = (
  info: UNIXConnectionDetails,
  accept: AcceptConnection,
  reject: RejectConnection
) => void;
export interface SSHForwardInStreamLocalDetails {
  unforward(): Promise<void>;
}

const DEFAULT_CONCURRENCY = 1
const DEFAULT_VALIDATE = (path: string) => !fsPath.basename(path).startsWith('.')
const DEFAULT_TICK = () => {
  /* No Op */
}

export class SSHError extends Error {
  constructor(message: string, public code: string | null = null) {
    super(message)
  }
}

function unixifyPath(path: string) {
  if (path.includes('\\')) {
    return path.split('\\').join('/')
  }
  return path
}

async function readFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const SFTP_MKDIR_ERR_CODE_REGEXP = /Error: (E[\S]+): /
async function makeDirectoryWithSftp(path: string, sftp: SFTPWrapper) {
  let stats: Stats | null = null
  try {
    stats = await new Promise((resolve, reject) => {
      sftp.stat(path, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  } catch (_) {
    /* No Op */
  }
  if (stats) {
    if (stats.isDirectory()) {
      // Already exists, nothing to worry about
      return
    }
    throw new Error('mkdir() failed, target already exists and is not a directory')
  }
  try {
    await new Promise<void>((resolve, reject) => {
      sftp.mkdir(path, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  } catch (err) {
    if (err != null && typeof err.stack === 'string') {
      const matches = SFTP_MKDIR_ERR_CODE_REGEXP.exec(err.stack)
      if (matches != null) {
        throw new SSHError(err.message, matches[1])
      }
      throw err
    }
  }
}

export class NodeSSH {
  connection: SSH2.Client | null = null

  private getConnection(): SSH2.Client {
    const { connection } = this
    if (connection == null) {
      throw new Error('Not connected to server')
    }

    return connection
  }

  public async connect(givenConfig: Config): Promise<this> {
    invariant(givenConfig != null && typeof givenConfig === 'object', 'config must be a valid object')

    const config: Config = { ...givenConfig }

    invariant(config.username != null && typeof config.username === 'string', 'config.username must be a valid string')

    if (config.host != null) {
      invariant(typeof config.host === 'string', 'config.host must be a valid string')
    } else if (config.sock != null) {
      invariant(typeof config.sock === 'object', 'config.sock must be a valid object')
    } else {
      throw new AssertionError({ message: 'Either config.host or config.sock must be provided' })
    }

    if (config.privateKey != null || config.privateKeyPath != null) {
      if (config.privateKey != null) {
        invariant(typeof config.privateKey === 'string', 'config.privateKey must be a valid string')
        invariant(
          config.privateKeyPath == null,
          'config.privateKeyPath must not be specified when config.privateKey is specified',
        )
      } else if (config.privateKeyPath != null) {
        invariant(typeof config.privateKeyPath === 'string', 'config.privateKeyPath must be a valid string')
        invariant(
          config.privateKey == null,
          'config.privateKey must not be specified when config.privateKeyPath is specified',
        )
      }

      invariant(
        config.passphrase == null || typeof config.passphrase === 'string',
        'config.passphrase must be null or a valid string',
      )

      if (config.privateKeyPath != null) {
        // Must be an fs path
        try {
          config.privateKey = await readFile(config.privateKeyPath)
        } catch (err) {
          if (err != null && err.code === 'ENOENT') {
            throw new AssertionError({ message: 'config.privateKeyPath does not exist at given fs path' })
          }
          throw err
        }
      }
    } else if (config.password != null) {
      invariant(typeof config.password === 'string', 'config.password must be a valid string')
    }

    if (config.tryKeyboard != null) {
      invariant(typeof config.tryKeyboard === 'boolean', 'config.tryKeyboard must be a valid boolean')
    }
    if (config.tryKeyboard) {
      const { password } = config
      if (config.onKeyboardInteractive != null) {
        invariant(
          typeof config.onKeyboardInteractive === 'function',
          'config.onKeyboardInteractive must be a valid function',
        )
      } else if (password != null) {
        config.onKeyboardInteractive = (name, instructions, instructionsLang, prompts, finish) => {
          if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            finish([password])
          }
        }
      }
    }

    const connection = new SSH2.Client()
    this.connection = connection

    await new Promise<void>((resolve, reject) => {
      connection.on('error', reject)
      if (config.onKeyboardInteractive) {
        connection.on('keyboard-interactive', config.onKeyboardInteractive)
      }
      connection.on('ready', () => {
        connection.removeListener('error', reject)
        resolve()
      })
      connection.on('end', () => {
        if (this.connection === connection) {
          this.connection = null
        }
      })
      connection.on('close', () => {
        if (this.connection === connection) {
          this.connection = null
        }
        reject(new SSHError('No response from server', 'ETIMEDOUT'))
      })
      connection.connect(config)
    })

    return this
  }

  public isConnected(): boolean {
    return this.connection != null
  }

  async requestShell(options?: PseudoTtyOptions | ShellOptions | false): Promise<ClientChannel> {
    const connection = this.getConnection()

    return new Promise((resolve, reject) => {
      connection.on('error', reject)
      const callback = (err: Error | undefined, res: ClientChannel) => {
        connection.removeListener('error', reject)
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      }
      if (options == null) {
        connection.shell(callback)
      } else {
        connection.shell(options as never, callback)
      }
    })
  }

  async withShell(
    callback: (channel: ClientChannel) => Promise<void>,
    options?: PseudoTtyOptions | ShellOptions | false,
  ): Promise<void> {
    invariant(typeof callback === 'function', 'callback must be a valid function')

    const shell = await this.requestShell(options)
    try {
      await callback(shell)
    } finally {
      // Try to close gracefully
      if (!shell.close()) {
        // Destroy local socket if it doesn't work
        shell.destroy()
      }
    }
  }

  async requestSFTP(): Promise<SFTPWrapper> {
    const connection = this.getConnection()

    return new Promise((resolve, reject) => {
      connection.on('error', reject)
      connection.sftp((err, res) => {
        connection.removeListener('error', reject)
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }

  async withSFTP(callback: (sftp: SFTPWrapper) => Promise<void>): Promise<void> {
    invariant(typeof callback === 'function', 'callback must be a valid function')

    const sftp = await this.requestSFTP()
    try {
      await callback(sftp)
    } finally {
      sftp.end()
    }
  }

  async execCommand(givenCommand: string, options: SSHExecCommandOptions = {}): Promise<SSHExecCommandResponse> {
    invariant(typeof givenCommand === 'string', 'command must be a valid string')
    invariant(options != null && typeof options === 'object', 'options must be a valid object')
    invariant(options.cwd == null || typeof options.cwd === 'string', 'options.cwd must be a valid string')
    invariant(
      options.stdin == null || typeof options.stdin === 'string' || isStream.readable(options.stdin),
      'options.stdin must be a valid string or readable stream',
    )
    invariant(
      options.execOptions == null || typeof options.execOptions === 'object',
      'options.execOptions must be a valid object',
    )
    invariant(options.encoding == null || typeof options.encoding === 'string', 'options.encoding must be a valid string')
    invariant(
      options.onChannel == null || typeof options.onChannel === 'function',
      'options.onChannel must be a valid function',
    )
    invariant(
      options.onStdout == null || typeof options.onStdout === 'function',
      'options.onStdout must be a valid function',
    )
    invariant(
      options.onStderr == null || typeof options.onStderr === 'function',
      'options.onStderr must be a valid function',
    )

    let command = givenCommand

    if (options.cwd) {
      command = `cd ${shellEscape([options.cwd])} ; ${command}`
    }
    const connection = this.getConnection()

    const output: { stdout: string[]; stderr: string[] } = { stdout: [], stderr: [] }

    return new Promise((resolve, reject) => {
      connection.on('error', reject)
      connection.exec(command, options.execOptions != null ? options.execOptions : {}, (err, channel) => {
        connection.removeListener('error', reject)
        if (err) {
          reject(err)
          return
        }
        if (options.onChannel) {
          options.onChannel(channel)
        }
        channel.on('data', (chunk: Buffer) => {
          if (options.onStdout) options.onStdout(chunk)
          output.stdout.push(chunk.toString(options.encoding))
        })
        channel.stderr.on('data', (chunk: Buffer) => {
          if (options.onStderr) options.onStderr(chunk)
          output.stderr.push(chunk.toString(options.encoding))
        })
        if (options.stdin != null) {
          if (isStream.readable(options.stdin)) {
            options.stdin.pipe(channel, {
              end: true,
            })
          } else {
            channel.write(options.stdin)
            channel.end()
          }
        } else {
          channel.end()
        }

        let code: number | null = null
        let signal: string | null = null
        channel.on('exit', (code_, signal_) => {
          code = code_ ?? null
          signal = signal_ ?? null
        })
        channel.on('close', () => {
          resolve({
            code: code != null ? code : null,
            signal: signal != null ? signal : null,
            stdout: output.stdout.join('').trim(),
            stderr: output.stderr.join('').trim(),
          })
        })
      })
    })
  }

  exec(command: string, parameters: string[], options?: SSHExecOptions & { stream?: 'stdout' | 'stderr' }): Promise<string>
  exec(command: string, parameters: string[], options?: SSHExecOptions & { stream: 'both' }): Promise<SSHExecCommandResponse>
  async exec(command: string, parameters: string[], options: SSHExecOptions = {}): Promise<SSHExecCommandResponse | string> {
    invariant(typeof command === 'string', 'command must be a valid string')
    invariant(Array.isArray(parameters), 'parameters must be a valid array')
    invariant(options != null && typeof options === 'object', 'options must be a valid object')
    invariant(
      options.stream == null || ['both', 'stdout', 'stderr'].includes(options.stream),
      'options.stream must be one of both, stdout, stderr',
    )
    for (let i = 0, { length } = parameters; i < length; i += 1) {
      invariant(typeof parameters[i] === 'string', `parameters[${i}] must be a valid string`)
    }

    const completeCommand = `${command}${parameters.length > 0 ? ` ${shellEscape(parameters)}` : ''}`
    const response = await this.execCommand(completeCommand, options)

    if (options.stream == null || options.stream === 'stdout') {
      if (response.stderr) {
        throw new Error(response.stderr)
      }
      return response.stdout
    }
    if (options.stream === 'stderr') {
      return response.stderr
    }

    return response
  }

  async mkdir(path: string, method: SSHMkdirMethod = 'sftp', givenSftp: SFTPWrapper | null = null): Promise<void> {
    invariant(typeof path === 'string', 'path must be a valid string')
    invariant(typeof method === 'string' && (method === 'sftp' || method === 'exec'), 'method must be either sftp or exec')
    invariant(givenSftp == null || typeof givenSftp === 'object', 'sftp must be a valid object')

    if (method === 'exec') {
      await this.exec('mkdir', ['-p', unixifyPath(path)])
      return
    }
    const sftp = givenSftp || (await this.requestSFTP())

    const makeSftpDirectory = async (retry: boolean) =>
      makeDirectoryWithSftp(unixifyPath(path), sftp).catch(async (error: SSHError) => {
        if (!retry || error == null || (error.message !== 'No such file' && error.code !== 'ENOENT')) {
          throw error
        }
        await this.mkdir(fsPath.dirname(path), 'sftp', sftp)
        await makeSftpDirectory(false)
      })

    try {
      await makeSftpDirectory(true)
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }
  }

  async getFile(
    localFile: string,
    remoteFile: string,
    givenSftp: SFTPWrapper | null = null,
    transferOptions: TransferOptions | null = null,
  ): Promise<void> {
    invariant(typeof localFile === 'string', 'localFile must be a valid string')
    invariant(typeof remoteFile === 'string', 'remoteFile must be a valid string')
    invariant(givenSftp == null || typeof givenSftp === 'object', 'sftp must be a valid object')
    invariant(transferOptions == null || typeof transferOptions === 'object', 'transferOptions must be a valid object')

    const sftp = givenSftp || (await this.requestSFTP())

    try {
      await new Promise<void>((resolve, reject) => {
        sftp.fastGet(unixifyPath(remoteFile), localFile, transferOptions || {}, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }
  }

  async putFile(
    localFile: string,
    remoteFile: string,
    givenSftp: SFTPWrapper | null = null,
    transferOptions: TransferOptions | null = null,
  ): Promise<void> {
    invariant(typeof localFile === 'string', 'localFile must be a valid string')
    invariant(typeof remoteFile === 'string', 'remoteFile must be a valid string')
    invariant(givenSftp == null || typeof givenSftp === 'object', 'sftp must be a valid object')
    invariant(transferOptions == null || typeof transferOptions === 'object', 'transferOptions must be a valid object')
    invariant(
      await new Promise((resolve) => {
        fs.access(localFile, fs.constants.R_OK, (err) => {
          resolve(err === null)
        })
      }),
      `localFile does not exist at ${localFile}`,
    )
    const sftp = givenSftp || (await this.requestSFTP())

    const putFile = (retry: boolean) => {
      return new Promise<void>((resolve, reject) => {
        sftp.fastPut(localFile, unixifyPath(remoteFile), transferOptions || {}, (err) => {
          if (err == null) {
            resolve()
            return
          }

          if (err.message === 'No such file' && retry) {
            resolve(this.mkdir(fsPath.dirname(remoteFile), 'sftp', sftp).then(() => putFile(false)))
          } else {
            reject(err)
          }
        })
      })
    }

    try {
      await putFile(true)
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }
  }

  async putFiles(
    files: { local: string; remote: string }[],
    { concurrency = DEFAULT_CONCURRENCY, sftp: givenSftp = null, transferOptions = {} }: SSHPutFilesOptions = {},
  ): Promise<void> {
    invariant(Array.isArray(files), 'files must be an array')

    for (let i = 0, { length } = files; i < length; i += 1) {
      const file = files[i]
      invariant(file, 'files items must be valid objects')
      invariant(file.local && typeof file.local === 'string', `files[${i}].local must be a string`)
      invariant(file.remote && typeof file.remote === 'string', `files[${i}].remote must be a string`)
    }

    const transferred: typeof files = []
    const sftp = givenSftp || (await this.requestSFTP())
    const queue = new PromiseQueue({ concurrency })

    try {
      await new Promise((resolve, reject) => {
        files.forEach((file) => {
          queue
            .add(async () => {
              await this.putFile(file.local, file.remote, sftp, transferOptions)
              transferred.push(file)
            })
            .catch(reject)
        })

        queue.waitTillIdle().then(resolve)
      })
    } catch (error) {
      if (error != null) {
        error.transferred = transferred
      }
      throw error
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }
  }

  async putDirectory(
    localDirectory: string,
    remoteDirectory: string,
    {
      concurrency = DEFAULT_CONCURRENCY,
      sftp: givenSftp = null,
      transferOptions = {},
      recursive = true,
      tick = DEFAULT_TICK,
      validate = DEFAULT_VALIDATE,
    }: SSHGetPutDirectoryOptions = {},
  ): Promise<boolean> {
    invariant(typeof localDirectory === 'string' && localDirectory, 'localDirectory must be a string')
    invariant(typeof remoteDirectory === 'string' && remoteDirectory, 'remoteDirectory must be a string')

    const localDirectoryStat: fs.Stats = await new Promise((resolve) => {
      fs.stat(localDirectory, (err, stat) => {
        resolve(stat || null)
      })
    })

    invariant(localDirectoryStat != null, `localDirectory does not exist at ${localDirectory}`)
    invariant(localDirectoryStat.isDirectory(), `localDirectory is not a directory at ${localDirectory}`)

    const sftp = givenSftp || (await this.requestSFTP())

    const scanned = await scanDirectory(localDirectory, {
      recursive,
      validate,
    })
    const files = scanned.files.map((item) => fsPath.relative(localDirectory, item))
    const directories = scanned.directories.map((item) => fsPath.relative(localDirectory, item))

    // Sort shortest to longest
    directories.sort((a, b) => a.length - b.length)

    let failed = false

    try {
      // Do the directories first.
      await new Promise((resolve, reject) => {
        const queue = new PromiseQueue({ concurrency })

        directories.forEach((directory) => {
          queue
            .add(async () => {
              await this.mkdir(fsPath.join(remoteDirectory, directory), 'sftp', sftp)
            })
            .catch(reject)
        })

        resolve(queue.waitTillIdle())
      })

      // and now the files
      await new Promise((resolve, reject) => {
        const queue = new PromiseQueue({ concurrency })

        files.forEach((file) => {
          queue
            .add(async () => {
              const localFile = fsPath.join(localDirectory, file)
              const remoteFile = fsPath.join(remoteDirectory, file)
              try {
                await this.putFile(localFile, remoteFile, sftp, transferOptions)
                tick(localFile, remoteFile, null)
              } catch (_) {
                failed = true
                tick(localFile, remoteFile, _)
              }
            })
            .catch(reject)
        })

        resolve(queue.waitTillIdle())
      })
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }

    return !failed
  }

  async getDirectory(
    localDirectory: string,
    remoteDirectory: string,
    {
      concurrency = DEFAULT_CONCURRENCY,
      sftp: givenSftp = null,
      transferOptions = {},
      recursive = true,
      tick = DEFAULT_TICK,
      validate = DEFAULT_VALIDATE,
    }: SSHGetPutDirectoryOptions = {},
  ): Promise<boolean> {
    invariant(typeof localDirectory === 'string' && localDirectory, 'localDirectory must be a string')
    invariant(typeof remoteDirectory === 'string' && remoteDirectory, 'remoteDirectory must be a string')

    const localDirectoryStat: fs.Stats = await new Promise((resolve) => {
      fs.stat(localDirectory, (err, stat) => {
        resolve(stat || null)
      })
    })

    invariant(localDirectoryStat != null, `localDirectory does not exist at ${localDirectory}`)
    invariant(localDirectoryStat.isDirectory(), `localDirectory is not a directory at ${localDirectory}`)

    const sftp = givenSftp || (await this.requestSFTP())

    const scanned = await scanDirectory(remoteDirectory, {
      recursive,
      validate,
      concurrency,
      fileSystem: {
        basename(path) {
          return fsPath.posix.basename(path)
        },
        join(pathA, pathB) {
          return fsPath.posix.join(pathA, pathB)
        },
        readdir(path) {
          return new Promise((resolve, reject) => {
            sftp.readdir(path, (err, res) => {
              if (err) {
                reject(err)
              } else {
                resolve(res.map((item) => item.filename))
              }
            })
          })
        },
        stat(path) {
          return new Promise((resolve, reject) => {
            sftp.stat(path, (err, res) => {
              if (err) {
                reject(err)
              } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resolve(res as any)
              }
            })
          })
        },
      },
    })
    const files = scanned.files.map((item) => fsPath.relative(remoteDirectory, item))
    const directories = scanned.directories.map((item) => fsPath.relative(remoteDirectory, item))

    // Sort shortest to longest
    directories.sort((a, b) => a.length - b.length)

    let failed = false

    try {
      // Do the directories first.
      await new Promise((resolve, reject) => {
        const queue = new PromiseQueue({ concurrency })

        directories.forEach((directory) => {
          queue
            .add(async () => {
              await makeDir(fsPath.join(localDirectory, directory))
            })
            .catch(reject)
        })

        resolve(queue.waitTillIdle())
      })

      // and now the files
      await new Promise((resolve, reject) => {
        const queue = new PromiseQueue({ concurrency })

        files.forEach((file) => {
          queue
            .add(async () => {
              const localFile = fsPath.join(localDirectory, file)
              const remoteFile = fsPath.join(remoteDirectory, file)
              try {
                await this.getFile(localFile, remoteFile, sftp, transferOptions)
                tick(localFile, remoteFile, null)
              } catch (_) {
                failed = true
                tick(localFile, remoteFile, _)
              }
            })
            .catch(reject)
        })

        resolve(queue.waitTillIdle())
      })
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }

    return !failed
  }

  forwardIn(
    remoteAddr: string,
    remotePort: number,
    onConnection?: SSHForwardInListener
  ): Promise<SSHForwardInDetails> {
    const connection = this.getConnection();

    return new Promise((resolve, reject) => {
      connection.forwardIn(remoteAddr, remotePort, (error, port) => {
        if (error) {
          reject(error);
          return;
        }

        const handler: SSHForwardInListener = (details, acceptConnection, rejectConnection) => {
          if (details.destIP === remoteAddr && details.destPort === port) {
            onConnection?.(details, acceptConnection, rejectConnection);
          }
        };

        if (onConnection) {
          connection.on('tcp connection', handler);
        }

        const unforward = (): Promise<void> => {
          return new Promise((_resolve, _reject) => {
            connection.off('tcp connection', handler);
            connection.unforwardIn(remoteAddr, port, _error => {
              if (_error) {
                _reject(error);
              }

              _resolve();
            });
          });
        };

        resolve({ port, unforward });
      });
    });
  }

  forwardOut(
    srcIP: string,
    srcPort: number,
    dstIP: string,
    dstPort: number
  ): Promise<Channel> {
    const connection = this.getConnection();

    return new Promise((resolve, reject) => {
      connection.forwardOut(
        srcIP,
        srcPort,
        dstIP,
        dstPort,
        (error, channel) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(channel);
        }
      );
    });
  }

  forwardInStreamLocal(
    socketPath: string,
    onConnection?: SSHForwardInStreamLocalListener
  ): Promise<SSHForwardInStreamLocalDetails> {
    const connection = this.getConnection();

    return new Promise((resolve, reject) => {
      connection.openssh_forwardInStreamLocal(socketPath, error => {
        if (error) {
          reject(error);
          return;
        }

        const handler: SSHForwardInStreamLocalListener = (
          details,
          acceptConnection, rejectConnection
        ) => {
          if (details.socketPath === socketPath) {
            onConnection?.(details, acceptConnection, rejectConnection);
          }
        };

        if (onConnection) {
          connection.on('unix connection', handler);
        }

        const unforward = (): Promise<void> => {
          return new Promise((_resolve, _reject) => {
            connection.off('unix connection', handler);
            connection.openssh_unforwardInStreamLocal(socketPath, _error => {
              if (_error) {
                _reject(_error);
              }

              _resolve();
            });
          });
        };

        resolve({ unforward });
      });
    });
  }

  forwardOutStreamLocal(socketPath: string): Promise<Channel> {
    const connection = this.getConnection();

    return new Promise((resolve, reject) => {
      connection.openssh_forwardOutStreamLocal(socketPath, (error, channel) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(channel);
      });
    });
  }

  dispose(): void {
    if (this.connection) {
      this.connection.end()
      this.connection = null
    }
  }
}
