// @Compiler-Transpile "true"

import {promisify} from 'js-toolkit'

const Driver = require('ssh2')
const FS = require('fs')
const Path = require('path')

const access = promisify(FS.access)
const readFile = promisify(FS.readFile)

const validStreams = new Set(['stdout', 'stderr', 'both'])

// TODO: Escape cwd

export default class SSH {
  constructor() {
    this.config = null
    this.connection = null
    this.connected = false
  }
  connect(config) {
    this.config = config
    this.connection = new Driver()
    return new Promise((resolve, reject) => {
      this.connection.on('error', reject)
      this.connection.on('ready', () => {
        this.connected = true
        this.connection.removeListener('error', reject)
        resolve(this)
      })
    })
  }
  mkdir(path) {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    }
    return this.exec('mkdir', ['-p', path])
  }
  exec(filePath, args = [], options = {}) {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    }
    if (typeof filePath !== 'string') {
      throw new Error('Executable Path must be a string')
    } else if (!(args instanceof Array)) {
      throw new Error('args must be an array')
    } else if (typeof options !== 'object') {
      throw new Error('Options must be an object')
    } else if (options.cwd && typeof options.cwd !== 'string') {
      throw new Error('Options.cwd must be a string')
    } else if (options.stdin && typeof options.stdin !== 'string') {
      throw new Error('Options.stdin must be a string')
    }
    options.stream = validStreams.has(options.stream) ? options.stream : 'stdout'
    return this.execCommand([filePath].concat(args).join(' '), options).then(({stdout, stderr}) => {
      if (options.stream === 'both') {
        return {stderr, stdout}
      } else if (options.stream === 'stderr') {
        return stderr
      } else if (options.stream === 'stdout') {
        if (stderr.length) {
          throw new Error(stderr)
        } else return stdout
      }
    })
  }
  execCommand(command, options = {}) {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    }
    if (typeof command !== 'string') {
      throw new Error('Command must be a string')
    } else if (typeof options !== 'object') {
      throw new Error('Options must be an object')
    } else if (options.cwd && typeof options.cwd !== 'string') {
      throw new Error('Options.cwd must be a string')
    } else if (options.stdin && typeof options.stdin !== 'string') {
      throw new Error('Options.stdin must be a string')
    }
    if (options.cwd) {
      command = 'cd ' + options.cwd + ' ; ' + command
    }
    return this.execStream(command).then(function(stream) {
      return new Promise(function(resolve) {
        const contents = {stdout: [], stderr: []}
        stream.on('close', function() {
          resolve({stdout: contents.stdout.join(''), stderr: contents.stderr.join('')})
        }).on('data', function(data) {
          contents.stdout.push(data)
        }).stderr.on('data', function(data) {
          contents.stderr.push(data)
        })
        if (options.stdin) {
          stream.write(options.stdin)
        }
      })
    })
  }
  // Private method. Not for public use
  execStream(command) {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    }
    return new Promise((resolve, reject) => {
      this.connection.exec(command, function(error, stream) {
        if (error) {
          reject(error)
        } else resolve(stream)
      })
    })
  }
  put(localFile, remoteFile, SFTP, retry = true) {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    } else if (typeof localFile !== 'string') {
      throw new Error('localFile must be a string')
    } else if (typeof remoteFile !== 'string') {
      throw new Error('remoteFile must be a string')
    }
    return access(localFile, FS.R_OK).catch(() => {
      throw new Error(`Local file ${localFile} doesn't exist`)
    }).then(() => {
      if (SFTP) {
        return SFTP
      } else this.requestSFTP()
    }).then(SFTP => {
      return new Promise(function(resolve, reject) {
        SFTP.fastPut(localFile, remoteFile, (err) => {
          if (!err) {
            return resolve()
          }
          if (err.message === 'No such file' && retry) {
            resolve(this.mkdir(Path.dirname(remoteFile)).then(() =>
              this.put(localFile, remoteFile, SFTP, false)
            ))
          } else reject(err)
        })
      })
    })
  }
  putMulti(files, SFTP) {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    } else if (!(files instanceof Array)) {
      throw new Error('Files must be an array')
    }
    SFTP = SFTP ? Promise.resolve(SFTP) : this.requestSFTP()
    return SFTP.then(SFTP => {
      const Promises = []
      files.forEach((file) => {
        Promises.push(this.put(file.Local, file.Remote, SFTP))
      })
      return Promise.all(Promises)
    })
  }
  get(remoteFile, localFile, SFTP) {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    } else if (typeof remoteFile !== 'string') {
      throw new Error('remoteFile must be a string')
    } else if (typeof localFile !== 'string') {
      throw new Error('localFile must be a string')
    }
    SFTP = SFTP ? Promise.resolve(SFTP) : this.requestSFTP()
    return SFTP.then(SFTP => {
      return new Promise(function(resolve, reject) {
        SFTP.fastGet(localFile, remoteFile, (err) => {
          reject(err)
        })
      })
    })
  }
  requestSFTP() {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    }
    return new Promise((resolve, reject) => {
      this.connection.sftp(function(err, shell) {
        if (err) {
          reject(err)
        } else resolve(shell)
      })
    })
  }
  requestShell() {
    if (!this.connected) {
      throw new Error('SSH Not yet connected')
    }
    return new Promise((resolve, reject) => {
      this.connection.shell(function(err, shell) {
        if (err) {
          reject(err)
        } else resolve(shell)
      })
    })
  }
  end() {
    this.connection.end()
    this.connection = null
    this.connected = false
  }
}
