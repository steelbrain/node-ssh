/* @flow */

import SSH2 from 'ssh2'
import invariant from 'assert'
import shellEscape from 'shell-escape'
import { normalizeConfig } from './helpers'
import type { ConfigGiven } from './types'

class SSH {
  connection: ?SSH2;
  constructor() {
    this.connection = null
  }
  connect(givenConfig: ConfigGiven): Promise<this> {
    const connection = this.connection = new SSH2()
    return new Promise(function(resolve) {
      resolve(normalizeConfig(givenConfig))
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
  dispose() {
    if (this.connection) {
      this.connection.close()
    }
  }
}

module.exports = SSH
