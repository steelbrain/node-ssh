// @flow

import fs from 'fs'
import path from 'path'
import { Socket } from 'net'
import test from 'ava'

import { PRIVATE_KEY_PATH, PRIVATE_KEY_PPK_PATH } from './helpers'
import NodeSSH from '../src'

async function normalizeConfig(config: any) {
  return new NodeSSH().connect(config)
}

test('throws if neither host or sock is provided', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({})
    },
    null,
    'config.host or config.sock must be provided',
  )
})
test('throws if sock is not valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: 1,
      })
    },
    null,
    'config.sock must be a valid object',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: 'hey',
      })
    },
    null,
    'config.sock must be a valid object',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: '',
      })
    },
    null,
    'config.sock must be a valid object',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: null,
      })
    },
    null,
    'config.sock must be a valid object',
  )
})
test('does not throw if sock is valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        sock: new Socket(),
      })
    },
    null,
    'asd',
  )
})
test('throws if host is not valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 2,
      })
    },
    null,
    'config.host must be a valid string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: NaN,
      })
    },
    null,
    'config.host must be a valid string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: null,
      })
    },
    null,
    'config.host must be a valid string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: {},
      })
    },
    null,
    'config.host must be a valid string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: '',
      })
    },
    null,
    'config.host must be a valid string',
  )
})
test('does not throw if host is valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if username is not present', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if username is not valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: {},
      })
    },
    null,
    'config.username must be a valid string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 2,
      })
    },
    null,
    'config.username must be a valid string',
  )
})
test('does not throw if username is valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'steel',
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if password is not present', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'stee',
        host: 'localhost',
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if password is invalid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        password: 1,
      })
    },
    null,
    'config.password must be a string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        password: {},
      })
    },
    null,
    'config.password must be a string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        password() {
          // No Op
        },
      })
    },
    null,
    'config.password must be a string',
  )
})
test('does not throw if password is valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'asd',
        password: 'pass',
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if privateKey is not present', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'asd',
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if privateKey is invalid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: 1,
      })
    },
    null,
    'config.privateKey must be a string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: {},
      })
    },
    null,
    'config.privateKey must be a string',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey() {
          // No Op
        },
      })
    },
    null,
    'config.privateKey must be a string',
  )
})
test('throws if privateKey is a file and does not exist', async function(t) {
  const keyPath = path.join(__dirname, 'fixtures', 'non-existent.pub')
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: keyPath,
      })
    },
    null,
    `config.privateKey does not exist at given fs path`,
  )
})
test('does not throw if privateKey is valid', async function(t) {
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: fs.readFileSync(PRIVATE_KEY_PPK_PATH, 'utf8'),
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
  await t.throwsAsync(
    async function() {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: PRIVATE_KEY_PATH,
      })
    },
    null,
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
