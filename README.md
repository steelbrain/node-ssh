Node-SSH - SSH2 with Promises
=========

Node-SSH is an extremely lightweight Promise wrapper for [ssh2][ssh2], Period.

#### Example

```js
var node_ssh, ssh

node_ssh = require('node-ssh')

ssh = new node_ssh()

ssh.connect({
  host: 'localhost',
  username: 'steel',
  privateKey: '/home/steel/.ssh/id_rsa'
}).then(function() {
  // Local, Remote
  ssh.putFile('/home/steel/Lab/LocalSource', '/home/steel/Lab/RemoteTarget').then(function() {
    console.log("The File thing is done")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Array<Shape('local' => string, 'remote' => string)>
  ssh.putFiles([{ local: '/home/steel/Lab/LocalSource', remote: '/home/steel/Lab/RemoteTarget' }]).then(function() {
    console.log("The File thing is done")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Local, Remote
  ssh.getFile('/home/steel/Lab/RemoteSource', '/home/steel/Lab/LocalTarget').then(function(Contents) {
    console.log("The File's contents were successfully downloaded")
  }, function(error) {
    console.log("Something's wrong")
    console.log(error)
  })
  // Command
  ssh.execCommand('hh_client --json', { cwd:'/var/www', stream: 'both' }).then(function(result) {
    console.log('STDOUT: ' + result.stdout)
    console.log('STDERR: ' + result.stderr)
  })
  // Command with escaped params
  ssh.exec('hh_client', ['--json'], { cwd: '/var/www' }).then(function(result) {
    console.log('STDOUT: ' + result)
  })
})
```

#### API

```js
class SSH{
  connect(config: SSH2Config): Promise<this>
  mkdir(path: string): Promise<string>
  exec(command: string, parameters: Array<string>, options: { cwd?: string, stdin?: string, stream?: 'stdout' | 'stderr', 'both' } = {}): Promise<Object | string>
  execCommand(command: string, options: { cwd: string, stdin: string } = {}): Promise<{ stdout: string, stderr: string, signal: ?string, code: number }>
  putFile(localFile: string, remoteFile: string, sftp: ?Object = null): Promise<void>
  putFiles(files: Array<{ local: string, remote: string }>, sftp: ?Object = null): Promise<void>
  get(localFile: string, remoteFile: string, sftp: ?Object = null): Promise<void>
  requestSFTP(): Promise<SSH2SFTP>
  requestShell(): Promise<SSH2Shell>
  dispose(): void
}
```

### License
This project is licensed under the terms of MIT license. See the LICENSE file for more info.

[ssh2]:https://github.com/mscdex/ssh2
