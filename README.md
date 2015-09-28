Node-SSH - SSH2 with Promises
=========

Node-SSH is an extremely lightweight Promise wrapper for [ssh2][ssh2], Period.

#### Example

```js
var node_ssh, ssh;

node_ssh = require('node-ssh');

ssh = new node_ssh();

ssh.connect({
  host: 'localhost',
  username: 'steel',
  privateKey: '/home/steel/.ssh/id_rsa'
}).then(function() {
  // Source, Target
  ssh.put('/home/steel/Lab/LocalSource', '/home/steel/Lab/RemoteTarget').then(function() {
    console.log("The File thing is done");
  }, function(error) {
    console.log("Something's wrong");
    console.log(error);
  });
  // Array<Shape('Local' => string, 'Remote' => string)>
  ssh.putMulti([{'Local': '/home/steel/Lab/LocalSource', 'Remote': '/home/steel/Lab/RemoteTarget'}]).then(function() {
    console.log("The File thing is done");
  }, function(error) {
    console.log("Something's wrong");
    console.log(error);
  });
  // Source, Target
  ssh.get('/home/steel/Lab/RemoteSource', '/home/steel/Lab/LocalTarget').then(function(Contents) {
    console.log("The File's contents were successfully downloaded");
  }, function(error) {
    console.log("Something's wrong");
    console.log(error);
  });
  // Command
  ssh.execCommand('hh_client --json', {cwd:'/var/www', stream: 'both'}).then(function(result) {
    console.log('STDOUT: ' + result.stdout);
    console.log('STDERR: ' + result.stderr);
  });
});
```

#### API

```js
class SSH{
  constructor()
  connect(SSH2Configuration): Promise<void>
  mkdir(Path:String): Promise<string>
  exec(command: String, args: Array<string>, options: Object{cwd: String, stdin: String, stream: enum{'stdout', 'stderr', 'both'}}): Promise
  execCommand(command: String, options: Object{cwd: String, stdin: String, stream: enum{'stdout', 'stderr', 'both'}}): Promise
  put(localPath: String, remotePath: String, ?SFTP: SSH2SFTP, ?Retry:Boolean = true): Promise<void>
  putMulti(Files:array<Object{Local: String, Remote: String}>, ?SFTP: SSH2SFTP): Promise<void>
  get(remoteFile: String, localFile: String, ?SFTP: SSH2SFTP): Promise<?string>
  requestSFTP(): Promise<SSH2SFTP>
  requestShell(): Promise<SSH2Shell>
  end():void
}
```

### License
This project is licensed under the terms of MIT license. See the LICENSE file for more info.

[ssh2]:https://github.com/mscdex/ssh2
