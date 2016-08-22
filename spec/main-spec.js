/* @flow */

import Path from 'path'
import ChildProcess from 'child_process'

import { it, wait } from 'jasmine-fix'
import SSH2 from '../src'
import { exists } from '../src/helpers'
import createServer from './ssh-server'
import { PRIVATE_KEY_PATH } from './helpers'

fdescribe('SSH2', function() {
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
  sshit('requests a shell that works', async function(port, client) {
    await connectWithPassword(port, client)
    const data = []
    const shell = await client.requestShell()
    shell.on('data', function(chunk) {
      data.push(chunk)
    })
    shell.write('ls /\n')
    await wait(100)
    shell.end()
    const joinedData = data.join('')
    expect(joinedData).toContain('dev')
    expect(joinedData).toContain('bin')
    expect(joinedData).toContain('etc')
  })
  sshit('creates directories properly', async function(port, client) {
    await connectWithPassword(port, client)
    expect(await exists(getFixturePath('ignored/a/b'))).toBe(false)
    await client.mkdir(getFixturePath('ignored/a/b'))
    expect(await exists(getFixturePath('ignored/a/b'))).toBe(true)
  })
})
