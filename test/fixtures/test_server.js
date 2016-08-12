var fs = require('fs');
var ssh2 = require('ssh2');
const util = require('util');

var OPEN_MODE = ssh2.SFTP_OPEN_MODE;
var STATUS_CODE = ssh2.SFTP_STATUS_CODE;

var exports = module.exports = {};

exports.startServer = function () {
  console.log("running test server...");
  return new ssh2.Server({
    hostKeys:[fs.readFileSync('./test/fixtures/id_rsa')],
}, function(client) {
    console.log('Client connected!');

    client.on('authentication', function(ctx) {
      console.log("auth");
      if (ctx.method === 'password'
          && ctx.username === 'foo'
          && ctx.password === 'bar') {
            console.log("accepting");
        ctx.accept();}
      else
        ctx.reject();
    }).on('ready', function() {
      console.log('Client authenticated!');

      client.on('session', function(accept, reject) {
        console.log("session time");
        var session = accept();


        session.once('exec', function(accept, reject, info) {
          console.log('Client wants to execute: ' + util.inspect(info.command));
          var stream = accept();
          stream.stderr.write(info.command);
          stream.write(info.command)
          stream.exit(0);
          stream.end();
        });


        // session.on('sftp', function(accept, reject) {
        //   console.log('Client SFTP session');
        //   var openFiles = {};
        //   var handleCount = 0;
        //   // `sftpStream` is an `SFTPStream` instance in server mode
        //   // see: https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
        //   var sftpStream = accept();
        //   sftpStream.on('OPEN', function(reqid, filename, flags, attrs) {
        //     // only allow opening /tmp/foo.txt for writing
        //     if (filename !== '/tmp/foo.txt' || !(flags & OPEN_MODE.WRITE))
        //       return sftpStream.status(reqid, STATUS_CODE.FAILURE);
        //     // create a fake handle to return to the client, this could easily
        //     // be a real file descriptor number for example if actually opening
        //     // the file on the disk
        //     var handle = new Buffer(4);
        //     openFiles[handleCount] = true;
        //     handle.writeUInt32BE(handleCount++, 0, true);
        //     sftpStream.handle(reqid, handle);
        //     console.log('Opening file for write')
        //   }).on('WRITE', function(reqid, handle, offset, data) {
        //     if (handle.length !== 4 || !openFiles[handle.readUInt32BE(0, true)])
        //       return sftpStream.status(reqid, STATUS_CODE.FAILURE);
        //     // fake the write
        //     sftpStream.status(reqid, STATUS_CODE.OK);
        //     var inspected = require('util').inspect(data);
        //     console.log('Write to file at offset %d: %s', offset, inspected);
        //   }).on('CLOSE', function(reqid, handle) {
        //     var fnum;
        //     if (handle.length !== 4 || !openFiles[(fnum = handle.readUInt32BE(0, true))])
        //       return sftpStream.status(reqid, STATUS_CODE.FAILURE);
        //     delete openFiles[fnum];
        //     sftpStream.status(reqid, STATUS_CODE.OK);
        //     console.log('Closing file');
        //   });
        // });
      });


    }).on('end', function() {
      console.log('Client disconnected');
    });
  }).listen(2222, '127.0.0.1', function() {
    console.log('Listening on port ' + this.address().port);
  });

}
