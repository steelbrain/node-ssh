import dns from 'dns'
import fs from 'fs'
import net, { Socket } from 'net'
import path from 'path'
import { expect, test } from 'vitest'

import { Config, NodeSSH } from '../src'
import { PRIVATE_KEY_PATH, PRIVATE_KEY_PPK_PATH } from './helpers'

// Since Node.js 20, connecting to 'localhost' tries both ::1 and 127.0.0.1 and a refused
// connection rejects with an AggregateError whose message is empty. Connect to 127.0.0.1
// only, so the tests below see 'connect ECONNREFUSED 127.0.0.1:22'.
dns.setDefaultResultOrder('ipv4first')
net.setDefaultAutoSelectFamily(false)

async function normalizeConfig(config: Config) {
  return new NodeSSH().connect(config)
}

async function throwsAsync(callback: () => Promise<void>, message: string): Promise<void> {
  await expect(callback()).rejects.toHaveProperty('message', message)
}

test('throws if neither host or sock is provided', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asdasd',
      })
    },
    'Either config.host or config.sock must be provided',
  )
})
test('throws if sock is not valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        sock: 1,
      } as never)
    },
    'config.sock must be a valid object',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        sock: 'hey',
      } as never)
    },
    'config.sock must be a valid object',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        sock: '',
      } as never)
    },
    'config.sock must be a valid object',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        sock: null,
      } as never)
    },
    'Either config.host or config.sock must be provided',
  )
})
test('does not throw if sock is valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        sock: new Socket(),
      })
    },
    'Socket is closed',
  )
})
test('throws if host is not valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 2,
      } as never)
    },
    'config.host must be a valid string',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: NaN,
      } as never)
    },
    'config.host must be a valid string',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: null,
      } as never)
    },
    'Either config.host or config.sock must be provided',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: {},
      } as never)
    },
    'config.host must be a valid string',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: '',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if host is valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if username is not present', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if username is not valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: {},
      } as never)
    },
    'config.username must be a valid string',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: 2,
      } as never)
    },
    'config.username must be a valid string',
  )
})
test('does not throw if username is valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: 'steel',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if password is not present', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'stee',
        host: 'localhost',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if password is invalid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: 'asdasd',
        password: 1,
      } as never)
    },
    'config.password must be a valid string',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: 'asdasd',
        password: {},
      } as never)
    },
    'config.password must be a valid string',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: 'asdasd',
        password() {
          // No Op
        },
      } as never)
    },
    'config.password must be a valid string',
  )
})
test('does not throw if password is valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: 'asd',
        password: 'pass',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('does not throw if privateKey is not present', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        host: 'localhost',
        username: 'asd',
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
test('throws if privateKey is invalid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: 1,
      } as never)
    },
    'config.privateKey must be a valid string or Buffer',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: {},
      } as never)
    },
    'config.privateKey must be a valid string or Buffer',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey() {
          // No Op
        },
      } as never)
    },
    'config.privateKey must be a valid string or Buffer',
  )
})
test('throws if privateKey is a file and does not exist', async function () {
  const keyPath = path.join(__dirname, 'fixtures', 'non-existent.pub')
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKeyPath: keyPath,
      })
    },
    `config.privateKeyPath does not exist at given fs path`,
  )
})
test('throws if privateKey is specified and so is privateKeyPath', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: 'x',
        privateKeyPath: 'y',
      })
    },
    `config.privateKeyPath must not be specified when config.privateKey is specified`,
  )
})
test('does not throw if privateKey is valid', async function () {
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKey: fs.readFileSync(PRIVATE_KEY_PPK_PATH, 'utf8'),
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
  await throwsAsync(
    async function () {
      await normalizeConfig({
        username: 'asd',
        host: 'localhost',
        privateKeyPath: PRIVATE_KEY_PATH,
      })
    },
    'connect ECONNREFUSED 127.0.0.1:22',
  )
})
