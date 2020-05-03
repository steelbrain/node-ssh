// @flow

import fs from 'fs'
import path from 'path'
import invariant from 'assert'
import ChildProcess from 'child_process'
import test from 'ava'

import SSH2 from '../lib'
import { exists } from '../lib/helpers'
import createServer from './ssh-server'
import { PRIVATE_KEY_PATH, wait } from './helpers'

let ports = 8876

function getFixturePath(fixturePath: string): string {
  return path.join(__dirname, 'fixtures', fixturePath)
}
function sshit(title: string, callback: (t: Object, port: number, client: SSH2, server: Object) => Promise<void>): void {
  test(title, async function(t) {
    ports += 1

    const server = createServer()
    const client = new SSH2()
    const port = ports
    await new Promise(function(resolve) {
      server.listen(port, '127.0.0.1', resolve)
    })
    try {
      await callback(t, port, client, server)
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
    privateKey: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
  })
}

test.after(function() {
  ChildProcess.exec(`rm -rf ${getFixturePath('ignored/*')}`)
})
test.before(function() {
  ChildProcess.exec(`rm -rf ${getFixturePath('ignored/*')}`)
})

sshit('connects to a server with password', async function(t, port, client) {
  await t.notThrowsAsync(async function() {
    await connectWithPassword(port, client)
  })
})
sshit('connects to a server with a private key', async function(t, port, client) {
  await t.notThrowsAsync(async function() {
    await connectWithPrivateKey(port, client)
  })
})
sshit('connects to a server with an inline private key', async function(t, port, client) {
  await t.notThrowsAsync(async function() {
    await connectWithInlinePrivateKey(port, client)
  })
})
sshit('requests a shell that works', async function(t, port, client) {
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
  t.regex(joinedData, /ls \//)
})

sshit('creates directories with sftp properly', async function(t, port, client) {
  await connectWithPassword(port, client)
  t.is(await exists(getFixturePath('ignored/a/b')), false)
  await client.mkdir(getFixturePath('ignored/a/b'), 'sftp')
  t.is(await exists(getFixturePath('ignored/a/b')), true)
})
sshit('creates directories with exec properly', async function(t, port, client) {
  await connectWithPassword(port, client)
  t.is(await exists(getFixturePath('ignored/a/b')), false)
  await client.mkdir(getFixturePath('ignored/a/b'), 'exec')
  t.is(await exists(getFixturePath('ignored/a/b')), true)
})
sshit('throws error when it cant create directories', async function(t, port, client) {
  await connectWithPassword(port, client)
  try {
    await client.mkdir('/etc/passwd/asdasdasd')
    t.is(false, true)
  } catch (_) {
    t.is(_.message.indexOf('ENOTDIR: not a directory') !== -1, true)
  }
})
sshit('exec with correct escaped parameters', async function(t, port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('echo', ['$some', 'S\\Thing', '"Yo"'])
  t.is(result, '$some S\\Thing "Yo"')
})
sshit('exec with correct cwd', async function(t, port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('pwd', [], { cwd: '/etc' })
  t.is(result, '/etc')
})
sshit('throws if stream is stdout and stuff is written to stderr', async function(t, port, client) {
  await connectWithPassword(port, client)
  try {
    await client.exec('node', ['-e', 'console.error("Test")'])
    t.is(false, true)
  } catch (_) {
    t.is(_.message, 'Test')
  }
})
sshit('does not throw if stream is stderr and is written to', async function(t, port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('node', ['-e', 'console.error("Test")'], { stream: 'stderr' })
  t.is(result, 'Test')
})
sshit('returns both streams if asked to', async function(t, port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('node', ['-e', 'console.log("STDOUT"); console.error("STDERR")'], { stream: 'both' })
  invariant(typeof result === 'object' && result)
  t.is(result.stdout, 'STDOUT')
  // STDERR tests are flaky on CI
  if (!process.env.CI) {
    t.is(result.stderr, 'STDERR')
  }
})
sshit('writes to stdin properly', async function(t, port, client) {
  await connectWithPassword(port, client)
  const result = await client.exec('node', ['-e', 'process.stdin.pipe(process.stdout)'], { stdin: 'Twinkle!\nStars!' })
  t.is(result, 'Twinkle!\nStars!')
})
sshit('gets files properly', async function(t, port, client) {
  await connectWithPassword(port, client)
  const sourceFile = __filename
  const targetFile = getFixturePath('ignored/test-get')
  t.is(await exists(targetFile), false)
  await client.getFile(targetFile, sourceFile)
  t.is(await exists(targetFile), true)
  t.is(fs.readFileSync(targetFile, 'utf8').trim(), fs.readFileSync(sourceFile, 'utf8').trim())
})
sshit('puts files properly', async function(t, port, client) {
  await connectWithPassword(port, client)
  const sourceFile = __filename
  const targetFile = getFixturePath('ignored/test-get')
  t.is(await exists(targetFile), false)
  await client.putFile(sourceFile, targetFile)
  t.is(await exists(targetFile), true)
  t.is(fs.readFileSync(targetFile, 'utf8').trim(), fs.readFileSync(sourceFile, 'utf8').trim())
})
sshit('puts multiple files properly', async function(t, port, client) {
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
  const existsBefore = await Promise.all(files.map(file => exists(file.remote)))
  t.is(existsBefore.every(Boolean), false)
  await client.putFiles(files)
  const existsAfter = await Promise.all(files.map(file => exists(file.remote)))
  t.is(existsAfter.every(Boolean), true)
})
sshit('puts entire directories at once', async function(t, port, client) {
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
  const existsBefore = await Promise.all(remoteFiles.map(file => exists(file)))
  t.is(existsBefore.every(Boolean), false)
  let ticks = 0
  await client.putDirectory(getFixturePath('multiple'), getFixturePath('ignored'), {
    tick(local, remote, error) {
      t.is(error, null)
      t.is(remoteFiles.indexOf(remote) !== -1, true)
      ticks += 1
    },
  })
  t.is(ticks, remoteFiles.length)
  const existsAfter = await Promise.all(remoteFiles.map(file => exists(file)))
  t.is(existsAfter.every(Boolean), true)
})
sshit('allows stream callbacks on exec', async function(t, port, client) {
  await connectWithPassword(port, client)
  const outputFromCallbacks = { stdout: [], stderr: [] }
  await client.exec('node', [getFixturePath('test-program')], {
    stream: 'both',
    onStderr(chunk) {
      outputFromCallbacks.stderr.push(chunk)
    },
    onStdout(chunk) {
      outputFromCallbacks.stdout.push(chunk)
    },
  })
  t.is(outputFromCallbacks.stdout.join('').trim(), 'STDOUT')
  // STDERR tests are flaky on CI
  if (!process.env.CI) {
    t.is(outputFromCallbacks.stderr.join('').trim(), 'STDERR')
  }
})
sshit('allows stream callbacks on execCommand', async function(t, port, client) {
  await connectWithPassword(port, client)
  const outputFromCallbacks = { stdout: [], stderr: [] }
  await client.execCommand(`node ${getFixturePath('test-program')}`, {
    stream: 'both',
    onStderr(chunk) {
      outputFromCallbacks.stderr.push(chunk)
    },
    onStdout(chunk) {
      outputFromCallbacks.stdout.push(chunk)
    },
  })
  t.is(outputFromCallbacks.stdout.join('').trim(), 'STDOUT')
  // STDERR tests are flaky on CI
  if (!process.env.CI) {
    t.is(outputFromCallbacks.stderr.join('').trim(), 'STDERR')
  }
})
