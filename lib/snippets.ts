// Code samples in the guide. Apart from the connect samples, they use an ssh that is already connected.

export const CONNECT_KEY_FILE = `import { NodeSSH } from 'node-ssh'

const ssh = new NodeSSH()
await ssh.connect({
  host: 'web-1.example.com',
  username: 'deploy',
  privateKeyPath: '/home/you/.ssh/id_ed25519',
})`

export const CONNECT_KEY = `await ssh.connect({
  host: 'web-1.example.com',
  username: 'deploy',
  // The key itself, as a string or a Buffer
  privateKey: process.env.DEPLOY_KEY,
  // Only needed for an encrypted key
  passphrase: process.env.DEPLOY_KEY_PASSPHRASE,
})`

export const CONNECT_PASSWORD = `await ssh.connect({
  host: 'web-1.example.com',
  username: 'deploy',
  password: process.env.DEPLOY_PASSWORD,
  // Also answer keyboard-interactive prompts that ask for a password
  tryKeyboard: true,
})`

export const CONNECT_COMMONJS = `const { NodeSSH } = require('node-ssh')

const ssh = new NodeSSH()
ssh
  .connect({ host: 'web-1.example.com', username: 'deploy', privateKeyPath: '/home/you/.ssh/id_ed25519' })
  .then(() => ssh.execCommand('uptime'))
  .then((result) => console.log(result.stdout))
  .finally(() => ssh.dispose())`

export const KEYBOARD_INTERACTIVE = `const password = process.env.DEPLOY_PASSWORD

await ssh.connect({
  host: 'web-1.example.com',
  username: 'deploy',
  tryKeyboard: true,
  onKeyboardInteractive(name, instructions, lang, prompts, finish) {
    // One response per prompt
    finish(prompts.map(() => password))
  },
})`

export const CONNECT_RETRY = `try {
  await ssh.connect({ host: 'web-1.example.com', username: 'deploy', privateKeyPath: '/home/you/.ssh/id_ed25519' })
} catch (error) {
  if (error.level !== 'client-authentication') throw error
  // askForPassword: however your program asks
  await ssh.connect({ host: 'web-1.example.com', username: 'deploy', password: await askForPassword() })
}`

export const COMMANDS = `const { stdout, stderr, code } = await ssh.execCommand('npm ci --omit=dev', { cwd: '~/site' })
if (code !== 0) {
  throw new Error(\`npm ci exited with code \${code}: \${stderr}\`)
}

// Each parameter is escaped, so the spaces and parentheses reach ls as written
const listing = await ssh.exec('ls', ['-l', '/var/www/uploads/Q3 report (final).pdf'])

// stdin can be a string or a readable stream
await ssh.execCommand('cat > ~/site/.env', { stdin: 'PORT=3000\\n' })`

export const EXEC_STREAMS = `// Resolves with stdout, and rejects if the command wrote anything to stderr
const branch = await ssh.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: '~/site' })

// git fetch reports progress on stderr, so ask for both streams
const result = await ssh.exec('git', ['fetch', '--prune'], { cwd: '~/site', stream: 'both' })`

export const PROMPTS_STDIN = `// ./setup.sh asks for a user name and a password
const result = await ssh.execCommand('./setup.sh', { stdin: 'alice\\nsecret\\n' })`

export const PROMPTS_PTY = `import { PassThrough } from 'node:stream'

const answers = [
  ['Username:', 'alice\\n'],
  ['Password:', 'secret\\n'],
]
const stdin = new PassThrough()
let output = ''
const result = await ssh.execCommand('./setup.sh', {
  execOptions: { pty: true },
  stdin,
  onStdout(chunk) {
    output += chunk
    while (answers.length > 0 && output.includes(answers[0][0])) {
      stdin.write(answers.shift()[1])
      if (answers.length === 0) stdin.end()
    }
  },
})`

export const TIMEOUT = `try {
  const result = await ssh.execCommand('./build.sh', { cwd: '~/site', timeout: 5000 })
  console.log(result.stdout)
} catch (error) {
  if (error.code !== 'ETIMEDOUT') throw error
  console.log('build.sh did not finish within 5 seconds')
}`

export const ABORT = `const controller = new AbortController()
const tail = ssh.execCommand('tail -f /var/log/app/access.log', {
  signal: controller.signal,
  onStdout(chunk) {
    process.stdout.write(chunk)
  },
})

// later
controller.abort()
await tail.catch((error) => console.log(error.name)) // AbortError`

export const LARGE_OUTPUT = `import fs from 'node:fs'

const file = fs.createWriteStream('./access.log')
await ssh.execCommand('cat /var/log/app/access.log', {
  noBuffer: true,
  onStdout(chunk) {
    file.write(chunk)
  },
})
file.end()`

export const FILES = `// Local path first, then remote path, in both directions
await ssh.putFile('./dist/index.html', '/var/www/site/index.html')
await ssh.getFile('./backups/app.db', '/var/lib/app/app.db')

await ssh.putFiles([
  { local: './dist/index.html', remote: '/var/www/site/index.html' },
  { local: './dist/assets/app.js', remote: '/var/www/site/assets/app.js' },
])`

export const DIRECTORY = `import path from 'node:path'

const failed = []
const ok = await ssh.putDirectory('./dist', '/var/www/site', {
  concurrency: 4,
  // Replaces the default, which leaves out names that start with a dot
  validate: (itemPath) => !path.basename(itemPath).startsWith('.') && !itemPath.endsWith('.map'),
  tick(localFile, remoteFile, error) {
    if (error) failed.push(localFile)
  },
})
console.log(ok ? 'uploaded everything' : \`failed: \${failed.join(', ')}\`)`

export const ATOMIC = `await ssh.putFile('./dist/index.html', '/var/www/site/index.html', null, null, { atomic: true })
await ssh.putDirectory('./dist', '/var/www/site', { atomic: true })`

export const SKIP_UNCHANGED = `await ssh.putDirectory('./dist', '/var/www/site', {
  skipUnchanged: true,
  tick(localFile, remoteFile, error, skipped) {
    if (error) {
      console.log('failed', localFile)
    } else if (skipped) {
      console.log('unchanged', localFile)
    } else {
      console.log('uploaded', localFile)
    }
  },
})`

export const REUSE_SFTP = `await ssh.withSFTP(async (sftp) => {
  for (const name of ['index.html', 'about/index.html', 'assets/app.css']) {
    await ssh.putFile(\`./dist/\${name}\`, \`/var/www/site/\${name}\`, sftp)
  }
})`

export const MKDIR = `// Creates /var/www/releases and /var/www/releases/42 if they are missing
await ssh.mkdir('/var/www/releases/42')`

export const SHELL = `// false: no pseudo-terminal, so the output has no prompt or echo
await ssh.withShell(async (shell) => {
  shell.end('cd ~/site && git log -1 --oneline\\n')
  for await (const chunk of shell) {
    process.stdout.write(chunk)
  }
}, false)`

export const SFTP = `await ssh.withSFTP(async (sftp) => {
  const entries = await new Promise((resolve, reject) => {
    sftp.readdir('/var/www/site', (error, list) => (error ? reject(error) : resolve(list)))
  })
  console.log(entries.map((entry) => entry.filename))
})`

export const FORWARD_OUT = `import net from 'node:net'

// Port 15432 on this machine reaches PostgreSQL on the server
const server = net.createServer(async (socket) => {
  try {
    const channel = await ssh.forwardOut('127.0.0.1', 0, '127.0.0.1', 5432)
    socket.pipe(channel).pipe(socket)
  } catch (error) {
    socket.destroy(error)
  }
})
server.listen(15432, '127.0.0.1')`

export const FORWARD_IN = `import net from 'node:net'

// Port 8080 on the server reaches port 3000 on this machine
const forward = await ssh.forwardIn('127.0.0.1', 8080, (details, accept) => {
  const channel = accept()
  const local = net.connect(3000, '127.0.0.1')
  channel.pipe(local).pipe(channel)
})

// later
await forward.dispose()`

export const ERRORS = `import { SSHError } from 'node-ssh'

try {
  await ssh.execCommand('make release', { cwd: '~/site', timeout: 60_000 })
} catch (error) {
  if (!(error instanceof SSHError) || error.code !== 'ETIMEDOUT') throw error
  console.log('make release did not finish within a minute')
} finally {
  ssh.dispose()
}`

export const IDLE_ERRORS = `ssh.connection.on('error', (error) => {
  console.error('SSH connection error:', error.message)
})`

export const TYPES_INSTALL = 'npm install --save-dev @types/ssh2'

export const TYPES_USAGE = `import { NodeSSH, type Config, type SSHExecCommandResponse } from 'node-ssh'

const config: Config = {
  host: 'web-1.example.com',
  username: 'deploy',
  privateKeyPath: '/home/you/.ssh/id_ed25519',
}
const ssh = await new NodeSSH().connect(config)
const result: SSHExecCommandResponse = await ssh.execCommand('uptime')`
