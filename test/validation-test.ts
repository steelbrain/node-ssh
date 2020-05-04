import fs from 'fs'
import path from 'path'
import { Socket } from 'net'
import test, { ExecutionContext } from 'ava'

import { PRIVATE_KEY_PATH, PRIVATE_KEY_PPK_PATH } from './helpers'
import NodeSSH from '../src'

async function normalizeConfig(config: any) {
  return new NodeSSH().connect(config)
}

async function throwsAsync(t: ExecutionContext<unknown>, callback: () => Promise<void>, message: string): Promise<void> {
  try {
    await callback()
    t.fail('Test did not throw')
  } catch (err) {
    t.is(err.message, message)
  }
}

test('throws if neither host or sock is provided', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asdasd',
      })
    },
    'Either config.host or config.sock must be provided',
  )
})
test('throws if sock is not valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: 1,
      })
    },
    'config.sock must be a valid object',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: 'hey',
      })
    },
    'config.sock must be a valid object',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: '',
      })
    },
    'config.sock must be a valid object',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: null,
      })
    },
    'Either config.host or config.sock must be provided',
  )
})
test('does not throw if sock is valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: new Socket(),
      })
    },
    'Socket is closed',
  )
})
test('throws if host is not valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 2,
      })
    },
    'config.host must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: NaN,
      })
    },
    'config.host must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: null,
      })
    },
    'Either config.host or config.sock must be provided',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: {},
      })
    },
    'config.host must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: '',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if host is valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if username is not present', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if username is not valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: {},
      })
    },
    'config.username must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 2,
      })
    },
    'config.username must be a valid string',
  )
})
test('does not throw if username is valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'steel',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if password is not present', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'stee',
        host: 'localhost',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if password is invalid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'asdasd',
        password: 1,
      })
    },
    'config.password must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'asdasd',
        password: {},
      })
    },
    'config.password must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'asdasd',
        password() {
          // No Op
        },
      })
    },
    'config.password must be a valid string',
  )
})
test('does not throw if password is valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'asd',
        password: 'pass',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if privateKey is not present', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'asd',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if privateKey is invalid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: 1,
      })
    },
    'config.privateKey must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: {},
      })
    },
    'config.privateKey must be a valid string',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey() {
          // No Op
        },
      })
    },
    'config.privateKey must be a valid string',
  )
})
test('throws if privateKey is a file and does not exist', async function(t) {
  const keyPath = path.join(__dirname, 'fixtures', 'non-existent.pub')
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: keyPath,
      })
    },
    `config.privateKey does not exist at given fs path`,
  )
})
test('does not throw if privateKey is valid', async function(t) {
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: fs.readFileSync(PRIVATE_KEY_PPK_PATH, 'utf8'),
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
  await throwsAsync(
    t,
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: PRIVATE_KEY_PATH,
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
