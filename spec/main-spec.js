/* @flow */

import { it, beforeEach, afterEach } from 'jasmine-fix'
import SSH2 from '../src'
import createServer from './ssh-server'
import { PRIVATE_KEY_PATH } from './helpers'

fdescribe('SSH2', function() {
  let server
  let client

  beforeEach(async function() {
    server = createServer()
    client = new SSH2()
    await new Promise(function(resolve) {
      server.listen(8876, '127.0.0.1', resolve)
    })
  })
  afterEach(async function() {
    client.dispose()
    await new Promise(function(resolve) {
      server.close(resolve)
    })
  })

  it('connects to a server with password', async function() {
    try {
      await client.connect({
        host: '127.0.0.1',
        port: 8876,
        username: 'steel',
        password: 'password',
      })
    } catch (error) {
      expect('Should not have hit').toBe(error)
    }
  })
  it('connects to a server with a private key', async function() {
    try {
      await client.connect({
        host: '127.0.0.1',
        port: 8876,
        username: 'steel',
        privateKey: PRIVATE_KEY_PATH,
      })
    } catch (error) {
      expect('Should not have hit').toBe(error)
    }
  })
})
