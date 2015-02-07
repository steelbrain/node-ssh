Node-SSH - SSH2 with Promises
=========

Sorry, but I have no time to write the documentation, but this example should give you a clue on how it works.

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
