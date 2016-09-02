Node-SSH - SSH2 with Promises
=========

Node-SSH is an extremely lightweight Promise wrapper for [ssh2][ssh2], Period.

#### Example

```js
var path, node_ssh, ssh

path = require('path')
node_ssh = require('node-ssh')
ssh = new node_ssh()

ssh.connect({
  host: 'localhost',
  username: 'steel',
  privateKey: '/home/steel/.ssh/id_rsa'
}).then(function() {
  // Local, Remote
  ssh.putFile('/home/steel/Lab/localPath', '/home/steel/Lab/remotePath').then(function() {
    console.log("The File thing is done")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Array<Shape('local' => string, 'remote' => string)>
  ssh.putFiles([{ local: '/home/steel/Lab/localPath', remote: '/home/steel/Lab/remotePath' }]).then(function() {
    console.log("The File thing is done")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Local, Remote
  ssh.getFile('/home/steel/Lab/localPath', '/home/steel/Lab/remotePath').then(function(Contents) {
    console.log("The File's contents were successfully downloaded")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Putting entire directories
  const failed = []
  const successful = []
  ssh.putDirectory('/home/steel/Lab', '/home/steel/Lab', {
    recursive: true,
    validate: function(itemPath) {
      const baseName = path.basename(itemPath)
      return baseName.substr(0, 1) !== '.' && // do not allow dot files
             baseName !== 'node_modules' // do not allow node_modules
    },
    tick: function(localPath, remotePath, error) {
      if (error) {
        failed.push(localPath)
      } else {
        successful.push(localPath)
      }
    }
  }).then(function(successful) {
    console.log('the directory transfer was', successful ? 'successful' : 'unsuccessful')
    console.log('failed transfers', failed.join(', '))
    console.log('successful transfers', successful.join(', '))
  })
  // Command
  ssh.execCommand('hh_client --json', { cwd:'/var/www' }).then(function(result) {
    console.log('STDOUT: ' + result.stdout)
    console.log('STDERR: ' + result.stderr)
  })
  // Command with escaped params
  ssh.exec('hh_client', ['--json'], { cwd: '/var/www', stream: 'stdout' }).then(function(result) {
    console.log('STDOUT: ' + result)
  })
})
```

#### API

```js
class SSH{
  connect(config: SSH2Config): Promise<this>
  requestSFTP(): Promise<SSH2SFTP>
  requestShell(): Promise<SSH2Shell>
  mkdir(path: string): Promise<string>
  exec(command: string, parameters: Array<string>, options: { cwd?: string, stdin?: string, stream?: 'stdout' | 'stderr', 'both' } = {}): Promise<Object | string>
  execCommand(command: string, options: { cwd: string, stdin: string } = {}): Promise<{ stdout: string, stderr: string, signal: ?string, code: number }>
  putFile(localFile: string, remoteFile: string, sftp: ?Object = null): Promise<void>
  getFile(localFile: string, remoteFile: string, sftp: ?Object = null): Promise<void>
  putFiles(files: Array<{ local: string, remote: string }>, sftp: ?Object = null): Promise<void>
  putDirectory(localDirectory: string, remoteDirectory: string, options: ?{ recursive: boolean, tick(localPath, remotePath, error): any, validate(localPath): boolean } = null, sftp: ?Object = null): Promise<boolean>
  dispose(): void
}
```

### License
This project is licensed under the terms of MIT license. See the LICENSE file for more info.

[ssh2]:https://github.com/mscdex/ssh2
