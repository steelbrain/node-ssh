Node-SSH - SSH2 with Promises
=========

Node-SSH is an extremely lightweight Promise wrapper for [ssh2][ssh2], Period.

#### Example

```js
var node_ssh, ssh;

node_ssh = require('node-ssh');

ssh = new node_ssh({
  host: 'localhost',
  username: 'steel',
  privateKey: '/home/steel/.ssh/id_rsa'
});

ssh.connect().then(function() {
  // Source, Target
  ssh.put('/home/steel/Lab/LocalSource', '/home/steel/Lab/RemoteTarget').then(function() {
    console.log("The Directory thing is done");
  }, function(error) {
    console.log("Something's wrong");
    console.log(error);
  });
  // Array<Shape('Local' => string, 'Remote' => string)>
  ssh.putMulti([{'Local': '/home/steel/Lab/LocalSource', 'Remote': '/home/steel/Lab/RemoteTarget'}]).then(function() {
    console.log("The Directory thing is done");
  }, function(error) {
    console.log("Something's wrong");
    console.log(error);
  });
  // Source, Target
  ssh.get('/home/steel/Lab/RemoteSource', '/home/steel/Lab/LocalTarget').then(function(Contents) {
    console.log("The File's source was: "+Contents);
  }, function(error) {
    console.log("Something's wrong");
    console.log(error);
  });
  // Command
  ssh.exec('hh_client --json',{cwd:'/var/www'}).then(function(result) {
    console.log('STDOUT: ' + result.stdout);
    console.log('STDERR: ' + result.stderr);
  });
});
```

#### API

```js
type PutInfo = shape(LocalPath => string, RemotePath => string)
class SSH{
  constructor(SSH2Configuration)
  connect():Promise<void>
  mkdir(Path:String):Promise<void>
  exec(Command:String, {cwd:String}):Promise<Object{stderr:String, stdout: String}>
  put(LocalPath:String, RemotePath:String, ?SFTP: SSH2SFTP, ?Retry:Boolean = true):Promise<void>
  putMulti(Files:array<PutInfo>, ?SFTP: SSH2SFTP):Promise<void>
  get(RemoteFile:String, ?LocalFile:String, ?SFTP: SSH2SFTP):Promise<?string>
  requestSFTP():Promise<SSH2SFTP>
  end():void
}
```

### License
This project is licensed under the terms of MIT license. See the LICENSE file for more info.

[ssh2]:https://github.com/mscdex/ssh2