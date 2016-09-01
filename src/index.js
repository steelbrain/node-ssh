/* @flow */

import Path from 'path'
import SSH2 from 'ssh2'
import invariant from 'assert'
import scanDirectory from 'sb-scandir'
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
  async requestShell(): Promise<Object> {
    const connection = this.connection
    invariant(connection, 'Not connected to server')
    return await new Promise(function(resolve, reject) {
      connection.shell(Helpers.generateCallback(resolve, reject))
    })
  }
  async requestSFTP(): Promise<Object> {
    const connection = this.connection
    invariant(connection, 'Not connected to server')
    return await new Promise(function(resolve, reject) {
      connection.sftp(Helpers.generateCallback(resolve, reject))
    })
  }
  async mkdir(path: string): Promise<void> {
    invariant(this.connection, 'Not connected to server')
    const output = await this.exec('mkdir', ['-p', path])
    if (output.stdout) {
      throw new Error(output.stdout)
    }
  }
  async exec(command: string, parameters: Array<string> = [], options: { cwd?: string, stdin?: string, stream?: string } = {}): Promise<string | Object> {
    invariant(this.connection, 'Not connected to server')
    invariant(typeof options === 'object' && options, 'options must be an Object')
    invariant(!options.cwd || typeof options.cwd === 'string', 'options.cwd must be a string')
    invariant(!options.stdin || typeof options.stdin === 'string', 'options.stdin must be a string')
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
    invariant(typeof options === 'object' && options, 'options must be an Object')
    invariant(!options.cwd || typeof options.cwd === 'string', 'options.cwd must be a string')
    invariant(!options.stdin || typeof options.stdin === 'string', 'options.stdin must be a string')

    if (options.cwd) {
      // NOTE: Output piping cd command to hide directory non-existent errors
      command = `cd ${shellEscape([options.cwd])} 1> /dev/null 2> /dev/null; ${command}`
    }
    const output = { stdout: [], stderr: [] }
    return await new Promise(function(resolve, reject) {
      connection.exec(command, Helpers.generateCallback(function(stream) {
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
          resolve({ code, signal, stdout: output.stdout.join('').trim(), stderr: output.stderr.join('').trim() })
        })
      }, reject))
    })
  }
  async getFile(localFile: string, remoteFile: string, givenSftp: ?Object = null): Promise<void> {
    invariant(this.connection, 'Not connected to server')
    invariant(typeof localFile === 'string' && localFile, 'localFile must be a string')
    invariant(typeof remoteFile === 'string' && remoteFile, 'remoteFile must be a string')
    invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object')

    const sftp = givenSftp || await this.requestSFTP()
    try {
      await new Promise(function(resolve, reject) {
        sftp.fastGet(localFile, remoteFile, Helpers.generateCallback(resolve, reject))
      })
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }
  }
  async putFile(localFile: string, remoteFile: string, givenSftp: ?Object = null): Promise<void> {
    invariant(this.connection, 'Not connected to server')
    invariant(typeof localFile === 'string' && localFile, 'localFile must be a string')
    invariant(typeof remoteFile === 'string' && remoteFile, 'remoteFile must be a string')
    invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object')
    invariant(await Helpers.exists(localFile), `localFile does not exist at ${localFile}`)

    const that = this
    const sftp = givenSftp || await this.requestSFTP()

    function putFile(retry: boolean) {
      return new Promise(function(resolve, reject) {
        sftp.fastPut(localFile, remoteFile, Helpers.generateCallback(resolve, function(error) {
          if (error.message === 'No such file' && retry) {
            resolve(that.mkdir(Path.dirname(remoteFile)).then(function() {
              return putFile(false)
            }))
          } else {
            reject(error)
          }
        }))
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
  async putFiles(files: Array<{ local: string, remote: string }>, givenSftp: ?Object = null): Promise<void> {
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
    const promises = files.map(file =>
      this.putFile(file.local, file.remote, sftp)
    )
    try {
      await Promise.all(promises)
    } finally {
      if (!sftp) {
        sftp.end()
      }
    }
  }
  async putDirectory(localDirectory: string, remoteDirectory: string, givenConfig: Object = {}, givenSftp: ?Object = null): Promise<boolean> {
    invariant(this.connection, 'Not connected to server')
    invariant(typeof localDirectory === 'string' && localDirectory, 'localDirectory must be a string')
    invariant(typeof remoteDirectory === 'string' && remoteDirectory, 'localDirectory must be a string')
    invariant(await Helpers.exists(localDirectory), `localDirectory does not exist at ${localDirectory}`)
    invariant((await Helpers.stat(localDirectory)).isDirectory(), `localDirectory is not a directory at ${localDirectory}`)
    invariant(typeof givenConfig === 'object' && givenConfig, 'config must be an object')

    const sftp = givenSftp || await this.requestSFTP()
    const config = Helpers.normalizePutDirectoryConfig(givenConfig)
    const files = (await scanDirectory(localDirectory, config.recursive, config.validate))
      .map(function(item) {
        return Path.relative(localDirectory, item)
      })
    const directoriesCreated = new Set()

    const promises = files.map(async file => {
      const localFile = Path.join(localDirectory, file)
      const remoteFile = Path.join(remoteDirectory, file).split(Path.sep).join('/')
      const remoteFileDirectory = Path.dirname(remoteFile)
      if (!directoriesCreated.has(remoteFileDirectory)) {
        await this.mkdir(remoteFileDirectory)
        directoriesCreated.add(remoteFileDirectory)
      }
      try {
        await this.putFile(localFile, remoteFile, sftp)
        config.tick(localFile, remoteFile, null)
        return true
      } catch (_) {
        config.tick(localFile, remoteFile, _)
        return false
      }
    })

    let results
    try {
      results = await Promise.all(promises)
    } finally {
      if (!givenSftp) {
        sftp.end()
      }
    }

    return results.every(i => i)
  }
  dispose() {
    if (this.connection) {
      this.connection.end()
    }
  }
}

module.exports = SSH
