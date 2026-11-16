// Runs the scenarios in ./scenarios against OpenSSH in Docker and writes their console output to sessions.json.
// Usage: node recordings/record.mjs <directory of a built node-ssh checkout>
// NODE_SSH_LABEL sets the "nodeSsh" field (default: git commit and branch, or the package.json version).

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RECORDINGS = path.dirname(fileURLToPath(import.meta.url))
const IMAGE = 'node-ssh-recording'
const CONTAINER = `node-ssh-recording-${process.pid}`
const REMOTE_SITE = '/var/www/site'

// The order of sessions in sessions.json
const SESSION_ORDER = ['run-command', 'stream-abort', 'timeout', 'upload', 'escaping', 'error-message']
// The order they run in: timeout checks that no sleep process is left, and the log writer runs sleep
const RUN_ORDER = ['run-command', 'timeout', 'stream-abort', 'upload', 'escaping', 'error-message']

// ./dist in the work dir of the upload and error-message scenarios
const SITE = {
  'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Example</title>
    <link rel="stylesheet" href="/assets/app.css" />
    <script src="/assets/app.js" defer></script>
  </head>
  <body>
    <header><img src="/assets/logo.svg" alt="Example" width="32" height="32" /></header>
    <main>
      <h1>Example</h1>
      <p><a href="/pricing/">Pricing</a> <a href="/about/">About</a></p>
    </main>
  </body>
</html>
`,
  'about/index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>About - Example</title>
    <link rel="stylesheet" href="/assets/app.css" />
  </head>
  <body>
    <main>
      <h1>About</h1>
      <p>We are a small team. Write to us at <a href="mailto:hello@example.com">hello@example.com</a>.</p>
    </main>
  </body>
</html>
`,
  'assets/app.css': `body {
  margin: 0 auto;
  max-width: 40rem;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

a {
  color: #1d4ed8;
}
`,
  'assets/app.js': `for (const link of document.querySelectorAll('a[href^="http"]')) {
  link.target = '_blank'
}
`,
  'assets/logo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#1d4ed8"/></svg>
`,
}
// assets/app.js after the previous upload
const CHANGED_APP_JS = `for (const link of document.querySelectorAll('a[href^="http"]')) {
  link.target = '_blank'
  link.rel = 'noopener'
}
`

const ACCESS_LOG_LINE = /^\d\d:\d\d:\d\d (203\.0\.113|198\.51\.100)\.\d+ GET \S+ (200|304) \d+\n$/

const SCENARIOS = {
  'run-command': {
    check: ([deployed, missing, ...rest]) => [
      expect(
        /code: 0,/.test(deployed?.text) && /'[0-9a-f]{7} Update pricing page'/.test(deployed?.text),
        'git log',
        deployed,
      ),
      expect(/code: 2,/.test(missing?.text) && /No such file or directory/.test(missing?.text), 'ls', missing),
      expect(rest.length === 0, 'no more output', rest),
    ],
  },
  timeout: {
    setup() {
      // The scenario checks with pgrep that the sleep it started is gone
      const { status } = dockerExec(['pgrep', '-x', 'sleep'], { allowFailure: true })
      if (status !== 1) throw new Error('A sleep process is running in the container before the timeout scenario')
    },
    check: ([timedOut, after, gone, ...rest]) => {
      const match = /^rejected after (\d+)ms\n$/.exec(after?.text ?? '')
      return [
        expect(timedOut?.text === 'ETIMEDOUT Command timed out after 2000ms\n', 'ETIMEDOUT', timedOut),
        expect(match != null && Number(match[1]) >= 2000 && Number(match[1]) < 2500, 'rejected after about 2s', after),
        expect(gone?.text === 'sleep is no longer running\n', 'sleep is no longer running', gone),
        expect(rest.length === 0, 'no more output', rest),
      ]
    },
  },
  'stream-abort': {
    setup() {
      dockerExec(['/usr/local/sbin/access-log-writer.sh'], { detach: true })
    },
    teardown() {
      dockerExec(['pkill', '-f', 'access-log-writer'], { allowFailure: true })
      waitFor('the access log writer to stop', () => {
        const writer = dockerExec(['pgrep', '-f', 'access-log-writer'], { allowFailure: true }).status
        const sleep = dockerExec(['pgrep', '-x', 'sleep'], { allowFailure: true }).status
        return writer === 1 && sleep === 1
      })
    },
    check: (events) => {
      const lines = events.slice(0, -1)
      const last = events.at(-1)
      return [
        expect(lines.length >= 4, 'at least four log lines', lines),
        expect(
          lines.every((event) => event.stream === 'stdout' && ACCESS_LOG_LINE.test(event.text)),
          'log lines',
          lines,
        ),
        expect(last?.text === 'AbortError\n' && last.t >= 3000 && last.t < 3500, 'AbortError after 3s', last),
      ]
    },
  },
  upload: {
    setup(context) {
      dockerExec(['sh', '-c', `rm -rf ${REMOTE_SITE}/* ${REMOTE_SITE}/.[!.]*`], { user: 'deploy' })
      // The previous upload: files last changed two hours ago
      const previous = Math.floor(Date.now() / 1000) - 2 * 60 * 60
      writeSite(context.workDir, previous)
      runProgram(context, "await ssh.putDirectory('./dist', '/var/www/site', { skipUnchanged: true })", {
        record: false,
      })
      // Then assets/app.js changes
      const appJs = path.join(context.workDir, 'dist/assets/app.js')
      fs.writeFileSync(appJs, CHANGED_APP_JS)
      const changed = Math.floor(fs.statSync(appJs).mtimeMs / 1000)
      if (changed <= previous) throw new Error('assets/app.js did not get a later modification time')

      const remote = dockerExec(['find', REMOTE_SITE, '-type', 'f', '-printf', '%T@ %P\\n']).stdout
      const remoteTimes = new Map(
        remote
          .trim()
          .split('\n')
          .map((line) => line.split(' ').reverse()),
      )
      for (const file of Object.keys(SITE)) {
        if (Math.floor(Number(remoteTimes.get(file))) !== previous) {
          throw new Error(`The previous upload did not set the modification time of ${file}: ${remote}`)
        }
      }
    },
    check: (events) => {
      const expected = Object.keys(SITE)
        .map((file) => `${file === 'assets/app.js' ? 'uploaded' : 'unchanged'} ${REMOTE_SITE}/${file}\n`)
        .sort()
      const texts = events.map((event) => event.text).sort()
      return [expect(JSON.stringify(texts) === JSON.stringify(expected), 'four unchanged, app.js uploaded', events)]
    },
  },
  escaping: {
    check: (events) => [
      expect(
        JSON.stringify(events.map((event) => event.text)) ===
          JSON.stringify(['$HOME; echo injected\n', '/home/deploy\ninjected\n']),
        'echo output',
        events,
      ),
    ],
  },
  'error-message': {
    setup(context) {
      writeSite(context.workDir)
      dockerExec(['test', '-d', REMOTE_SITE])
    },
    check: (events) => [
      expect(
        events.length === 1 &&
          events[0].text ===
            'Failure: /var/www/site is a directory, pass the path of the file to write (such as /var/www/site/index.html)\n',
        'error message',
        events,
      ),
    ],
  },
}

function expect(ok, description, actual) {
  return ok ? null : `expected ${description}, got ${JSON.stringify(actual)}`
}

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}: ${result.stderr.trim()}`)
  }
  return result
}

function dockerExec(args, { user = 'root', detach = false, allowFailure = false } = {}) {
  return run('docker', ['exec', ...(detach ? ['-d'] : []), '-u', user, CONTAINER, ...args], { allowFailure })
}

function waitFor(description, predicate, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100)
  }
}

// Resolves once the server sends its SSH identification line
function waitForSsh(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, '127.0.0.1')
      let banner = ''
      const retry = () => {
        socket.destroy()
        if (Date.now() > deadline) reject(new Error('The SSH server did not start'))
        else setTimeout(attempt, 200)
      }
      socket.setTimeout(2000, retry)
      socket.on('error', retry)
      socket.on('close', () => {
        if (!banner.startsWith('SSH-')) retry()
      })
      socket.on('data', (data) => {
        banner += data.toString('latin1')
        if (banner.startsWith('SSH-')) {
          socket.removeAllListeners('close')
          socket.destroy()
          resolve()
        }
      })
    }
    attempt()
  })
}

function writeSite(workDir, mtime = null) {
  for (const [file, contents] of Object.entries(SITE)) {
    const target = path.join(workDir, 'dist', file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, contents)
    if (mtime != null) fs.utimesSync(target, mtime, mtime)
  }
}

// connect preamble + body + ssh.dispose(). With record, stdout and stderr writes made while the body runs are
// saved with the time since the body started.
function generateProgram(body, { port, keyPath, recordingPath }) {
  const recorder =
    recordingPath == null
      ? ''
      : `
const __recording = { start: null, end: null, outside: [], events: [] }
for (const __stream of ['stdout', 'stderr']) {
  const __write = process[__stream].write.bind(process[__stream])
  process[__stream].write = (chunk, ...rest) => {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
    if (__recording.start != null && __recording.end == null) {
      __recording.events.push({ t: Math.round(performance.now() - __recording.start), stream: __stream, text })
    } else {
      __recording.outside.push({ stream: __stream, text })
    }
    return __write(chunk, ...rest)
  }
}
process.on('exit', () => {
  writeFileSync(${JSON.stringify(recordingPath)}, JSON.stringify(__recording))
})
`
  return `import { writeFileSync } from 'node:fs'

import { NodeSSH } from 'node-ssh'
${recorder}
const ssh = new NodeSSH()
await ssh.connect({
  host: '127.0.0.1',
  port: ${port},
  username: 'deploy',
  privateKeyPath: ${JSON.stringify(keyPath)},
})
${recordingPath == null ? '' : '__recording.start = performance.now()'}

${body}

${recordingPath == null ? '' : '__recording.end = performance.now()'}
ssh.dispose()
`
}

function runProgram(context, body, { record }) {
  const programPath = path.join(context.workDir, record ? 'recorded.mjs' : 'setup.mjs')
  const recordingPath = record ? path.join(context.workDir, 'recording.json') : null
  fs.writeFileSync(programPath, generateProgram(body, { ...context, recordingPath }))
  const env = { ...process.env, NO_COLOR: '1' }
  delete env.FORCE_COLOR
  delete env.NODE_OPTIONS
  const result = spawnSync(process.execPath, [programPath], {
    cwd: context.workDir,
    env,
    encoding: 'utf8',
    timeout: 60000,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${path.basename(programPath)} exited with ${result.status ?? result.signal}:\n${result.stdout}${result.stderr}`,
    )
  }
  if (!record) return null
  const recording = JSON.parse(fs.readFileSync(recordingPath, 'utf8'))
  if (recording.outside.length > 0) {
    throw new Error(`Output outside the scenario body: ${JSON.stringify(recording.outside)}`)
  }
  return { events: recording.events, durationMs: Math.round(recording.end - recording.start) }
}

function nodeSshLabel(nodeSshDir) {
  if (process.env.NODE_SSH_LABEL) return process.env.NODE_SSH_LABEL
  const { version } = JSON.parse(fs.readFileSync(path.join(nodeSshDir, 'package.json'), 'utf8'))
  const git = (...args) => run('git', ['-C', nodeSshDir, ...args], { allowFailure: true }).stdout.trim()
  if (fs.existsSync(path.join(nodeSshDir, '.git'))) {
    return `${git('rev-parse', '--short', 'HEAD')} (${git('rev-parse', '--abbrev-ref', 'HEAD')}, package.json ${version})`
  }
  return `package.json ${version}`
}

// Local details that must not end up in sessions.json
function assertPrivate(json, context) {
  const username = os.userInfo().username
  const hostname = os.hostname()
  const forbidden = [
    username,
    hostname,
    hostname.split('.')[0],
    os.homedir(),
    context.root,
    fs.realpathSync(context.root),
    context.keyPath,
    context.nodeSshDir,
    '/Users/',
    '/var/folders',
    '/private/',
    '/tmp/',
  ]
  const found = forbidden.filter((needle) => needle && json.toLowerCase().includes(needle.toLowerCase()))
  if (found.length > 0) throw new Error(`sessions.json would contain local details: ${found.join(', ')}`)
}

function cleanUp(context) {
  run('docker', ['rm', '--force', '--volumes', CONTAINER], { allowFailure: true })
  if (context.root) fs.rmSync(context.root, { recursive: true, force: true })
}

async function main() {
  const nodeSshArg = process.argv[2]
  if (!nodeSshArg) {
    console.error('Usage: node recordings/record.mjs <directory of a built node-ssh checkout>')
    process.exit(1)
  }
  const nodeSshDir = fs.realpathSync(nodeSshArg)
  if (!fs.existsSync(path.join(nodeSshDir, 'lib/index.mjs'))) {
    throw new Error(`${nodeSshDir}/lib/index.mjs is missing, run yarn install and yarn build there`)
  }

  const context = { nodeSshDir, root: fs.mkdtempSync(path.join(os.tmpdir(), 'node-ssh-recording-')) }
  process.on('SIGINT', () => {
    cleanUp(context)
    process.exit(130)
  })
  try {
    context.keyPath = path.join(context.root, 'id_ed25519')
    run('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'node-ssh-recording', '-f', context.keyPath])
    const publicKey = fs.readFileSync(`${context.keyPath}.pub`, 'utf8').trim()

    console.log(`Building ${IMAGE}`)
    run('docker', ['build', '--quiet', '--tag', IMAGE, RECORDINGS])
    run('docker', [
      'run',
      '--detach',
      '--rm',
      '--name',
      CONTAINER,
      '--hostname',
      'web-1',
      '--publish',
      '127.0.0.1::22',
      '--env',
      `AUTHORIZED_KEY=${publicKey}`,
      IMAGE,
    ])
    const published = run('docker', ['port', CONTAINER, '22/tcp']).stdout.trim().split('\n')[0]
    context.port = Number(published.slice(published.lastIndexOf(':') + 1))
    await waitForSsh(context.port)

    const sshVersion = dockerExec(['sh', '-c', 'ssh -V 2>&1']).stdout.trim()
    const debianVersion = dockerExec(['cat', '/etc/debian_version']).stdout.trim()

    const recordedAt = new Date().toISOString()
    const sessions = new Map()
    let failed = false
    for (const id of RUN_ORDER) {
      const scenario = SCENARIOS[id]
      const code = fs.readFileSync(path.join(RECORDINGS, 'scenarios', `${id}.mjs`), 'utf8').replace(/\n+$/, '')
      const workDir = path.join(context.root, id)
      fs.mkdirSync(path.join(workDir, 'node_modules'), { recursive: true })
      fs.symlinkSync(nodeSshDir, path.join(workDir, 'node_modules/node-ssh'))
      const scenarioContext = { ...context, workDir }

      console.log(`\n${id}`)
      scenario.setup?.(scenarioContext)
      let result
      try {
        result = runProgram(scenarioContext, code, { record: true })
      } finally {
        scenario.teardown?.(scenarioContext)
      }
      for (const event of result.events) {
        console.log(`  ${String(event.t).padStart(5)}ms ${event.stream} ${JSON.stringify(event.text)}`)
      }
      console.log(`  ${String(result.durationMs).padStart(5)}ms end`)
      const problems = scenario.check(result.events).filter((problem) => problem != null)
      for (const problem of problems) console.log(`  UNEXPECTED: ${problem}`)
      failed ||= problems.length > 0
      sessions.set(id, { id, code, events: result.events, durationMs: result.durationMs })
    }
    if (failed) throw new Error('Some output was not as expected; sessions.json is unchanged')

    const json = `${JSON.stringify(
      {
        recordedAt,
        nodeSsh: nodeSshLabel(nodeSshDir),
        node: process.version,
        server: `${sshVersion}, Debian ${debianVersion}`,
        sessions: SESSION_ORDER.map((id) => sessions.get(id)),
      },
      null,
      2,
    )}\n`
    assertPrivate(json, context)
    fs.writeFileSync(path.join(RECORDINGS, 'sessions.json'), json)
    console.log(`\nWrote ${path.relative(process.cwd(), path.join(RECORDINGS, 'sessions.json'))}`)
  } finally {
    cleanUp(context)
  }
}

await main()
