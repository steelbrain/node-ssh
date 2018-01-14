/* @flow */

import FS from 'fs'
import Path from 'path'
import { Socket } from 'net'
import { it } from 'jasmine-fix'
import * as Helpers from '../src/helpers'
import { PRIVATE_KEY_PATH, expectToThrow } from './helpers'

describe('Helpers', function() {
  describe('normalizeConfig', function() {
    async function normalizeConfig(config: any) {
      return Helpers.normalizeConfig(config)
    }

    it('throws if neither host or sock is provided', async function() {
      await expectToThrow(async function() {
        await normalizeConfig({})
      }, 'config.host or config.sock must be provided')
    })
    it('throws if sock is not valid', async function() {
      await expectToThrow(async function() {
        await normalizeConfig({
          sock: 1,
        })
      }, 'config.sock must be a valid object')
      await expectToThrow(async function() {
        await normalizeConfig({
          sock: 'hey',
        })
      }, 'config.sock must be a valid object')
      await expectToThrow(async function() {
        await normalizeConfig({
          sock: '',
        })
      }, 'config.sock must be a valid object')
      await expectToThrow(async function() {
        await normalizeConfig({
          sock: null,
        })
      }, 'config.sock must be a valid object')
    })
    it('does not throw if sock is valid', async function() {
      await normalizeConfig({
        sock: new Socket(),
      })
    })
    it('throws if host is not valid', async function() {
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 2,
        })
      }, 'config.host must be a valid string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: NaN,
        })
      }, 'config.host must be a valid string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: null,
        })
      }, 'config.host must be a valid string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: {},
        })
      }, 'config.host must be a valid string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: '',
        })
      }, 'config.host must be a valid string')
    })
    it('does not throw if host is valid', async function() {
      await normalizeConfig({
        host: 'localhost',
      })
    })
    it('does not throw if username is not present', async function() {
      await normalizeConfig({
        host: 'localhost',
      })
    })
    it('throws if username is not valid', async function() {
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          username: {},
        })
      }, 'config.username must be a valid string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          username: 2,
        })
      }, 'config.username must be a valid string')
    })
    it('does not throw if username is valid', async function() {
      await normalizeConfig({
        host: 'localhost',
        username: 'steel',
      })
    })
    it('does not throw if password is not present', async function() {
      await normalizeConfig({
        host: 'localhost',
      })
    })
    it('throws if password is invalid', async function() {
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          password: 1,
        })
      }, 'config.password must be a string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          password: {},
        })
      }, 'config.password must be a string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          password() {},
        })
      }, 'config.password must be a string')
    })
    it('does not throw if password is valid', async function() {
      await normalizeConfig({
        host: 'localhost',
        password: 'pass',
      })
    })
    it('does not throw if privateKey is not present', async function() {
      await normalizeConfig({
        host: 'localhost',
      })
    })
    it('throws if privateKey is invalid', async function() {
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          privateKey: 1,
        })
      }, 'config.privateKey must be a string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          privateKey: {},
        })
      }, 'config.privateKey must be a string')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          privateKey() {},
        })
      }, 'config.privateKey must be a string')
    })
    it('throws if privateKey is a file and does not exist', async function() {
      const keyPath = Path.join(__dirname, 'fixtures', 'non-existent.pub')
      await expectToThrow(async function() {
        await normalizeConfig({
          host: 'localhost',
          privateKey: keyPath,
        })
      }, `config.privateKey does not exist at ${keyPath}`)
    })
    it('does not throw if privateKey is valid', async function() {
      await normalizeConfig({
        host: 'localhost',
        privateKey: FS.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      })
      await normalizeConfig({
        host: 'localhost',
        privateKey: PRIVATE_KEY_PATH,
      })
    })
  })
})
