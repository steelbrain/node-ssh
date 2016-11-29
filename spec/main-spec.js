/* @flow */

import FS from 'fs'
import Path from 'path'
import invariant from 'assert'
import ChildProcess from 'child_process'

import { it, wait } from 'jasmine-fix'
import SSH2 from '../src'
import { exists } from '../src/helpers'
import createServer from './ssh-server'
import { PRIVATE_KEY_PATH } from './helpers'

describe('SSH2', function() {
  let ports = 8876

  function getFixturePath(path: string): string {
    return Path.join(__dirname, 'fixtures', path)
  }
  function sshit(title: string, callback: ((port: number, client: SSH2, server: Object) => Promise<void>)): void {
    it(title, async function() {
      const server = createServer()
      const client = new SSH2()
      const port = ports++
      await new Promise(function(resolve) {
        server.listen(port, '127.0.0.1', resolve)
      })
      try {
        await callback(port, client, server)
      } finally {
        client.dispose()
        await new Promise(function(resolve) {
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
      privateKey: PRIVATE_KEY_PATH,
    })
  }
  async function connectWithInlinePrivateKey(port, client) {
    await client.connect({
      host: '127.0.0.1',
      port,
      username: 'steel',
      privateKey: FS.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
    })
  }

  afterEach(function() {
    ChildProcess.exec(`rm -rf ${getFixturePath('ignored/*')}`)
  })

  sshit('connects to a server with password', async function(port, client) {
    try {
      await connectWithPassword(port, client)
    } catch (error) {
      expect('Should not have hit').toBe(error)
    }
  })
  sshit('connects to a server with a private key', async function(port, client) {
    try {
      await connectWithPrivateKey(port, client)
    } catch (error) {
      expect('Should not have hit').toBe(error)
    }
  })
  sshit('connects to a server with a private key', async function(port, client) {
    try {
      await connectWithInlinePrivateKey(port, client)
    } catch (error) {
      expect('Should not have hit').toBe(error)
    }
  })
  sshit('requests a shell that works', async function(port, client) {
    await connectWithPassword(port, client)
    const data = []
    const shell = await client.requestShell()
    shell.on('data', function(chunk) {
      data.push(chunk)
    })
    shell.write('ls /\n')
    await wait(50)
    shell.end()
    const joinedData = data.join('')
    expect(joinedData).toContain('ls /')
  })

  sshit('creates directories with sftp properly', async function(port, client) {
    await connectWithPassword(port, client)
    expect(await exists(getFixturePath('ignored/a/b', 'sftp'))).toBe(false)
    await client.mkdir(getFixturePath('ignored/a/b', 'sftp'))
    expect(await exists(getFixturePath('ignored/a/b', 'sftp'))).toBe(true)
  })
  sshit('creates directories with exec properly', async function(port, client) {
    await connectWithPassword(port, client)
    expect(await exists(getFixturePath('ignored/a/b', 'exec'))).toBe(false)
    await client.mkdir(getFixturePath('ignored/a/b', 'exec'))
    expect(await exists(getFixturePath('ignored/a/b', 'exec'))).toBe(true)
  })
  sshit('throws error when it cant create directories', async function(port, client) {
    await connectWithPassword(port, client)
    try {
      await client.mkdir('/dev/asdasd/asdasdasd')
      expect(false).toBe(true)
    } catch (_) {
      expect(_.message.indexOf('Permission denied') !== -1 || _.message.indexOf('not permitted') !== -1).toBe(true)
    }
  })
  sshit('exec with correct escaped parameters', async function(port, client) {
    await connectWithPassword(port, client)
    const result = await client.exec('echo', ['$some', 'S\\Thing', '"Yo"'])
    expect(result).toBe('$some S\\Thing "Yo"')
  })
  sshit('exec with correct cwd', async function(port, client) {
    await connectWithPassword(port, client)
    const result = await client.exec('pwd', [], { cwd: '/etc' })
    expect(result).toBe('/etc')
  })
  sshit('throws if stream is stdout and stuff is written to stderr', async function(port, client) {
    await connectWithPassword(port, client)
    try {
      await client.exec('node', ['-e', 'console.error("Test")'])
      expect(false).toBe(true)
    } catch (_) {
      expect(_.message).toBe('Test')
    }
  })
  sshit('does not throw if stream is stderr and is written to', async function(port, client) {
    await connectWithPassword(port, client)
    const result = await client.exec('node', ['-e', 'console.error("Test")'], { stream: 'stderr' })
    expect(result).toBe('Test')
  })
  sshit('returns both streams if asked to', async function(port, client) {
    await connectWithPassword(port, client)
    const result = await client.exec('node', ['-e', 'console.log("STDOUT"); console.error("STDERR")'], { stream: 'both' })
    invariant(typeof result === 'object' && result)
    expect(result.stdout).toBe('STDOUT')
    expect(result.stderr).toBe('STDERR')
  })
  sshit('writes to stdin properly', async function(port, client) {
    await connectWithPassword(port, client)
    const result = await client.exec('node', ['-e', 'process.stdin.pipe(process.stdout)'], { stdin: 'Twinkle!\nStars!' })
    expect(result).toBe('Twinkle!\nStars!')
  })
  sshit('gets files properly', async function(port, client) {
    await connectWithPassword(port, client)
    const sourceFile = __filename
    const targetFile = getFixturePath('ignored/test-get')
    expect(await exists(targetFile)).toBe(false)
    await client.getFile(sourceFile, targetFile)
    expect(await exists(targetFile)).toBe(true)
    expect(FS.readFileSync(targetFile, 'utf8').trim()).toBe(FS.readFileSync(sourceFile, 'utf8').trim())
  })
  sshit('puts files properly', async function(port, client) {
    await connectWithPassword(port, client)
    const sourceFile = __filename
    const targetFile = getFixturePath('ignored/test-get')
    expect(await exists(targetFile)).toBe(false)
    await client.putFile(sourceFile, targetFile)
    expect(await exists(targetFile)).toBe(true)
    expect(FS.readFileSync(targetFile, 'utf8').trim()).toBe(FS.readFileSync(sourceFile, 'utf8').trim())
  })
  sshit('puts multiple files properly', async function(port, client) {
    await connectWithPassword(port, client)

    const files = [
      { local: getFixturePath('multiple/aa'), remote: getFixturePath('ignored/aa') },
      { local: getFixturePath('multiple/bb'), remote: getFixturePath('ignored/bb') },
      { local: getFixturePath('multiple/cc'), remote: getFixturePath('ignored/cc') },
      { local: getFixturePath('multiple/dd'), remote: getFixturePath('ignored/dd') },
    ]
    for (const file of files) {
      expect(await exists(file.remote)).toBe(false)
    }
    await client.putFiles(files)
    for (const file of files) {
      expect(await exists(file.remote)).toBe(true)
    }
  })
  sshit('puts entire directories at once', async function(port, client) {
    await connectWithPassword(port, client)
    const remoteFiles = [
      getFixturePath('ignored/aa'),
      getFixturePath('ignored/bb'),
      getFixturePath('ignored/cc'),
      getFixturePath('ignored/dd'),
      getFixturePath('ignored/ee/ff'),
    ]
    for (const file of remoteFiles) {
      expect(await exists(file)).toBe(false)
    }
    let ticks = 0
    await client.putDirectory(getFixturePath('multiple'), getFixturePath('ignored'), {
      tick(local, remote, error) {
        expect(error).toBe(null)
        expect(remoteFiles.indexOf(remote) !== -1).toBe(true)
        ticks++
      },
    })
    expect(ticks).toBe(remoteFiles.length)
    for (const file of remoteFiles) {
      expect(await exists(file)).toBe(true)
    }
  })
})
