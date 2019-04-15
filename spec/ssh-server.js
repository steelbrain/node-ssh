/* @flow */

import FS from 'fs'
import { SFTPStream } from 'ssh2-streams'
import ChildProcess from 'child_process'

import * as pty from 'pty.js'
import ssh2 from 'ssh2'
import { PRIVATE_KEY_PATH } from './helpers'

const STATUS_CODE = ssh2.SFTP_STATUS_CODE

function handleSFTP(accept) {
  const sftpStream = accept()
  const handles: Set<number> = new Set()
  sftpStream.on('OPEN', function(reqid, filename, flags) {
    let handleId
    try {
      handleId = FS.openSync(filename, SFTPStream.flagsToString(flags))
    } catch (error) {
      console.error(error)
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
      return
    }
    handles.add(handleId)

    const handle = Buffer.alloc(4)
    handle.write(handleId.toString())
    sftpStream.handle(reqid, handle)
  })
  sftpStream.on('READ', function(reqid, givenHandle, offset, length) {
    const handle = parseInt(givenHandle, 10)
    if (!handles.has(handle)) {
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
      return
    }

    const contents = Buffer.alloc(length)
    try {
      FS.readSync(handle, contents, 0, length, offset)
    } catch (error) {
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
      return
    }
    sftpStream.data(reqid, contents)
  })
  sftpStream.on('WRITE', function(reqid, givenHandle, offset, data) {
    const handle = parseInt(givenHandle, 10)
    if (!handles.has(handle)) {
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
      return
    }

    try {
      FS.writeSync(handle, data, 0, data.length, offset)
      sftpStream.status(reqid, STATUS_CODE.OK)
    } catch (error) {
      console.error(error)
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
    }
  })
  sftpStream.on('FSTAT', function(reqid, givenHandle) {
    const handle = parseInt(givenHandle, 10)
    if (!handles.has(handle)) {
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
      return
    }

    let stats
    try {
      stats = FS.fstatSync(handle)
    } catch (error) {
      console.error(error)
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
      return
    }
    sftpStream.attrs(reqid, stats)
  })
  sftpStream.on('CLOSE', function(reqid, givenHandle) {
    const handle = parseInt(givenHandle, 10)
    if (handles.has(handle)) {
      handles.delete(handle)
      FS.close(handle, function() {
        /* No Op */
      })
      sftpStream.status(reqid, STATUS_CODE.OK)
    } else {
      sftpStream.status(reqid, STATUS_CODE.FAILURE)
    }
  })
  sftpStream.on('MKDIR', function(reqid, path, attrs) {
    try {
      FS.mkdirSync(path, attrs.mode)
      sftpStream.status(reqid, STATUS_CODE.OK)
    } catch (error) {
      sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message)
    }
  })
  sftpStream.on('STAT', function(reqid, path) {
    try {
      const stats = FS.statSync(path)
      sftpStream.attrs(reqid, stats)
    } catch (error) {
      sftpStream.status(reqid, STATUS_CODE.FAILURE, error.message)
    }
  })
}

function handleSession(acceptSession) {
  const session = acceptSession()
  let ptyInfo: ?Object = null
  session.on('pty', function(accept, _, info) {
    accept()
    ptyInfo = {
      name: info.term,
      cols: info.cols,
      rows: info.rows,
      cwd: process.env.HOME,
      env: process.env,
    }
  })
  session.on('shell', function(accept, reject) {
    if (!ptyInfo) {
      reject()
      return
    }
    const request = accept()
    const spawnedProcess = pty.spawn(process.env.SHELL || 'bash', [], ptyInfo)
    request.pipe(spawnedProcess.socket)
    spawnedProcess.stdout.pipe(request)
  })
  session.on('exec', function(accept, reject, info) {
    const response = accept()
    const spawnedProcess = ChildProcess.exec(info.command)
    response.pipe(spawnedProcess.stdin)
    spawnedProcess.stdout.pipe(response)
    spawnedProcess.stderr.pipe(response.stderr)
  })
  session.on('sftp', handleSFTP)
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

export default function createServer() {
  const server = new ssh2.Server(
    {
      hostKeys: [FS.readFileSync(PRIVATE_KEY_PATH)],
    },
    function(client) {
      client.on('authentication', handleAuthentication)
      client.on('session', handleSession)
    },
  )
  return server
}
