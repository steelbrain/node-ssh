// @flow

import fs from 'fs'
import path from 'path'
import { Socket } from 'net'
import test from 'ava'

import * as Helpers from '../lib/helpers'
import { PRIVATE_KEY_PATH } from './helpers'

async function normalizeConfig(config: any) {
  return Helpers.normalizeConfig(config)
}

test('throws if neither host or sock is provided', async function(t) {
  await t.throwsAsync(async function() {
    await normalizeConfig({})
  }, 'config.host or config.sock must be provided')
})
test('throws if sock is not valid', async function(t) {
  await t.throwsAsync(async function() {
    await normalizeConfig({
      sock: 1,
    })
  }, 'config.sock must be a valid object')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      sock: 'hey',
    })
  }, 'config.sock must be a valid object')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      sock: '',
    })
  }, 'config.sock must be a valid object')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      sock: null,
    })
  }, 'config.sock must be a valid object')
})
test('does not throw if sock is valid', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      sock: new Socket(),
    })
  })
})
test('throws if host is not valid', async function(t) {
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 2,
    })
  }, 'config.host must be a valid string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: NaN,
    })
  }, 'config.host must be a valid string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: null,
    })
  }, 'config.host must be a valid string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: {},
    })
  }, 'config.host must be a valid string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: '',
    })
  }, 'config.host must be a valid string')
})
test('does not throw if host is valid', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
    })
  })
})
test('does not throw if username is not present', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
    })
  })
})
test('throws if username is not valid', async function(t) {
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      username: {},
    })
  }, 'config.username must be a valid string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      username: 2,
    })
  }, 'config.username must be a valid string')
})
test('does not throw if username is valid', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      username: 'steel',
    })
  })
})
test('does not throw if password is not present', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
    })
  })
})
test('throws if password is invalid', async function(t) {
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      password: 1,
    })
  }, 'config.password must be a string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      password: {},
    })
  }, 'config.password must be a string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      password() {},
    })
  }, 'config.password must be a string')
})
test('does not throw if password is valid', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      password: 'pass',
    })
  })
})
test('does not throw if privateKey is not present', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
    })
  })
})
test('throws if privateKey is invalid', async function(t) {
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      privateKey: 1,
    })
  }, 'config.privateKey must be a string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      privateKey: {},
    })
  }, 'config.privateKey must be a string')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      privateKey() {},
    })
  }, 'config.privateKey must be a string')
})
test('throws if privateKey is a file and does not exist', async function(t) {
  const keyPath = path.join(__dirname, 'fixtures', 'non-existent.pub')
  await t.throwsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      privateKey: keyPath,
    })
  }, `config.privateKey does not exist at given fs path`)
})
test('does not throw if privateKey is valid', async function(t) {
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
    })
  })
  await t.notThrowsAsync(async function() {
    await normalizeConfig({
      host: 'localhost',
      privateKey: PRIVATE_KEY_PATH,
    })
  })
})
