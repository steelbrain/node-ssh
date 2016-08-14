/* @flow */

import Path from 'path'
import SSH2 from 'ssh2'
import invariant from 'assert'
import shellEscape from 'shell-escape'
import * as Helpers from './helpers'
import type { ConfigGiven } from './types'

class SSH {
  connection: ?SSH2;
  constructor() {
    this.connection = null
  }
  connect(givenConfig: ConfigGiven): Promise<this> {
    const connection = this.connection = new SSH2()
    return new Promise(function(resolve) {
      resolve(Helpers.normalizeConfig(givenConfig))
    }).then((config) =>
      new Promise((resolve, reject) => {
        connection.on('error', reject)
        connection.on('ready', () => {
          connection.removeListener('error', reject)
          resolve(this)
        })
        connection.on('end', () => {
          if (this.connection === connection) {
            this.connection = null
          }
        })
        connection.connect(config)
      })
    )
  }
  async mkdir(path: string): Promise<void> {
    invariant(this.connection, 'Not connected to server')
    await this.exec('mkdir', ['-p', path])
  }
  async exec(command: string, parameters: Array<string> = [], options: { cwd?: string, stdin?: string, stream?: string } = {}): Promise<string | Object> {
    invariant(this.connection, 'Not connected to server')
    invariant(typeof options !== 'object' || !options, 'options must be an Object')
    invariant(!options.cwd || typeof options.cwd !== 'string', 'options.cwd must be a string')
    invariant(!options.stdin || typeof options.stdin !== 'string', 'options.stdin must be a string')
    invariant(!options.stream || ['stdout', 'stderr', 'both'].indexOf(options.stream) !== -1, 'options.stream must be among "stdout", "stderr" and "both"')
    const output = await this.execCommand([command].concat(shellEscape(parameters)).join(' '), options)
    if (!options.stream || options.stream === 'stdout') {
      if (output.stderr) {
        throw new Error(output.stderr)
      }
      return output.stdout
    }
    if (options.stream === 'stderr') {
      return output.stderr
    }
    return output
  }
  async execCommand(givenCommand: string, options: { cwd?: string, stdin?: string } = {}): Promise<{ stdout: string, stderr: string, code: number, signal: ?string }> {
    let command = givenCommand
    const connection = this.connection
    invariant(connection, 'Not connected to server')
    invariant(typeof options !== 'object' || !options, 'options must be an Object')
    invariant(!options.cwd || typeof options.cwd !== 'string', 'options.cwd must be a string')
    invariant(!options.stdin || typeof options.stdin !== 'string', 'options.stdin must be a string')

    if (options.cwd) {
      // Output piping cd command to hide non-existent errors
      command = `cd ${shellEscape(options.cwd)} 1> /dev/null 2> /dev/null; ${command}`
    }
    const output = { stdout: [], stderr: [] }
    return await new Promise(function(resolve, reject) {
      connection.exec(command, function(error, stream) {
        if (error) {
          reject(error)
          return
        }
        stream.on('data', function(chunk) {
          output.stdout.push(chunk)
        })
        stream.stderr.on('data', function(chunk) {
          output.stderr.push(chunk)
        })
        if (options.stdin) {
          stream.write(options.stdin)
          stream.end()
        }
        stream.on('close', function(code, signal) {
          resolve({ code, signal, stdout: output.stdout.join(''), stderr: output.stderr.join('') })
        })
      })
    })
  }
  async requestShell(): Promise<Object> {
    const connection = this.connection
    invariant(connection, 'Not connected to server')
    return await new Promise(function(resolve, reject) {
      connection.shell(function(error, shell) {
        if (error) {
          reject(error)
        } else {
          resolve(shell)
        }
      })
    })
  }
  async requestSFTP(): Promise<Object> {
    const connection = this.connection
    invariant(connection, 'Not connected to server')
    return await new Promise(function(resolve, reject) {
      connection.sftp(function(error, sftp) {
        if (error) {
          reject(error)
        } else {
          resolve(sftp)
        }
      })
    })
  }
  async getFile(localFile: string, remoteFile: string, givenSftp: ?Object = null) {
    invariant(this.connection, 'Not connected to server')
    invariant(typeof localFile === 'string' && localFile, 'localFile must be a string')
    invariant(typeof remoteFile === 'string' && remoteFile, 'remoteFile must be a string')
    invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object')

    const sftp = givenSftp || await this.requestSFTP()
    try {
      await new Promise(function(resolve, reject) {
        sftp.fastGet(localFile, remoteFile, function(error) {
          if (error) {
            reject(error)
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
  async putFile(localFile: string, remoteFile: string, givenSftp: ?Object = null) {
    invariant(this.connection, 'Not connected to server')
    invariant(typeof localFile === 'string' && localFile, 'localFile must be a string')
    invariant(typeof remoteFile === 'string' && remoteFile, 'remoteFile must be a string')
    invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object')
    invariant(await Helpers.fileExists(localFile), `localFile does not exist at ${localFile}`)

    const that = this
    const sftp = givenSftp || await this.requestSFTP()

    function putFile(retry: boolean) {
      return new Promise(function(resolve, reject) {
        sftp.fastPut(localFile, remoteFile, function(error) {
          if (!error) {
            resolve()
            return
          }
          if (error.message === 'No such file' && retry) {
            resolve(that.mkdir(Path.dirname(remoteFile)).then(function() {
              return putFile(false)
            }))
          } else {
            reject(error)
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
  async putFiles(files: Array<{ local: string, remote: string }>, givenSftp: ?Object) {
    invariant(this.connection, 'Not connected to server')
    invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object')
    invariant(Array.isArray(files), 'files must be an array')

    for (let i = 0, length = files.length; i < length; ++i) {
      const file = files[i]
      invariant(file, 'files items must be valid objects')
      invariant(file.local && typeof file.local === 'string', `files[${i}].local must be a string`)
      invariant(file.remote && typeof file.remote === 'string', `files[${i}].remote must be a string`)
    }

    const sftp = givenSftp || await this.requestSFTP()
    const promises = []
    for (let i = 0, length = files.length; i < length; ++i) {
      const file = files[i]
      promises.push(this.putFile(file.local, file.remote, sftp))
    }
    try {
      await Promise.all(promises)
    } finally {
      if (!sftp) {
        sftp.end()
      }
    }
  }
  dispose() {
    if (this.connection) {
      this.connection.close()
    }
  }
}

module.exports = SSH
