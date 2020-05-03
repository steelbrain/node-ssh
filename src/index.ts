import fs from 'fs'
import invariant, {AssertionError} from 'assert'
import { Client, ConnectConfig, ClientChannel, SFTPWrapper } from 'ssh2'
import type {Prompt} from 'ssh2-streams'

type Config = ConnectConfig & {
  password?: string
  privateKey?: string
  tryKeyboard?: boolean
  onKeyboardInteractive?: ((name: string, instructions: string, lang: string, prompts: Prompt[], finish: (responses: string[]) => void) => void)
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
    const {connection} = this
    if (connection == null) {
      throw new Error('Not connected to server')
    }

    return connection
  }

  public async connect(givenConfig: Config): Promise<this> {
    invariant(givenConfig != null && typeof givenConfig === 'object', 'config must be a valid object')

    const config: Config = {...givenConfig}

    invariant(config.username != null && typeof config.username === 'string', 'config.username must be a valid string')

    if (config.host != null) {
      invariant(typeof config.host === 'string', 'config.host must be a valid string')
    } else if (config.sock != null) {
      invariant(typeof config.sock === 'object', 'config.sock must be a valid object')
    } else {
      throw new AssertionError({message: 'Either config.host or config.sock must be provided'})
    }

    if (config.privateKey != null) {
      invariant(typeof config.privateKey === 'string', 'config.privateKey must be a valid string')
      invariant(config.passphrase == null || typeof config.passphrase === 'string', 'config.passphrase must be a valid string')

      if (!(config.privateKey.includes('BEGIN') && config.privateKey.includes('KEY'))) {
        // Must be an fs path
        try {
          config.privateKey = await readFile(config.privateKey)
        } catch (err) {
          if (err != null && err.code === 'ENOENT') {
            throw new AssertionError({message: 'config.privateKey does not exist at given fs path'})
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
      const {password} = config
      if (config.onKeyboardInteractive != null) {
        invariant(typeof config.onKeyboardInteractive === 'function', 'config.onKeyboardInteractive must be a valid function')
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

  dispose() {
    if (this.connection) {
      this.connection.end()
      this.connection = null
    }
  }
}

export = NodeSSH
