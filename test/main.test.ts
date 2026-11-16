import invariant from 'assert'
import ChildProcess from 'child_process'
import { getEventListeners } from 'events'
import fs from 'fs'
import net from 'net'
import os from 'os'
import path from 'path'
import { Client, Connection, Server, ServerChannel, SFTPWrapper } from 'ssh2'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'

import { NodeSSH, SSHError } from '../src'
import { PRIVATE_KEY_ENCRYPTED_PPK_PATH, PRIVATE_KEY_PATH, exists, wait } from './helpers'
import createServer, { ServerOptions } from './ssh-server'

// Each test listens on its own port, counting up from here. Set NODE_SSH_TEST_PORT to run two copies of the
// suite at once.
let ports = Number(process.env.NODE_SSH_TEST_PORT || 8876)

function getFixturePath(fixturePath: string): string {
  return path.join(__dirname, 'fixtures', fixturePath)
}
function sshit(
  title: string,
  callback: (port: number, client: NodeSSH, server: Server) => Promise<void>,
  skip = false,
): void {
  const testFunc = skip ? test.skip : test
  testFunc(title, async function () {
    ports += 1

    const server = createServer()
    const client = new NodeSSH()
    const port = ports
    await new Promise<void>(function (resolve) {
      server.listen(port, '127.0.0.1', resolve)
    })
    try {
      await callback(port, client, server)
    } finally {
      client.dispose()
      await new Promise(function (resolve) {
        server.close(resolve)
      })
    }
  })
}

async function connectWithPassword(port, client) {
  await client.connect({
    host: '127.0.0.1',
    port,
    username: 'steel',
    password: 'password',
  })
}
async function connectWithPrivateKey(port, client) {
  await client.connect({
    host: '127.0.0.1',
    port,
    username: 'steel',
    privateKeyPath: PRIVATE_KEY_PATH,
  })
}
async function connectWithInlinePrivateKey(port, client) {
  await client.connect({
    host: '127.0.0.1',
    port,
    username: 'steel',
    privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
  })
}

afterAll(function () {
  ChildProcess.execSync(`rm -rf ${getFixturePath('ignored/*')}`)
  ChildProcess.execSync(`rm -rf ${getFixturePath('ignored-2/*')}`)
})
beforeAll(function () {
  ChildProcess.execSync(`rm -rf ${getFixturePath('ignored/*')}`)
  ChildProcess.execSync(`rm -rf ${getFixturePath('ignored-2/*')}`)
})

sshit('connects to a server with password', async function (port, client) {
  await expect(connectWithPassword(port, client)).resolves.not.toThrow()
})
sshit('connects to a server with a private key', async function (port, client) {
  await expect(connectWithPrivateKey(port, client)).resolves.not.toThrow()
})
sshit('connects to a server with an inline private key', async function (port, client) {
  await expect(connectWithInlinePrivateKey(port, client)).resolves.not.toThrow()
})
sshit('connects to a server with a private key Buffer', async function (port, client) {
  await client.connect({ host: '127.0.0.1', port, username: 'steel', privateKey: fs.readFileSync(PRIVATE_KEY_PATH) })
  expect(client.isConnected()).toBe(true)
})
sshit('is connected only once the connection is ready', async function (port, client) {
  const connecting = connectWithPassword(port, client)
  expect(client.isConnected()).toBe(false)
  await connecting
  expect(client.isConnected()).toBe(true)
  client.dispose()
  // A failed connect leaves it disconnected right away, without waiting for the socket to close (#459)
  ports += 1
  const refused = ports
  const failed = client.connect({ host: '127.0.0.1', port: refused, username: 'steel', password: 'password' })
  await expect(failed).rejects.toMatchObject({ code: 'ECONNREFUSED' })
  expect(client.isConnected()).toBe(false)
  expect(client.connection).toBe(null)
  // dispose() still stops a connect() that is in progress
  const disposed = connectWithPassword(port, client)
  client.dispose()
  await expect(disposed).rejects.toThrow()
  expect(client.isConnected()).toBe(false)
})
sshit('connects to a server with an encrypted PuTTY private key', async function (port, client) {
  const config = { host: '127.0.0.1', port, username: 'steel', privateKeyPath: PRIVATE_KEY_ENCRYPTED_PPK_PATH }
  await expect(client.connect({ ...config, passphrase: 'wrong' })).rejects.toThrow(
    'Cannot parse privateKey: PPK private key integrity check failed -- bad passphrase?',
  )
  await client.connect({ ...config, passphrase: 'node-ssh test' })
  expect(client.isConnected()).toBe(true)
})
sshit(
  'requests a shell that works',
  async function (port, client) {
    await connectWithPassword(port, client)
    const data: Buffer[] = []
    const shell = await client.requestShell()
    shell.on('data', function (chunk) {
      data.push(chunk)
    })
    shell.write('ls /\n')
    await wait(50)
    shell.end()
    const joinedData = data.join('')
    expect(joinedData).toMatch(/ls \//)
  },
  true,
)

sshit('disables Nagle\'s algorithm on the connection', async function (port, client) {
  const setNoDelay = vi.spyOn(Client.prototype, 'setNoDelay')
  try {
    await connectWithPassword(port, client)
    expect(setNoDelay).toHaveBeenCalledWith(true)
    expect(setNoDelay.mock.contexts).toContain(client.connection)
  } finally {
    setNoDelay.mockRestore()
  }
})

sshit('creates directories with sftp properly', async function (port, client) {
  await connectWithPassword(port, client)
  expect(await exists(getFixturePath('ignored/a/b'))).toBe(false)
  await client.mkdir(getFixturePath('ignored/a/b'), 'sftp')
  expect(await exists(getFixturePath('ignored/a/b'))).toBe(true)
})
sshit('creates directories with exec properly', async function (port, client) {
  await connectWithPassword(port, client)
  expect(await exists(getFixturePath('ignored/c/d'))).toBe(false)
  await client.mkdir(getFixturePath('ignored/c/d'), 'exec')
  expect(await exists(getFixturePath('ignored/c/d'))).toBe(true)
})
sshit('throws error when it cant create directories', async function (port, client) {
  await connectWithPassword(port, client)
  await expect(client.mkdir('/etc/passwd/asdasdasd')).rejects.toThrow('ENOTDIR: not a directory')
})
sshit('exec with correct escaped parameters', async function (port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('echo', ['$some', 'S\\Thing', '"Yo"'])
  expect(result).toBe('$some S\\Thing "Yo"')
})
sshit('exec with correct cwd', async function (port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('pwd', [], { cwd: '/etc' })
  expect(result).toBe('/etc')
})
sshit('expands ~ at the start of cwd to the home directory', async function (port, client) {
  await connectWithPassword(port, client)
  // The test server runs commands with the local shell, so ~ is this process's home directory
  const home = fs.realpathSync(os.homedir())
  expect(await client.exec('pwd', ['-P'], { cwd: '~' })).toBe(home)
  expect(await client.exec('pwd', ['-P'], { cwd: '~/' })).toBe(home)
  expect(await client.exec('pwd', ['-P'], { cwd: '~/..' })).toBe(path.dirname(home))
  // Only a leading ~ is special
  expect((await client.execCommand('pwd', { cwd: '/tmp/~' })).stderr).toMatch(/\/tmp\/~/)
})
sshit('throws if stream is stdout and stuff is written to stderr', async function (port, client) {
  await connectWithPassword(port, client)
  await expect(client.exec('node', ['-e', 'console.error("Test")'])).rejects.toHaveProperty('message', 'Test')
})
sshit('does not throw if stream is stderr and is written to', async function (port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('node', ['-e', 'console.error("Test")'], { stream: 'stderr' })
  expect(result).toBe('Test')
})
sshit('returns both streams if asked to', async function (port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('node', ['-e', 'console.log("STDOUT"); console.error("STDERR")'], { stream: 'both' })
  invariant(typeof result === 'object' && result)
  expect(result.stdout).toBe('STDOUT')
  expect(result.stderr).toBe('STDERR')
})
sshit('returns the exit code and signal', async function (port, client) {
  await connectWithPassword(port, client)
  expect(await client.execCommand('true')).toMatchObject({ code: 0, signal: null })
  expect(await client.execCommand('exit 3')).toMatchObject({ code: 3, signal: null })
  expect(await client.execCommand('kill -TERM $$')).toMatchObject({ code: null, signal: 'SIGTERM' })
  expect(await client.exec('echo', ['$some', 'S\\Thing', '"Yo"'], { stream: 'both' })).toMatchObject({
    stdout: '$some S\\Thing "Yo"',
    code: 0,
    signal: null,
  })
})
sshit('writes to stdin properly', async function (port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('node', ['-e', 'process.stdin.pipe(process.stdout)'], { stdin: 'Twinkle!\nStars!' })
  expect(result).toBe('Twinkle!\nStars!')
})
sshit('gets files properly', async function (port, client) {
  await connectWithPassword(port, client)
  const sourceFile = __filename
  const targetFile = getFixturePath('ignored/test-get')
  expect(await exists(targetFile)).toBe(false)
  await client.getFile(targetFile, sourceFile)
  expect(await exists(targetFile)).toBe(true)
  expect(fs.readFileSync(targetFile, 'utf8').trim()).toBe(fs.readFileSync(sourceFile, 'utf8').trim())
})
sshit('puts files properly', async function (port, client) {
  await connectWithPassword(port, client)
  const sourceFile = __filename
  const targetFile = getFixturePath('ignored/test-put')
  expect(await exists(targetFile)).toBe(false)
  await client.putFile(sourceFile, targetFile)
  expect(await exists(targetFile)).toBe(true)
  expect(fs.readFileSync(targetFile, 'utf8').trim()).toBe(fs.readFileSync(sourceFile, 'utf8').trim())
})
sshit('puts multiple files properly', async function (port, client) {
  await connectWithPassword(port, client)

  const files = [
    { local: getFixturePath('multiple/aa'), remote: getFixturePath('ignored/aa') },
    { local: getFixturePath('multiple/bb'), remote: getFixturePath('ignored/bb') },
    { local: getFixturePath('multiple/cc'), remote: getFixturePath('ignored/cc') },
    { local: getFixturePath('multiple/dd'), remote: getFixturePath('ignored/dd') },
    { local: getFixturePath('multiple/ff'), remote: getFixturePath('ignored/ff') },
    { local: getFixturePath('multiple/gg'), remote: getFixturePath('ignored/gg') },
    { local: getFixturePath('multiple/hh'), remote: getFixturePath('ignored/hh') },
    { local: getFixturePath('multiple/ii'), remote: getFixturePath('ignored/ii') },
    { local: getFixturePath('multiple/jj'), remote: getFixturePath('ignored/jj') },
  ]
  const existsBefore = await Promise.all(files.map((file) => exists(file.remote)))
  expect(existsBefore.every(Boolean)).toBe(false)
  await client.putFiles(files)
  const existsAfter = await Promise.all(files.map((file) => exists(file.remote)))
  expect(existsAfter.every(Boolean)).toBe(true)
})
sshit('puts entire directories at once', async function (port, client) {
  await connectWithPassword(port, client)
  const remoteFiles = [
    getFixturePath('ignored/aa'),
    getFixturePath('ignored/bb'),
    getFixturePath('ignored/cc'),
    getFixturePath('ignored/dd'),
    getFixturePath('ignored/ee/ff'),
    getFixturePath('ignored/ff'),
    getFixturePath('ignored/gg'),
    getFixturePath('ignored/hh'),
    getFixturePath('ignored/ii'),
    getFixturePath('ignored/jj'),
    getFixturePath('ignored/really/really/really/really/really/more deep files'),
    getFixturePath('ignored/really/really/really/really/yes/deep files'),
    getFixturePath('ignored/really/really/really/really/deep'),
  ]
  const filesReceived: string[] = []
  const existsBefore = await Promise.all(remoteFiles.map((file) => exists(file)))
  expect(existsBefore.every(Boolean)).toBe(false)
  await client.putDirectory(getFixturePath('multiple'), getFixturePath('ignored'), {
    tick(local, remote, error) {
      expect(error).toBe(null)
      expect(remoteFiles.indexOf(remote) !== -1).toBe(true)
      filesReceived.push(remote)
    },
  })
  remoteFiles.sort()
  filesReceived.sort()
  expect(remoteFiles).toStrictEqual(filesReceived)
  const existsAfter = await Promise.all(remoteFiles.map((file) => exists(file)))
  expect(existsAfter.every(Boolean)).toBe(true)
})
sshit('gets entire directories at once', async function (port, client) {
  await connectWithPassword(port, client)
  const localFiles = [
    getFixturePath('ignored-2/aa'),
    getFixturePath('ignored-2/bb'),
    getFixturePath('ignored-2/cc'),
    getFixturePath('ignored-2/dd'),
    getFixturePath('ignored-2/ee/ff'),
    getFixturePath('ignored-2/ff'),
    getFixturePath('ignored-2/gg'),
    getFixturePath('ignored-2/hh'),
    getFixturePath('ignored-2/ii'),
    getFixturePath('ignored-2/jj'),
    getFixturePath('ignored-2/really/really/really/really/really/more deep files'),
    getFixturePath('ignored-2/really/really/really/really/yes/deep files'),
    getFixturePath('ignored-2/really/really/really/really/deep'),
  ]
  const filesReceived: string[] = []
  const existsBefore = await Promise.all(localFiles.map((file) => exists(file)))
  expect(existsBefore.every(Boolean)).toBe(false)
  await client.getDirectory(getFixturePath('ignored-2'), getFixturePath('multiple'), {
    tick(local, remote, error) {
      expect(error).toBe(null)
      expect(localFiles.indexOf(local) !== -1).toBe(true)
      filesReceived.push(local)
    },
  })
  localFiles.sort()
  filesReceived.sort()
  expect(localFiles).toStrictEqual(filesReceived)
  const existsAfter = await Promise.all(localFiles.map((file) => exists(file)))
  expect(existsAfter.every(Boolean)).toBe(true)
})
sshit('allows stream callbacks on exec', async function (port, client) {
  await connectWithPassword(port, client)
  const outputFromCallbacks = { stdout: [] as Buffer[], stderr: [] as Buffer[] }
  await client.exec('node', [getFixturePath('test-program')], {
    stream: 'both',
    onStderr(chunk) {
      outputFromCallbacks.stderr.push(chunk)
    },
    onStdout(chunk) {
      outputFromCallbacks.stdout.push(chunk)
    },
  })
  expect(outputFromCallbacks.stdout.join('').trim()).toBe('STDOUT')
  expect(outputFromCallbacks.stderr.join('').trim()).toBe('STDERR')
})
sshit('allows stream callbacks on execCommand', async function (port, client) {
  await connectWithPassword(port, client)
  const outputFromCallbacks = { stdout: [] as Buffer[], stderr: [] as Buffer[] }
  await client.execCommand(`node ${getFixturePath('test-program')}`, {
    onStderr(chunk) {
      outputFromCallbacks.stderr.push(chunk)
    },
    onStdout(chunk) {
      outputFromCallbacks.stdout.push(chunk)
    },
  })
  expect(outputFromCallbacks.stdout.join('').trim()).toBe('STDOUT')
  expect(outputFromCallbacks.stderr.join('').trim()).toBe('STDERR')
})
sshit('forwards an outbound TCP/IP connection from client', async function (port, client, server) {
  const SRC_IP = '127.0.0.1'
  const SRC_PORT = 1212
  const DEST_IP = '127.0.0.2'
  const DEST_PORT = 2424

  await new Promise((resolve) => {
    server.on('connection', async (connection) => {
      connection.once('ready', async () => {
        const channel = await client.forwardOut(SRC_IP, SRC_PORT, DEST_IP, DEST_PORT)
        expect(channel.readable).toBe(true)
        resolve(undefined)
      })

      // Approve first TCP/IP request.
      connection.once('tcpip', (accept, reject, info) => {
        expect(info.destIP).toBe(DEST_IP)
        expect(info.destPort).toBe(DEST_PORT)
        expect(info.srcIP).toBe(SRC_IP)
        expect(info.srcPort).toBe(SRC_PORT)
        accept()
      })
    })
    connectWithPassword(port, client)
  })
})
sshit('forwards an inbound TCP/IP connection to client', async function (port, client, server) {
  const IP = '127.0.0.1'
  const PORT = 1212
  const REMOTE_IP = '127.0.0.2'
  const REMOTE_PORT = 2424

  await new Promise((resolve) => {
    server.on('connection', async (connection) => {
      connection.once('ready', async () => {
        // Wait for a connection.
        const { port: forwardPort, dispose } = await client.forwardIn(IP, PORT, (details) => {
          expect(details.destIP).toBe(IP)
          expect(details.destPort).toBe(PORT)
          expect(details.srcIP).toBe(REMOTE_IP)
          expect(details.srcPort).toBe(REMOTE_PORT)

          // Expect to get an unforward request on server.
          connection.once('request', (accept, reject, name, info) => {
            expect(name).toBe('cancel-tcpip-forward')
            expect(info.bindAddr).toBe(IP)
            expect(info.bindPort).toBe(PORT)
            accept()
            resolve(undefined)
          })

          setTimeout(() => dispose(), 100)
        })

        expect(dispose).toBeTruthy()
        expect(forwardPort).toBe(PORT)
      })

      // Expect to get a request on server.
      connection.once('request', (accept, reject, name, info) => {
        expect(name).toBe('tcpip-forward')
        expect(info.bindAddr).toBe(IP)
        expect(info.bindPort).toBe(PORT)
        accept?.(PORT)

        // Simulate a connection
        connection.forwardOut(info.bindAddr, info.bindPort, REMOTE_IP, REMOTE_PORT, () => {
          // Nothing more to be done here.
        })
      })
    })
    connectWithPassword(port, client)
  })
})
sshit('forwards an outbound UNIX socket connection from client', async function (port, client, server) {
  const PATH = '/run/test.sock'

  await new Promise((resolve) => {
    server.on('connection', async (connection) => {
      connection.once('ready', async () => {
        const channel = await client.forwardOutStreamLocal(PATH)
        expect(channel.readable).toBe(true)
        resolve(undefined)
      })

      // Approve first UNIX socket request.
      connection.once('openssh.streamlocal', (accept, reject, info) => {
        expect(info.socketPath).toBe(PATH)
        accept()
      })
    })
    connectWithPassword(port, client)
  })
})
sshit('forwards an inbound UNIX socket connection to client', async function (port, client, server) {
  const PATH = '/run/test.sock'

  await new Promise((resolve) => {
    server.on('connection', async (connection) => {
      connection.once('ready', async () => {
        // Wait for a connection.
        const { dispose } = await client.forwardInStreamLocal(PATH, (details) => {
          expect(details.socketPath).toBe(PATH)

          // Expect to get an unforward request on server.
          connection.once('request', (accept, reject, name, info) => {
            expect(name).toBe('cancel-streamlocal-forward@openssh.com')
            expect(info.socketPath).toBe(PATH)
            accept()
            resolve(undefined)
          })

          setTimeout(() => dispose(), 100)
        })

        expect(dispose).toBeTruthy()
      })

      // Expect to get a request on server.
      connection.once('request', (accept, reject, name, info) => {
        expect(name).toBe('streamlocal-forward@openssh.com')
        expect(info.socketPath).toBe(PATH)
        accept?.()

        // Simulate a connection
        connection.openssh_forwardOutStreamLocal(PATH, () => {
          // Nothing more to be done here.
        })
      })
    })
    connectWithPassword(port, client)
  })
})
sshit('forwards an inbound TCP/IP connection to client with automatically assigned port', async function (
  port,
  client,
  server,
) {
  const IP = '127.0.0.1'
  const PORT = 1212
  const REMOTE_IP = '127.0.0.2'
  const REMOTE_PORT = 2424

  await new Promise((resolve) => {
    server.on('connection', async (connection) => {
      connection.once('ready', async () => {
        // Wait for a connection.
        const { port: forwardPort, dispose } = await client.forwardIn(IP, 0, (details) => {
          expect(details.destIP).toBe(IP)
          expect(details.destPort).toBe(PORT)
          expect(details.srcIP).toBe(REMOTE_IP)
          expect(details.srcPort).toBe(REMOTE_PORT)

          // Expect to get an unforward request on server.
          connection.once('request', (accept, reject, name, info) => {
            expect(name).toBe('cancel-tcpip-forward')
            expect(info.bindAddr).toBe(IP)
            expect(info.bindPort).toBe(PORT)
            accept()
            resolve(undefined)
          })

          setTimeout(() => dispose(), 100)
        })

        expect(dispose).toBeTruthy()
        expect(forwardPort).toBe(PORT)
      })

      // Expect to get a request on server.
      connection.once('request', (accept, reject, name, info) => {
        expect(name).toBe('tcpip-forward')
        expect(info.bindAddr).toBe(IP)

        // Port equal to 0 -> server chooses the port dynamically.
        expect(info.bindPort).toBe(0)
        accept?.(PORT)

        // Simulate a connection
        connection.forwardOut(info.bindAddr, PORT, REMOTE_IP, REMOTE_PORT, () => {
          // Nothing more to be done here.
        })
      })
    })
    connectWithPassword(port, client)
  })
})
sshit('has a working noTrim option', async function (port, client) {
  await connectWithPassword(port, client)
  const resultWithTrim = await client.exec('echo', ["\nhello\n\n\n\n"], {stream: 'stdout'})
  expect(resultWithTrim).toBe('hello')

  const resultWithoutTrim = await client.exec('echo', ['\n\n\nhi\n\n\n'], {stream: 'stdout', noTrim: true})
  expect(resultWithoutTrim).toBe('\n\n\nhi\n\n\n\n')

  const commandResult = await client.execCommand(
    'node -e "process.stdout.write(\'\\nstdout\\n\\n\'); process.stderr.write(\'\\nstderr\\n\\n\')"',
    { noTrim: true },
  )
  expect(commandResult.stdout).toBe('\nstdout\n\n')
  expect(commandResult.stderr).toBe('\nstderr\n\n')
})
sshit('decodes multi-byte characters split across data chunks', async function (port, client) {
  await connectWithPassword(port, client)
  // 36,000 bytes of 3-byte characters: larger than one 32 KiB SSH packet, so a chunk ends mid-character
  const expected = '\u65e5'.repeat(12000)
  const script = "process.stdout.write('\\u65e5'.repeat(12000)); process.stderr.write('\\u65e5'.repeat(12000))"
  const result = await client.exec('node', ['-e', script], { stream: 'both' })
  expect(result.stdout).toBe(expected)
  expect(result.stderr).toBe(expected)
})
sshit('decodes base64 output split across data chunks', async function (port, client) {
  await connectWithPassword(port, client)
  const expected = Buffer.from(Array.from({ length: 100000 }, (_, i) => (i * 7) % 128)).toString('base64')
  const script = 'process.stdout.write(Buffer.from(Array.from({ length: 100000 }, (_, i) => (i * 7) % 128)))'
  const result = await client.exec('node', ['-e', script], { stream: 'stdout', encoding: 'base64' })
  expect(result).toBe(expected)
})
test('dispose waits for SFTP close replies still in flight', async function () {
  // The server answers SFTP CLOSE after 50ms. A read stream sends CLOSE only after 'end', so disposing
  // on 'end' used to drop the reply and the stream emitted "No response from server" (#471).
  ports += 1
  const port = ports
  const server = createServer({ sftpCloseDelay: 50 })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  const client = new NodeSSH()
  try {
    await connectWithPassword(port, client)
    const sftp = await client.requestSFTP()
    const filePath = getFixturePath('multiple/aa')
    // explicit end: the test server's READ never reports EOF
    const stream = sftp.createReadStream(filePath, { start: 0, end: fs.statSync(filePath).size - 1 })
    const errors: Error[] = []
    await new Promise((resolve, reject) => {
      stream.resume()
      stream.once('error', reject)
      stream.once('end', resolve)
    })
    // The stream emits 'close' once the server answers CLOSE, or 'error' if the reply never comes
    const closedOrFailed = new Promise((resolve) => {
      stream.once('close', resolve)
      stream.on('error', (error: Error) => {
        errors.push(error)
        resolve(undefined)
      })
    })
    client.dispose()
    expect(client.isConnected()).toBe(false)
    await closedOrFailed
    expect(errors.map((error) => error.message)).toStrictEqual([])
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
sshit('passes output only to the callbacks with noBuffer', async function (port, client) {
  await connectWithPassword(port, client)
  const outputFromCallbacks = { stdout: [] as Buffer[], stderr: [] as Buffer[] }
  const result = await client.execCommand(`node ${getFixturePath('test-program')}`, {
    noBuffer: true,
    onStdout(chunk) {
      outputFromCallbacks.stdout.push(chunk)
    },
    onStderr(chunk) {
      outputFromCallbacks.stderr.push(chunk)
    },
  })
  expect(result.stdout).toBe('')
  expect(result.stderr).toBe('')
  expect(Buffer.concat(outputFromCallbacks.stdout).toString().trim()).toBe('STDOUT')
  expect(Buffer.concat(outputFromCallbacks.stderr).toString().trim()).toBe('STDERR')
  await expect(client.execCommand('ls', { noBuffer: 'yes' } as never)).rejects.toThrow('options.noBuffer must be a boolean')
})

// A server whose SFTP subsystem runs `handler` on a plain channel instead of speaking SFTP
async function withSubsystemServer(
  handler: (channel: ServerChannel) => void,
  callback: (client: NodeSSH) => Promise<void>,
): Promise<void> {
  ports += 1
  const port = ports
  const server = new Server({ hostKeys: [fs.readFileSync(PRIVATE_KEY_PATH)] }, (connection) => {
    connection.on('authentication', (ctx) => ctx.accept())
    connection.on('session', (accept) => {
      accept().on('subsystem', (acceptSubsystem) => handler(acceptSubsystem()))
    })
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  const client = new NodeSSH()
  try {
    await connectWithPassword(port, client)
    await callback(client)
  } finally {
    client.dispose()
    await new Promise((resolve) => server.close(resolve))
  }
}
test('explains text from the server where SFTP data should be', async function () {
  // What EC2 images send for root logins, from a forced command in authorized_keys (#414)
  await withSubsystemServer(
    (channel) => {
      channel.write('Please login as the user "ubuntu" rather than the user "root".\n')
      channel.exit(142)
      channel.end()
    },
    async (client) => {
      const error = await client.requestSFTP().catch((err) => err)
      expect(error.message).toBe(
        'Packet length 1349281121 exceeds max length of 262144. The server sent text starting with "Plea" instead of SFTP data, usually from a forced command in authorized_keys or from output in the remote shell\'s startup files (such as ~/.bashrc)',
      )
      await expect(client.putFile(getFixturePath('test-program.js'), '/tmp/x')).rejects.toThrow('starting with "Plea"')
    },
  )
})
test('explains an SFTP subsystem that exits right away', async function () {
  // sshd with a wrong "Subsystem sftp" path: the shell can't run it and exits with 127 (#440)
  await withSubsystemServer(
    (channel) => {
      channel.exit(127)
      channel.end()
    },
    async (client) => {
      await expect(client.requestSFTP()).rejects.toThrow(
          'Received exit code 127 while establishing SFTP session. The SFTP server program exited before SFTP started; check the "Subsystem sftp" line in the server\'s sshd_config',
      )
    },
  )
})
// A server whose exec writes `mebibytes` MiB to stdout without running a command
async function withLargeOutputServer(mebibytes: number, callback: (client: NodeSSH) => Promise<void>): Promise<void> {
  ports += 1
  const port = ports
  const block = Buffer.alloc(1024 * 1024, 0xab)
  const server = new Server({ hostKeys: [fs.readFileSync(PRIVATE_KEY_PATH)] }, (connection) => {
    connection.on('authentication', (ctx) => ctx.accept())
    connection.on('session', (accept) => {
      accept().on('exec', (acceptExec) => {
        const channel = acceptExec()
        let sent = 0
        const pump = () => {
          while (sent < mebibytes) {
            sent += 1
            if (!channel.write(block)) {
              channel.once('drain', pump)
              return
            }
          }
          channel.exit(0)
          channel.end()
        }
        pump()
      })
    })
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  const client = new NodeSSH()
  try {
    await connectWithPassword(port, client)
    await callback(client)
  } finally {
    client.dispose()
    await new Promise((resolve) => server.close(resolve))
  }
}

// 270 MiB as hex is about 566 million characters, more than the longest string V8 allows (about 537 million)
test('rejects instead of crashing when output is too large for a string', async function () {
  await withLargeOutputServer(270, async (client) => {
    await expect(client.execCommand('large', { encoding: 'hex' })).rejects.toMatchObject({
      name: 'Error',
      code: 'ERR_OUTPUT_TOO_LARGE',
    })
  })
}, 60000)
test('streams output too large for a string with noBuffer', async function () {
  await withLargeOutputServer(270, async (client) => {
    let received = 0
    const result = await client.execCommand('large', {
      encoding: 'hex',
      noBuffer: true,
      onStdout(chunk) {
        received += chunk.length
      },
    })
    expect(received).toBe(270 * 1024 * 1024)
    expect(result.stdout).toBe('')
    expect(result.code).toBe(0)
  })
}, 60000)
function DEFAULT_IGNORE() {
  /* No Op */
}
// Connects a client through a TCP proxy in front of the test server, so the test can reset the client's socket
async function withResettableConnection(callback: (client: NodeSSH, reset: () => void) => Promise<void>): Promise<void> {
  ports += 1
  const serverPort = ports
  ports += 1
  const proxyPort = ports
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(serverPort, '127.0.0.1', resolve))
  let clientSocket: net.Socket | null = null
  const proxy = net.createServer((socket) => {
    clientSocket = socket
    const upstream = net.connect(serverPort, '127.0.0.1')
    socket.pipe(upstream).pipe(socket)
    socket.on('error', DEFAULT_IGNORE)
    upstream.on('error', DEFAULT_IGNORE)
    socket.on('close', () => upstream.destroy())
    upstream.on('close', () => socket.destroy())
  })
  await new Promise<void>((resolve) => proxy.listen(proxyPort, '127.0.0.1', resolve))
  const client = new NodeSSH()
  try {
    await connectWithPassword(proxyPort, client)
    invariant(clientSocket)
    const socket: net.Socket = clientSocket
    await callback(client, () => socket.resetAndDestroy())
  } finally {
    client.dispose()
    await new Promise((resolve) => proxy.close(resolve))
    await new Promise((resolve) => server.close(resolve))
  }
}
test('survives the connection being reset while idle', async function () {
  await withResettableConnection(async (client, reset) => {
    const { connection } = client
    invariant(connection)
    const closed = new Promise<void>((resolve) => connection.once('close', () => resolve()))
    reset()
    await closed
    expect(client.isConnected()).toBe(false)
  })
})
test('rejects a running command when the connection is reset', async function () {
  await withResettableConnection(async (client, reset) => {
    let channelOpened = DEFAULT_IGNORE
    const opened = new Promise<void>((resolve) => {
      channelOpened = resolve
    })
    const result = client.execCommand('sleep 2', { onChannel: () => channelOpened() })
    await opened
    reset()
    await expect(result).rejects.toMatchObject({ code: 'ECONNRESET' })
  })
})
sshit('runs many requests at once without a listener leak warning', async function (port, client) {
  await connectWithPassword(port, client)
  const warnings: Error[] = []
  const onWarning = (warning: Error) => warnings.push(warning)
  process.on('warning', onWarning)
  try {
    await Promise.all(Array.from({ length: 12 }, () => client.execCommand('echo 1')))
    await Promise.all(Array.from({ length: 12 }, () => client.requestSFTP().then((sftp) => sftp.end())))
  } finally {
    process.off('warning', onWarning)
  }
  expect(warnings.map((warning) => warning.name)).not.toContain('MaxListenersExceededWarning')
})
sshit('rejects when an output callback throws, and keeps the connection', async function (port, client) {
  await connectWithPassword(port, client)
  const throwing = () => {
    throw new Error('thrown in a callback')
  }
  await expect(client.execCommand('echo 1', { onStdout: throwing })).rejects.toThrow('thrown in a callback')
  await expect(client.execCommand('echo 1 >&2', { onStderr: throwing })).rejects.toThrow('thrown in a callback')
  await expect(client.execCommand('echo 1', { onChannel: throwing })).rejects.toThrow('thrown in a callback')
  expect(client.isConnected()).toBe(true)
  expect((await client.execCommand('echo still connected')).stdout).toBe('still connected')
})

type SftpRequests = { name: string; paths: string[] }[]

// Like sshit, but connected, and the server records the SFTP requests it gets
function sshitRecording(
  title: string,
  callback: (client: NodeSSH, requests: SftpRequests) => Promise<void>,
  serverOptions: ServerOptions = {},
): void {
  test(title, async function () {
    ports += 1
    const port = ports
    const requests: SftpRequests = []
    const server = createServer({ ...serverOptions, onSftpRequest: (name, paths) => requests.push({ name, paths }) })
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
    const client = new NodeSSH()
    try {
      await connectWithPassword(port, client)
      await callback(client, requests)
    } finally {
      client.dispose()
      await new Promise((resolve) => server.close(resolve))
    }
  })
}
function makeIgnoredDirectory(name: string): string {
  const directory = getFixturePath(`ignored/${name}`)
  fs.mkdirSync(directory, { recursive: true })
  return directory
}
// The hidden temporary file that atomic uploads write before renaming it to targetFile
function isTemporaryFile(remoteFile: string, targetFile: string): boolean {
  const name = path.basename(targetFile)
  return (
    path.dirname(remoteFile) === path.dirname(targetFile) &&
    path.basename(remoteFile).startsWith(`.${name}.`) &&
    /^\.[0-9a-f]{12}\.tmp$/.test(path.basename(remoteFile).slice(name.length + 1))
  )
}
// ssh2's server can't advertise SFTP extensions, so tell the client that the test server handles posix-rename
function enablePosixRename(sftp: SFTPWrapper): void {
  ;(sftp as unknown as { _extensions: Record<string, string> })._extensions['posix-rename@openssh.com'] = '1'
}

sshitRecording('puts a file atomically through a hidden temporary file', async function (client, requests) {
  const targetFile = path.join(makeIgnoredDirectory('atomic-put'), 'target')
  await client.putFile(__filename, targetFile, null, null, { atomic: true })
  expect(fs.readFileSync(targetFile, 'utf8')).toBe(fs.readFileSync(__filename, 'utf8'))
  const temporaryFile = requests[0].paths[0]
  expect(isTemporaryFile(temporaryFile, targetFile)).toBe(true)
  expect(requests).toStrictEqual([
    { name: 'OPEN', paths: [temporaryFile] },
    { name: 'RENAME', paths: [temporaryFile, targetFile] },
  ])
  expect(fs.readdirSync(path.dirname(targetFile))).toStrictEqual(['target'])
})
sshitRecording('replaces an existing file with atomic putFile using posix-rename', async function (client, requests) {
  const targetFile = path.join(makeIgnoredDirectory('atomic-posix-rename'), 'target')
  fs.writeFileSync(targetFile, 'old')
  const sftp = await client.requestSFTP()
  enablePosixRename(sftp)
  await client.putFile(__filename, targetFile, sftp, null, { atomic: true })
  sftp.end()
  expect(fs.readFileSync(targetFile, 'utf8')).toBe(fs.readFileSync(__filename, 'utf8'))
  const temporaryFile = requests[0].paths[0]
  expect(isTemporaryFile(temporaryFile, targetFile)).toBe(true)
  expect(requests).toStrictEqual([
    { name: 'OPEN', paths: [temporaryFile] },
    { name: 'posix-rename@openssh.com', paths: [temporaryFile, targetFile] },
  ])
  expect(fs.readdirSync(path.dirname(targetFile))).toStrictEqual(['target'])
})
sshitRecording('replaces an existing file with atomic putFile without posix-rename', async function (client, requests) {
  const targetFile = path.join(makeIgnoredDirectory('atomic-rename'), 'target')
  fs.writeFileSync(targetFile, 'old')
  await client.putFile(__filename, targetFile, null, null, { atomic: true })
  expect(fs.readFileSync(targetFile, 'utf8')).toBe(fs.readFileSync(__filename, 'utf8'))
  const temporaryFile = requests[0].paths[0]
  expect(isTemporaryFile(temporaryFile, targetFile)).toBe(true)
  // The test server's RENAME, like OpenSSH's, fails when the target exists
  expect(requests).toStrictEqual([
    { name: 'OPEN', paths: [temporaryFile] },
    { name: 'RENAME', paths: [temporaryFile, targetFile] },
    { name: 'REMOVE', paths: [targetFile] },
    { name: 'RENAME', paths: [temporaryFile, targetFile] },
  ])
  expect(fs.readdirSync(path.dirname(targetFile))).toStrictEqual(['target'])
})
sshitRecording(
  'removes the temporary file and keeps the target when an atomic upload fails',
  async function (client, requests) {
    const targetFile = path.join(makeIgnoredDirectory('atomic-upload-fails'), 'target')
    fs.writeFileSync(targetFile, 'old')
    await expect(client.putFile(__filename, targetFile, null, null, { atomic: true })).rejects.toThrow('Failure')
    expect(fs.readFileSync(targetFile, 'utf8')).toBe('old')
    const temporaryFile = requests[0].paths[0]
    expect(isTemporaryFile(temporaryFile, targetFile)).toBe(true)
    expect(requests).toStrictEqual([
      { name: 'OPEN', paths: [temporaryFile] },
      { name: 'REMOVE', paths: [temporaryFile] },
    ])
    expect(fs.readdirSync(path.dirname(targetFile))).toStrictEqual(['target'])
  },
  { sftpFailWrites: true },
)
sshitRecording('removes the temporary file and keeps the target when an atomic rename fails', async function (client) {
  // A file can't replace a directory
  const targetFile = path.join(makeIgnoredDirectory('atomic-rename-fails'), 'target')
  fs.mkdirSync(targetFile)
  fs.writeFileSync(path.join(targetFile, 'keep'), 'kept')
  await expect(client.putFile(__filename, targetFile, null, null, { atomic: true })).rejects.toThrow('Failure')
  expect(fs.readFileSync(path.join(targetFile, 'keep'), 'utf8')).toBe('kept')
  expect(fs.readdirSync(path.dirname(targetFile))).toStrictEqual(['target'])
})
sshitRecording('puts multiple files atomically', async function (client, requests) {
  const directory = makeIgnoredDirectory('atomic-files')
  const files = ['aa', 'bb', 'cc'].map((name) => ({
    local: getFixturePath(`multiple/${name}`),
    remote: path.join(directory, name),
  }))
  await client.putFiles(files, { atomic: true, concurrency: 3 })
  const opened = requests.filter((request) => request.name === 'OPEN').map((request) => request.paths[0])
  expect(opened).toHaveLength(files.length)
  for (const file of files) {
    expect(fs.readFileSync(file.remote, 'utf8')).toBe(fs.readFileSync(file.local, 'utf8'))
    expect(opened.some((remoteFile) => isTemporaryFile(remoteFile, file.remote))).toBe(true)
  }
  expect(fs.readdirSync(directory).sort()).toStrictEqual(['aa', 'bb', 'cc'])
})
sshitRecording('puts entire directories atomically', async function (client, requests) {
  const directory = makeIgnoredDirectory('atomic-directory')
  const remoteFiles: string[] = []
  const succeeded = await client.putDirectory(getFixturePath('multiple'), directory, {
    atomic: true,
    tick(local, remote, error) {
      expect(error).toBe(null)
      remoteFiles.push(remote)
    },
  })
  expect(succeeded).toBe(true)
  expect(remoteFiles).toHaveLength(13)
  const opened = requests.filter((request) => request.name === 'OPEN').map((request) => request.paths[0])
  expect(opened).toHaveLength(13)
  for (const remote of remoteFiles) {
    expect(fs.existsSync(remote)).toBe(true)
    expect(opened.some((remoteFile) => isTemporaryFile(remoteFile, remote))).toBe(true)
  }
  const leftovers = fs.readdirSync(directory, { recursive: true }).filter((file) => String(file).endsWith('.tmp'))
  expect(leftovers).toStrictEqual([])
})
test('rejects instead of hanging when the connection closes during an atomic upload', async function () {
  ports += 1
  const port = ports
  const connections: Connection[] = []
  const server = createServer({
    onSftpRequest(name) {
      if (name === 'OPEN') connections.forEach((connection) => connection.end())
    },
  })
  server.on('connection', (connection) => connections.push(connection))
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  const client = new NodeSSH()
  try {
    await connectWithPassword(port, client)
    const targetFile = path.join(makeIgnoredDirectory('atomic-connection-closes'), 'target')
    // The upload fails, and removing the temporary file must not wait for a reply that never comes
    await expect(client.putFile(__filename, targetFile, null, null, { atomic: true })).rejects.toThrow(
      'No response from server',
    )
  } finally {
    client.dispose()
    await new Promise((resolve) => server.close(resolve))
  }
})
sshit('validates the atomic option', async function (port, client) {
  await connectWithPassword(port, client)
  const targetFile = getFixturePath('ignored/atomic-validate')
  const options = { atomic: 'yes' } as never
  await expect(client.putFile(__filename, targetFile, null, null, options)).rejects.toThrow(
    'options.atomic must be a boolean',
  )
  await expect(client.putFiles([{ local: __filename, remote: targetFile }], options)).rejects.toThrow(
    'options.atomic must be a boolean',
  )
  await expect(client.putDirectory(getFixturePath('multiple'), targetFile, options)).rejects.toThrow(
    'options.atomic must be a boolean',
  )
  expect(fs.existsSync(targetFile)).toBe(false)
})

// Local times with a fraction of a second, which SFTP can't send
const LOCAL_ATIME = 1000000000.25
const LOCAL_MTIME = 1000000100.75
function writeFileWithTimes(file: string, contents: string, mtime = LOCAL_MTIME): string {
  fs.writeFileSync(file, contents)
  fs.utimesSync(file, LOCAL_ATIME, mtime)
  return file
}
// The remote files that the client opened, which it does to upload them
function getUploads(requests: SftpRequests): string[] {
  return requests.filter((request) => request.name === 'OPEN').map((request) => request.paths[0])
}

sshitRecording('skips an unchanged file with skipUnchanged', async function (client, requests) {
  const directory = makeIgnoredDirectory('skip-unchanged')
  const localFile = writeFileWithTimes(path.join(directory, 'local'), 'new')
  // The same size and modification time in whole seconds as localFile, other contents
  const remoteFile = writeFileWithTimes(path.join(directory, 'remote'), 'old', Math.floor(LOCAL_MTIME))
  await client.putFile(localFile, remoteFile, null, null, { skipUnchanged: true })
  expect(fs.readFileSync(remoteFile, 'utf8')).toBe('old')
  expect(requests).toStrictEqual([{ name: 'STAT', paths: [remoteFile] }])
})
sshitRecording(
  'uploads with skipUnchanged when the size or modification time differs or the remote is not a file',
  async function (client, requests) {
    const directory = makeIgnoredDirectory('skip-unchanged-differs')
    const localFile = writeFileWithTimes(path.join(directory, 'local'), 'new')
    const otherSize = writeFileWithTimes(path.join(directory, 'other-size'), 'older', Math.floor(LOCAL_MTIME))
    const otherTime = writeFileWithTimes(path.join(directory, 'other-time'), 'old', Math.floor(LOCAL_MTIME) - 1)
    for (const remoteFile of [otherSize, otherTime]) {
      await client.putFile(localFile, remoteFile, null, null, { skipUnchanged: true })
      expect(fs.readFileSync(remoteFile, 'utf8')).toBe('new')
    }
    expect(getUploads(requests)).toStrictEqual([otherSize, otherTime])

    // A directory with the local file's size and modification time: the upload fails instead of being skipped
    const remoteDirectory = path.join(directory, 'directory')
    fs.mkdirSync(remoteDirectory)
    const sameAsDirectory = path.join(directory, 'same-as-directory')
    writeFileWithTimes(sameAsDirectory, 'x'.repeat(fs.statSync(remoteDirectory).size))
    fs.utimesSync(remoteDirectory, LOCAL_ATIME, LOCAL_MTIME)
    await expect(
      client.putFile(sameAsDirectory, remoteDirectory, null, null, { skipUnchanged: true }),
    ).rejects.toThrow('Failure')
  },
)
sshitRecording('sets the remote times after an upload with skipUnchanged', async function (client, requests) {
  const directory = makeIgnoredDirectory('skip-unchanged-times')
  const localFile = writeFileWithTimes(path.join(directory, 'local'), 'new')
  const remoteFile = path.join(directory, 'remote')
  await client.putFile(localFile, remoteFile, null, null, { skipUnchanged: true })
  const { atimeMs, mtimeMs } = fs.statSync(remoteFile)
  expect({ atimeMs, mtimeMs }).toStrictEqual({
    atimeMs: Math.floor(LOCAL_ATIME) * 1000,
    mtimeMs: Math.floor(LOCAL_MTIME) * 1000,
  })
  expect(fs.readFileSync(remoteFile, 'utf8')).toBe('new')
  expect(requests).toStrictEqual([
    { name: 'STAT', paths: [remoteFile] },
    { name: 'OPEN', paths: [remoteFile] },
    { name: 'SETSTAT', paths: [remoteFile] },
  ])
})
sshitRecording('skips unchanged files in putFiles with skipUnchanged', async function (client, requests) {
  const directory = makeIgnoredDirectory('skip-unchanged-files')
  const files = ['aa', 'bb', 'cc'].map((name) => ({
    local: writeFileWithTimes(path.join(directory, `local-${name}`), name),
    remote: path.join(directory, name),
  }))
  await client.putFiles(files, { skipUnchanged: true })
  expect(getUploads(requests)).toStrictEqual(files.map((file) => file.remote))

  requests.length = 0
  await client.putFiles(files, { skipUnchanged: true })
  expect(requests).toStrictEqual(files.map((file) => ({ name: 'STAT', paths: [file.remote] })))

  requests.length = 0
  writeFileWithTimes(files[1].local, 'changed', LOCAL_MTIME + 1)
  await client.putFiles(files, { skipUnchanged: true })
  expect(getUploads(requests)).toStrictEqual([files[1].remote])
  expect(fs.readFileSync(files[1].remote, 'utf8')).toBe('changed')
})
sshitRecording('skips unchanged files in putDirectory with skipUnchanged', async function (client, requests) {
  const localDirectory = makeIgnoredDirectory('skip-unchanged-directory-local')
  fs.cpSync(getFixturePath('multiple'), localDirectory, { recursive: true })
  // Old times, so that a second upload can only skip the files if the first one set their remote times
  for (const entry of fs.readdirSync(localDirectory, { recursive: true })) {
    fs.utimesSync(path.join(localDirectory, String(entry)), LOCAL_ATIME, LOCAL_MTIME)
  }
  const remoteDirectory = makeIgnoredDirectory('skip-unchanged-directory')
  // Uploads localDirectory, and returns the uploaded files and what tick got as skipped for each file
  const putDirectory = async () => {
    requests.length = 0
    const skipped: Record<string, boolean | undefined> = {}
    const succeeded = await client.putDirectory(localDirectory, remoteDirectory, {
      skipUnchanged: true,
      tick(local, remote, error, wasSkipped) {
        expect(error).toBe(null)
        skipped[path.relative(remoteDirectory, remote)] = wasSkipped
      },
    })
    expect(succeeded).toBe(true)
    const uploads = getUploads(requests).map((remote) => path.relative(remoteDirectory, remote))
    return { uploads, skipped }
  }

  const first = await putDirectory()
  expect(first.uploads).toHaveLength(13)
  expect(Object.keys(first.skipped).sort()).toStrictEqual([...first.uploads].sort())
  expect(new Set(Object.values(first.skipped))).toStrictEqual(new Set([false]))

  const second = await putDirectory()
  expect(second.uploads).toStrictEqual([])
  expect(Object.keys(second.skipped)).toHaveLength(13)
  expect(new Set(Object.values(second.skipped))).toStrictEqual(new Set([true]))

  writeFileWithTimes(path.join(localDirectory, 'ee/ff'), 'changed', LOCAL_MTIME + 1)
  const third = await putDirectory()
  expect(third.uploads).toStrictEqual(['ee/ff'])
  expect(third.skipped).toStrictEqual({ ...second.skipped, 'ee/ff': false })
  expect(fs.readFileSync(path.join(remoteDirectory, 'ee/ff'), 'utf8')).toBe('changed')
})
sshitRecording('sets the times before the rename with atomic and skipUnchanged', async function (client, requests) {
  const directory = makeIgnoredDirectory('skip-unchanged-atomic')
  const localFile = writeFileWithTimes(path.join(directory, 'local'), 'new')
  const remoteFile = path.join(directory, 'remote')
  await client.putFile(localFile, remoteFile, null, null, { atomic: true, skipUnchanged: true })
  expect(fs.readFileSync(remoteFile, 'utf8')).toBe('new')
  expect(fs.statSync(remoteFile).mtimeMs).toBe(Math.floor(LOCAL_MTIME) * 1000)
  const temporaryFile = requests[1].paths[0]
  expect(isTemporaryFile(temporaryFile, remoteFile)).toBe(true)
  expect(requests).toStrictEqual([
    { name: 'STAT', paths: [remoteFile] },
    { name: 'OPEN', paths: [temporaryFile] },
    { name: 'SETSTAT', paths: [temporaryFile] },
    { name: 'RENAME', paths: [temporaryFile, remoteFile] },
  ])

  requests.length = 0
  await client.putFile(localFile, remoteFile, null, null, { atomic: true, skipUnchanged: true })
  expect(requests).toStrictEqual([{ name: 'STAT', paths: [remoteFile] }])
  expect(fs.readdirSync(directory).sort()).toStrictEqual(['local', 'remote'])
})
test('rejects instead of hanging when the connection closes during the skipUnchanged check', async function () {
  ports += 1
  const port = ports
  const connections: Connection[] = []
  const server = createServer({
    onSftpRequest(name) {
      if (name === 'STAT') connections.forEach((connection) => connection.end())
    },
  })
  server.on('connection', (connection) => connections.push(connection))
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  const client = new NodeSSH()
  try {
    await connectWithPassword(port, client)
    const targetFile = path.join(makeIgnoredDirectory('skip-unchanged-connection-closes'), 'target')
    // The check fails, and the upload must not wait for replies that never come
    await expect(client.putFile(__filename, targetFile, null, null, { skipUnchanged: true })).rejects.toThrow(
      'No response from server',
    )
  } finally {
    client.dispose()
    await new Promise((resolve) => server.close(resolve))
  }
})
sshit('validates the skipUnchanged option', async function (port, client) {
  await connectWithPassword(port, client)
  const targetFile = getFixturePath('ignored/skip-unchanged-validate')
  const options = { skipUnchanged: 'yes' } as never
  const message = 'options.skipUnchanged must be a boolean'
  await expect(client.putFile(__filename, targetFile, null, null, options)).rejects.toThrow(message)
  // No files, so only putFiles' own check can reject
  await expect(client.putFiles([], options)).rejects.toThrow(message)
  await expect(client.putDirectory(getFixturePath('multiple'), targetFile, options)).rejects.toThrow(message)
  expect(fs.existsSync(targetFile)).toBe(false)
})

// Like sshit, but connected, and the server passes the child process of each command to the test
function sshitWithCommands(
  title: string,
  callback: (client: NodeSSH, commands: ChildProcess.ChildProcess[]) => Promise<void>,
): void {
  test(title, async function () {
    ports += 1
    const port = ports
    const commands: ChildProcess.ChildProcess[] = []
    const server = createServer({ onExec: (child) => commands.push(child) })
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
    const client = new NodeSSH()
    try {
      await connectWithPassword(port, client)
      await callback(client, commands)
    } finally {
      client.dispose()
      await new Promise((resolve) => server.close(resolve))
    }
  })
}
// Resolves with the name of the signal that ended the process, or with its exit code
function exited(child: ChildProcess.ChildProcess): Promise<string | number | null> {
  if (child.exitCode != null || child.signalCode != null) {
    return Promise.resolve(child.signalCode ?? child.exitCode)
  }
  return new Promise((resolve) => child.once('exit', (code, signal) => resolve(signal ?? code)))
}
// Whether a process in the command's process group still exists (the test server starts each command in its own)
function processGroupExists(child: ChildProcess.ChildProcess): boolean {
  invariant(child.pid != null)
  try {
    process.kill(-child.pid, 0)
    return true
  } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  }
}
function countTimers(): number {
  return process.getActiveResourcesInfo().filter((type) => type === 'Timeout').length
}
// `opened` resolves once execCommand calls `onChannel`
function waitForChannel(): { opened: Promise<void>; onChannel: () => void } {
  let resolveOpened = DEFAULT_IGNORE
  const opened = new Promise<void>((resolve) => {
    resolveOpened = resolve
  })
  return { opened, onChannel: () => resolveOpened() }
}

sshitWithCommands('rejects with ETIMEDOUT when a command runs longer than the timeout', async function (client) {
  const result = client.execCommand('sleep 10', { timeout: 100 })
  await expect(result).rejects.toBeInstanceOf(SSHError)
  await expect(result).rejects.toMatchObject({ message: 'Command timed out after 100ms', code: 'ETIMEDOUT' })
  await expect(client.exec('sleep', ['10'], { timeout: 100 })).rejects.toMatchObject({
    message: 'Command timed out after 100ms',
    code: 'ETIMEDOUT',
  })
  expect(client.isConnected()).toBe(true)
  expect((await client.execCommand('echo still connected', { timeout: 2000 })).stdout).toBe('still connected')
})
sshitWithCommands('sends killSignal to the remote command when it times out', async function (client, commands) {
  // The signal goes to the command's process group, like with OpenSSH, so the shell's child process stops too
  await expect(client.execCommand('sleep 10; echo done', { timeout: 100 })).rejects.toMatchObject({ code: 'ETIMEDOUT' })
  expect(await exited(commands[0])).toBe('SIGTERM')
  await vi.waitFor(() => expect(processGroupExists(commands[0])).toBe(false))

  await expect(client.execCommand('sleep 10', { timeout: 100, killSignal: 'SIGKILL' })).rejects.toMatchObject({
    code: 'ETIMEDOUT',
  })
  expect(await exited(commands[1])).toBe('SIGKILL')
  await expect(client.exec('sleep', ['10'], { timeout: 100, killSignal: 'int' })).rejects.toMatchObject({
    code: 'ETIMEDOUT',
  })
  expect(await exited(commands[2])).toBe('SIGINT')
})
sshitWithCommands('stops the remote command and rejects with the reason when the signal aborts', async function (
  client,
  commands,
) {
  const controller = new AbortController()
  const first = waitForChannel()
  const result = client.execCommand('sleep 10; echo done', { signal: controller.signal, onChannel: first.onChannel })
  await first.opened
  controller.abort()
  await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  expect(await exited(commands[0])).toBe('SIGTERM')
  await vi.waitFor(() => expect(processGroupExists(commands[0])).toBe(false))

  const reason = new Error('stopped by the test')
  const secondController = new AbortController()
  const second = waitForChannel()
  const secondResult = client.exec('sleep', ['10'], {
    signal: secondController.signal,
    killSignal: 'KILL',
    onChannel: second.onChannel,
  })
  await second.opened
  secondController.abort(reason)
  await expect(secondResult).rejects.toBe(reason)
  expect(await exited(commands[1])).toBe('SIGKILL')
})
sshitWithCommands('stops the remote command when the signal aborts while its channel opens', async function (
  client,
  commands,
) {
  const controller = new AbortController()
  const result = client.execCommand('sleep 10', { signal: controller.signal })
  controller.abort()
  await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  // The command starts once the channel is open, and node-ssh stops it right away
  await vi.waitFor(() => expect(commands).toHaveLength(1))
  expect(await exited(commands[0])).toBe('SIGTERM')
})
sshitWithCommands('rejects without starting the command when the signal is already aborted', async function (
  client,
  commands,
) {
  const { connection } = client
  invariant(connection)
  const exec = vi.spyOn(connection, 'exec')
  const reason = new Error('aborted before the call')
  await expect(client.execCommand('echo 1', { signal: AbortSignal.abort(reason) })).rejects.toBe(reason)
  await expect(client.exec('echo', ['1'], { signal: AbortSignal.abort() })).rejects.toMatchObject({ name: 'AbortError' })
  expect(exec).not.toHaveBeenCalled()
  await wait(100)
  expect(commands).toHaveLength(0)
})
sshitWithCommands('stops the timeout and the abort listener when a command finishes', async function (client, commands) {
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandled)
  try {
    const controller = new AbortController()
    const options = { timeout: 200, signal: controller.signal }
    const timers = countTimers()
    expect(await client.execCommand('echo done', options)).toMatchObject({ stdout: 'done', code: 0 })
    expect(countTimers()).toBe(timers)
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)

    const throwing = () => {
      throw new Error('thrown in a callback')
    }
    await expect(client.execCommand('echo 1', { ...options, onStdout: throwing })).rejects.toThrow('thrown in a callback')
    expect(countTimers()).toBe(timers)
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)

    // Neither the timeout passing nor an abort afterwards signals the finished commands
    controller.abort()
    await wait(300)
    expect(commands.map((command) => command.signalCode)).toStrictEqual([null, null])
    expect(unhandled).toStrictEqual([])
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})
test('stops the timeout and the abort listener when the connection fails during a command', async function () {
  await withResettableConnection(async (client, reset) => {
    const controller = new AbortController()
    const timers = countTimers()
    const { opened, onChannel } = waitForChannel()
    const result = client.execCommand('sleep 2', { timeout: 60000, signal: controller.signal, onChannel })
    await opened
    reset()
    await expect(result).rejects.toMatchObject({ code: 'ECONNRESET' })
    expect(countTimers()).toBe(timers)
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0)
  })
})
sshit('validates the timeout, signal and killSignal options', async function (port, client) {
  await connectWithPassword(port, client)
  for (const timeout of [0, -1, NaN, Infinity, 2 ** 31, '100']) {
    await expect(client.execCommand('echo 1', { timeout } as never)).rejects.toThrow(
      'options.timeout must be a number greater than 0 and at most 2147483647',
    )
  }
  for (const signal of [{}, 'signal', true, { aborted: false }]) {
    await expect(client.execCommand('echo 1', { signal } as never)).rejects.toThrow(
      'options.signal must be a valid AbortSignal',
    )
  }
  for (const killSignal of ['WINCH', 'SIGFOO', 'SIG', '', 9]) {
    await expect(client.execCommand('echo 1', { killSignal } as never)).rejects.toThrow(
      'options.killSignal must be one of ABRT, ALRM, FPE, HUP, ILL, INT, KILL, PIPE, QUIT, SEGV, TERM, USR1, USR2, with or without the SIG prefix',
    )
  }
  await expect(client.exec('echo', ['1'], { timeout: 0 })).rejects.toThrow('options.timeout must be a number')

  const signal = new AbortController().signal
  for (const killSignal of ['KILL', 'SIGKILL', 'sigusr1']) {
    expect((await client.execCommand('echo 1', { timeout: 2 ** 31 - 1, signal, killSignal })).stdout).toBe('1')
  }
})

