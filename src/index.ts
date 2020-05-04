import fs from 'fs'
import shellEscape from 'shell-escape'
import invariant, { AssertionError } from 'assert'
import { Client, ConnectConfig, ClientChannel, SFTPWrapper, ExecOptions } from 'ssh2'
// eslint-disable-next-line import/no-extraneous-dependencies
import { Prompt } from 'ssh2-streams'

type Config = ConnectConfig & {
  password?: string
  privateKey?: string
  tryKeyboard?: boolean
  onKeyboardInteractive?: (
    name: string,
    instructions: string,
    lang: string,
    prompts: Prompt[],
    finish: (responses: string[]) => void,
  ) => void
}

interface SSHExecCommandOptions {
  cwd?: string
  stdin?: string
  execOptions?: ExecOptions
  encoding?: BufferEncoding
  onChannel?: (clientChannel: ClientChannel) => void
  onStdout?: (chunk: Buffer) => void
  onStderr?: (chunk: Buffer) => void
}

interface SSHExecCommandResponse {
  stdout: string
  stderr: string
  code: number | null
  signal: string | null
}

interface SSHExecOptions extends SSHExecCommandOptions {
  stream?: 'stdout' | 'stderr' | 'both'
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

class SSHError extends Error {
  constructor(message: string, public code: string | null = null) {
    super(message)
  }
}

class NodeSSH {
  connection: Client | null = null

  private getConnection(): Client {
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

    if (config.privateKey != null) {
      invariant(typeof config.privateKey === 'string', 'config.privateKey must be a valid string')
      invariant(
        config.passphrase == null || typeof config.passphrase === 'string',
        'config.passphrase must be a valid string',
      )

      if (!(config.privateKey.includes('BEGIN') && config.privateKey.includes('KEY'))) {
        // Must be an fs path
        try {
          config.privateKey = await readFile(config.privateKey)
        } catch (err) {
          if (err != null && err.code === 'ENOENT') {
            throw new AssertionError({ message: 'config.privateKey does not exist at given fs path' })
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

    const connection = new Client()
    this.connection = connection

    await new Promise((resolve, reject) => {
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

  async requestShell(): Promise<ClientChannel> {
    const connection = this.getConnection()

    return new Promise(function(resolve, reject) {
      connection.shell((err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }

  async withShell(callback: (channel: ClientChannel) => Promise<void>): Promise<void> {
    invariant(typeof callback === 'function', 'callback must be a valid function')

    const shell = await this.requestShell()
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

    return new Promise(function(resolve, reject) {
      connection.sftp((err, res) => {
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
    invariant(options.stdin == null || typeof options.stdin === 'string', 'options.stdin must be a valid string')
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
      connection.exec(command, options.execOptions != null ? options.execOptions : {}, (err, channel) => {
        if (err) {
          reject(err)
          return
        }
        if (options.onChannel) {
          options.onChannel(channel)
        }
        channel.on('data', function(chunk: Buffer) {
          if (options.onStdout) options.onStdout(chunk)
          output.stdout.push(chunk.toString(options.encoding))
        })
        channel.stderr.on('data', function(chunk: Buffer) {
          if (options.onStderr) options.onStderr(chunk)
          output.stderr.push(chunk.toString(options.encoding))
        })
        if (options.stdin) {
          channel.write(options.stdin)
          channel.end()
        }
        channel.on('exit', function(code, signal) {
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

  exec(command: string, parameters: string[], options: SSHExecOptions & { stream: 'stdout' }): Promise<string>
  exec(command: string, parameters: string[], options: SSHExecOptions & { stream: 'stderr' }): Promise<string>
  exec(command: string, parameters: string[], options: SSHExecOptions & { stream: 'both' }): Promise<SSHExecCommandResponse>
  async exec(command: string, parameters: string[], options: SSHExecOptions = {}): Promise<SSHExecCommandResponse | string> {
    invariant(typeof command === 'string', 'command must be a valid string')
    invariant(Array.isArray(parameters), 'parameters must be a valid array')
    invariant(parameters.every(item => typeof item === 'string'), 'parameters items must be valid string')
    invariant(options != null && typeof options === 'object', 'options must be a valid object')
    invariant(
      options.stream == null || ['both', 'stdout', 'stderr'].includes(options.stream),
      'options.stream must be one of both, stdout, stderr',
    )

    const completeCommand = `${command} ${shellEscape(parameters)}`
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

  dispose() {
    if (this.connection) {
      this.connection.end()
      this.connection = null
    }
  }
}

export = NodeSSH
