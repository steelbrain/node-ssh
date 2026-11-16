import ChildProcess from 'child_process'
import FS from 'fs'
import Path from 'path'
import { spawn as ptySpawn } from 'node-pty'
import ssh2 from 'ssh2'
import { SFTPStream } from 'ssh2-streams'

import { PRIVATE_KEY_PATH } from './helpers'

const { STATUS_CODE } = ((ssh2.utils as unknown) as { sftp: { STATUS_CODE: Record<string, string> } }).sftp

export interface ServerOptions {
  // Answer SFTP CLOSE requests after this many milliseconds, like a remote server would
  sftpCloseDelay?: number
  // Answer SFTP WRITE requests with a failure, like a server whose disk is full
  sftpFailWrites?: boolean
  // Answer SFTP OPEN requests for files in this directory with "Permission denied", like a directory the user
  // can't write to
  sftpReadOnlyDirectory?: string
  // Called with the request name and paths of each SFTP OPEN, STAT, SETSTAT, RENAME, REMOVE and posix-rename request
  onSftpRequest?: (name: string, paths: string[]) => void
  // Called with the child process of each exec request
  onExec?: (child: ChildProcess.ChildProcess) => void
}

// Reads the SSH strings (uint32 length, then bytes) in an EXTENDED request's data
function readSshStrings(data: Buffer): string[] {
  const strings: string[] = []
  let offset = 0
  while (offset + 4 <= data.length) {
    const length = data.readUInt32BE(offset)
    strings.push(data.toString('utf8', offset + 4, offset + 4 + length))
    offset += 4 + length
  }
  return strings
}

function handleSFTP(accept, options: ServerOptions) {
  const sftpStream = accept()

  let dirHandle = 105185
  const handles: Set<number> = new Set()
  const dirHandles: Map<number, string[]> = new Map()
  sftpStream.on('OPEN', function (reqId, filename, flags) {
    options.onSftpRequest?.('OPEN', [filename])
    if (options.sftpReadOnlyDirectory != null && Path.dirname(filename) === options.sftpReadOnlyDirectory) {
      sftpStream.status(reqId, STATUS_CODE.PERMISSION_DENIED)
      return
    }
    let handleId
    try {
      handleId = FS.openSync(filename, SFTPStream.flagsToString(flags) as string)
    } catch (error) {
      console.error(error)
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }
    handles.add(handleId)

    const handle = Buffer.alloc(4)
    handle.write(handleId.toString())
    sftpStream.handle(reqId, handle)
  })
  sftpStream.on('READ', function (reqId, givenHandle, offset, length) {
    const handle = parseInt(givenHandle, 10)
    if (!handles.has(handle)) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }

    const contents = Buffer.alloc(length)
    try {
      FS.readSync(handle, contents, 0, length, offset)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }
    sftpStream.data(reqId, contents)
  })
  sftpStream.on('WRITE', function (reqId, givenHandle, offset, data) {
    const handle = parseInt(givenHandle, 10)
    if (!handles.has(handle) || options.sftpFailWrites) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }

    try {
      FS.writeSync(handle, data, 0, data.length, offset)
      sftpStream.status(reqId, STATUS_CODE.OK)
    } catch (error) {
      console.error(error)
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
    }
  })
  sftpStream.on('FSTAT', function (reqId, givenHandle) {
    const handle = parseInt(givenHandle, 10)
    if (!handles.has(handle)) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }

    let stats
    try {
      stats = FS.fstatSync(handle)
    } catch (error) {
      console.error(error)
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }
    sftpStream.attrs(reqId, stats)
  })
  sftpStream.on('CLOSE', function (reqId, givenHandle) {
    const handle = parseInt(givenHandle, 10)
    if (dirHandles.has(handle)) {
      dirHandles.delete(handle)
      sftpStream.status(reqId, STATUS_CODE.OK)
      return
    }
    if (handles.has(handle)) {
      handles.delete(handle)
      FS.close(handle, function () {
        /* No Op */
      })
      if (options.sftpCloseDelay) {
        setTimeout(() => sftpStream.status(reqId, STATUS_CODE.OK), options.sftpCloseDelay)
      } else {
        sftpStream.status(reqId, STATUS_CODE.OK)
      }
    } else {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
    }
  })
  sftpStream.on('MKDIR', function (reqId, path, attrs) {
    try {
      FS.mkdirSync(path, attrs.mode)
      sftpStream.status(reqId, STATUS_CODE.OK)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE, error.message)
    }
  })
  sftpStream.on('STAT', function (reqId, path) {
    options.onSftpRequest?.('STAT', [path])
    try {
      const stats = FS.statSync(path)
      sftpStream.attrs(reqId, stats)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE, error.message)
    }
  })
  sftpStream.on('SETSTAT', function (reqId, path, attrs) {
    options.onSftpRequest?.('SETSTAT', [path])
    try {
      if (attrs.mode != null) {
        FS.chmodSync(path, attrs.mode)
      }
      if (attrs.atime != null && attrs.mtime != null) {
        FS.utimesSync(path, attrs.atime, attrs.mtime)
      }
      sftpStream.status(reqId, STATUS_CODE.OK)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE, error.message)
    }
  })
  sftpStream.on('REMOVE', function (reqId, path) {
    options.onSftpRequest?.('REMOVE', [path])
    try {
      FS.unlinkSync(path)
      sftpStream.status(reqId, STATUS_CODE.OK)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE, error.message)
    }
  })
  sftpStream.on('RENAME', function (reqId, oldPath, newPath) {
    options.onSftpRequest?.('RENAME', [oldPath, newPath])
    // Like OpenSSH's sftp-server, never replace an existing file
    if (FS.existsSync(newPath)) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }
    try {
      FS.renameSync(oldPath, newPath)
      sftpStream.status(reqId, STATUS_CODE.OK)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE, error.message)
    }
  })
  sftpStream.on('EXTENDED', function (reqId, name, data) {
    if (name !== 'posix-rename@openssh.com') {
      sftpStream.status(reqId, STATUS_CODE.OP_UNSUPPORTED)
      return
    }
    const [oldPath, newPath] = readSshStrings(data)
    options.onSftpRequest?.(name, [oldPath, newPath])
    try {
      FS.renameSync(oldPath, newPath)
      sftpStream.status(reqId, STATUS_CODE.OK)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE, error.message)
    }
  })
  sftpStream.on('OPENDIR', function (reqId, path) {
    let stat
    try {
      stat = FS.statSync(path)
    } catch (error) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }
    if (!stat.isDirectory()) {
      sftpStream.status(reqId, STATUS_CODE.FAILURE)
      return
    }
    const contents = FS.readdirSync(path)

    dirHandle += 1
    const currentDirHandle = dirHandle
    dirHandles.set(currentDirHandle, contents)
    const handle = Buffer.alloc(8)
    handle.write(currentDirHandle.toString())
    sftpStream.handle(reqId, handle)
  })
  sftpStream.on('READDIR', function (reqId, givenHandle) {
    const handle = parseInt(givenHandle, 10)
    const contents = dirHandles.get(handle)
    if (contents == null || !contents.length) {
      sftpStream.status(reqId, STATUS_CODE.EOF)
      return
    }

    const item = contents.pop()

    sftpStream.name(reqId, [
      {
        filename: item,
        longname: item,
        attrs: null,
      },
    ])
  })
}

function handleSession(acceptSession, options: ServerOptions) {
  const session = acceptSession()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ptyInfo: Record<string, any> | null = null
  session.on('pty', function (accept, _, info) {
    accept()
    ptyInfo = {
      name: info.term,
      cols: info.cols,
      rows: info.rows,
      cwd: process.env.HOME,
      env: process.env,
    }
  })
  session.on('shell', function (accept, reject) {
    if (!ptyInfo) {
      reject()
      return
    }
    const request = accept()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spawnedProcess: any = ptySpawn(process.env.SHELL || 'bash', [], ptyInfo)
    request.pipe(spawnedProcess)
    spawnedProcess.pipe(request)
  })
  let command: ChildProcess.ChildProcess | null = null
  // ssh2's server rejects every channel request that arrives after the client's EOF. OpenSSH still acts on
  // signal requests then, and execCommand sends EOF right away when it has no stdin to write.
  session.on('eof', function () {
    session._ending = false
  })
  // Like sshd: send the signal to the command's process group
  session.on('signal', function (accept, reject, info) {
    try {
      if (command?.pid == null) throw new Error('No command is running')
      process.kill(-command.pid, `SIG${info.name}`)
      accept?.()
    } catch (_) {
      reject?.()
    }
  })
  session.on('exec', function (accept, reject, info) {
    const response = accept()
    // Like sshd, run the command with a shell in a new session, so it leads its own process group
    const spawnedProcess = ChildProcess.spawn(info.command, { shell: true, detached: true })
    command = spawnedProcess
    options.onExec?.(spawnedProcess)
    response.pipe(spawnedProcess.stdin)
    spawnedProcess.stdout?.pipe(response.stdout, { end: false })
    spawnedProcess.stderr?.pipe(response.stderr, { end: false })
    // Like sshd: send the exit status, then close the channel. 'close' fires after the process exited and
    // both of its output streams ended, so the output is written before the status.
    spawnedProcess.on('close', (code, signal) => {
      response.exit(signal ?? code ?? 0)
      response.end()
    })
  })
  session.on('sftp', (accept) => handleSFTP(accept, options))
}

function handleAuthentication(ctx) {
  let accept = true
  if (ctx.method === 'password') {
    accept = ctx.username === 'steel' && ctx.password === 'password'
  }
  if (accept) {
    ctx.accept()
  } else {
    ctx.reject()
  }
}

export default function createServer(options: ServerOptions = {}): ssh2.Server {
  const server = new ssh2.Server(
    {
      hostKeys: [FS.readFileSync(PRIVATE_KEY_PATH)],
    },
    function (client) {
      // ssh2's server connections have setNoDelay(), but @types/ssh2 doesn't declare it
      ;(client as ssh2.Connection & { setNoDelay(noDelay: boolean): void }).setNoDelay(true)
      client.on('authentication', handleAuthentication)
      client.on('session', (accept) => handleSession(accept, options))
    },
  )
  return server
}
