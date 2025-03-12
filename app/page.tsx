export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6">Node-SSH</h1>
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8">
            Simple, powerful SSH client for Node.js
          </p>
          <div className="flex justify-center gap-4 mb-12">
            <a
              href="https://www.npmjs.com/package/node-ssh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
            >
              <span>Latest Release</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <title>External link to npm package</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <a
              href="https://github.com/steelbrain/node-ssh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground px-6 py-3 font-medium transition-colors"
            >
              <span>View on GitHub</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <title>External link to GitHub repository</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold mb-3">Promise-Based API</h3>
              <p className="text-muted-foreground">Modern, clean API with full Promise support for all SSH operations. No callback hell!</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold mb-3">Flexible Authentication</h3>
              <p className="text-muted-foreground">Support for private keys (path/buffer), password, and keyboard interactive authentication methods.</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold mb-3">File Operations</h3>
              <p className="text-muted-foreground">Robust file transfer capabilities including single file transfers and recursive directory operations.</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold mb-3">Command Execution</h3>
              <p className="text-muted-foreground">Execute remote commands with full control over stdin/stdout and support for PTY options.</p>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Getting Started</h2>

          {/* Installation */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold mb-4">Installation</h3>
            <p className="text-muted-foreground mb-4">Choose your preferred package manager:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="font-semibold mb-2 text-sm">npm</p>
                <code className="font-mono text-sm block">$ npm install node-ssh</code>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="font-semibold mb-2 text-sm">yarn</p>
                <code className="font-mono text-sm block">$ yarn add node-ssh</code>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="font-semibold mb-2 text-sm">pnpm</p>
                <code className="font-mono text-sm block">$ pnpm add node-ssh</code>
              </div>
            </div>
          </div>

          {/* Basic Usage */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold mb-4">Basic Usage</h3>
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`const { NodeSSH } = require('node-ssh')
const ssh = new NodeSSH()

ssh.connect({
  host: 'localhost',
  username: 'steel',
  privateKey: '/home/steel/.ssh/id_rsa'
})
.then(async () => {
  // Ready for commands
  const result = await ssh.execCommand('echo $PATH')
})`}</code>
            </pre>
            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-4">Ready to explore more? Check out our complete API documentation for detailed information about all available methods and options.</p>
              <a
                href="https://github.com/steelbrain/node-ssh?tab=readme-ov-file#api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-card hover:bg-card/90 rounded-lg px-6 py-3 border border-border transition-colors"
              >
                <span className="font-semibold">View Complete API Reference</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <title>External link icon</title>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Examples Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Examples</h2>

          {/* File Transfer Example */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold mb-4">File Transfer</h3>
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`// Upload a file
await ssh.putFile('/local/path/file.txt', '/remote/path/file.txt')

// Download a file
await ssh.getFile('/remote/path/file.txt', '/local/path/file.txt')

// Upload a directory
await ssh.putDirectory('/local/path', '/remote/path', {
  recursive: true,
  concurrency: 10,
  validate: (itemPath) => {
    const baseName = path.basename(itemPath)
    return baseName.substr(0, 1) !== '.' // skip hidden files
  }
})`}</code>
            </pre>
          </div>

          {/* Command Execution Example */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold mb-4">Command Execution</h3>
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`// Simple command execution
const result = await ssh.execCommand('ls -la')
console.log('STDOUT:', result.stdout)
console.log('STDERR:', result.stderr)

// With working directory and stream handlers
const result = await ssh.exec('git', ['pull'], {
  cwd: '/var/www/app',
  onStdout: (chunk) => {
    console.log('Output:', chunk.toString('utf8'))
  },
  onStderr: (chunk) => {
    console.log('Error:', chunk.toString('utf8'))
  }
})`}</code>
            </pre>
          </div>

          {/* Keyboard Interactive Auth Example */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold mb-4">Keyboard Interactive Authentication</h3>
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`ssh.connect({
  host: 'localhost',
  username: 'steel',
  port: 22,
  password: 'mypassword',
  tryKeyboard: true,
  onKeyboardInteractive(name, instructions, lang, prompts, finish) {
    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
      finish(['mypassword'])
    }
  }
})`}</code>
            </pre>
          </div>
        </div>

        {/* TypeScript Support */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">TypeScript Support</h2>
          <div className="mb-6">
            <p className="text-muted-foreground mb-4">Install the required type definitions:</p>
            <pre className="bg-muted rounded-lg p-4 font-mono text-sm">
              <code>$ npm install --save-dev @types/ssh2</code>
            </pre>
          </div>
          <div>
            <p className="text-muted-foreground mb-4">Add these compiler options to your tsconfig.json if needed:</p>
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
              <code>{`{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  }
}`}</code>
            </pre>
          </div>
        </div>


      </div>

      {/* Acknowledgements */}
      <div className="border-t border-border py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6">Acknowledgements</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            node-ssh is built on top of{' '}
            <a
              href="https://github.com/mscdex/ssh2"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
            >
              ssh2
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <title>External link to ssh2 repository</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            {' '}by{' '}
            <a
              href="https://github.com/mscdex"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
            >
              @mscdex
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <title>External link to mscdex&apos;s GitHub profile</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Made with ❤️ by <a href="https://aneesiqbal.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anees Iqbal (@steelbrain)</a></p>
        </div>
      </footer>
    </div>
  );
}
