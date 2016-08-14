var fs = require('fs');
var ssh2 = require('ssh2');
const util = require('util');

var OPEN_MODE = ssh2.SFTP_OPEN_MODE;
var STATUS_CODE = ssh2.SFTP_STATUS_CODE;

var MAX_CONNECTIONS = 5;
var openconnections = 0;

var exports = module.exports = {};

var fds = {}; // maps OS fd => filename
var contents;


exports.startServer = function () {
  // console.log("running test server...");
  return new ssh2.Server({
    hostKeys:[fs.readFileSync('/home/id_rsa')],
}, function(client) {
    // console.log('Client connected!');

    client.on('authentication', function(ctx) {
      // console.log("auth");
      if (ctx.method === 'password'
          && ctx.username === 'foo'
          && ctx.password === 'bar') {
            // console.log("accepting");
        ctx.accept();}
      else
        ctx.reject();
    }).on('ready', function() {
      // console.log('Client authenticated!');

      client.on('session', function(accept, reject) {
        // console.log("session time");
        var session = accept();


        session.on('exec', function(accept, reject, info) {
          // console.log('Client wants to execute: ' + util.inspect(info.command));
          var stream = null;
          if (openconnections <= MAX_CONNECTIONS) {
            openconnections += 1;
            // console.log("accepting connection", openconnections);
            stream = accept();
          }
          stream.stderr.write(info.command);
          stream.write(info.command)
          stream.exit(0);
          stream.end();
        });


        session.on('sftp', function(accept, reject) {
          // console.log('Client SFTP session');
          var openFiles = {};
          var handleCount = 0;
          // `sftpStream` is an `SFTPStream` instance in server mode
          // see: https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md
          var sftpStream = null;
          if (openconnections <= MAX_CONNECTIONS) {
            openconnections += 1;
            // console.log("accepting connection", openconnections);
            sftpStream = accept();
          }
          sftpStream.on('OPEN', function(reqid, filename, flags, attrs) {
            // console.log("reading sftp...", filename);
            contents = filename;
            var handle = new Buffer(4);
            openFiles[handleCount] = true;
            handle.writeUInt32BE(handleCount++, 0, true);
            sftpStream.handle(reqid, handle);
            // console.log('Opening file')
          }).on('READ', function(reqid, filename, flags, attrs) {
            var buf = new Buffer(contents.length);
            buf.write(contents);
              sftpStream.data(reqid, buf);
          }).on('FSTAT', function(reqid, handle) {
            //fake attrs
            var attrs = {
              size   : contents.length,
              uid   : 9001,
              gid   : 9001,
              atime : (Date.now() / 1000) | 0,
              mtime : (Date.now() / 1000) | 0
            };

            sftpStream.attrs(reqid, attrs);
          }).on('WRITE', function(reqid, handle, offset, data) {
            // console.log("writing...");
            if (handle.length !== 4 || !openFiles[handle.readUInt32BE(0, true)])
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            // fake the write
            // console.log("writing data:", data, "to:",data);
            fs.writeFile(data.toString(), data.toString());
            sftpStream.status(reqid, STATUS_CODE.OK);
            var inspected = require('util').inspect(data);
            // console.log('Write to file at offset %d: %s', offset, inspected);
          }).on('CLOSE', function(reqid, handle) {
            // console.log("closing connection",openconnections);
            openconnections -= 1;
            if (openconnections < 0) openconnections = 0;
            var fnum;
            if (handle.length !== 4 || !openFiles[(fnum = handle.readUInt32BE(0, true))])
              return sftpStream.status(reqid, STATUS_CODE.FAILURE);
            delete openFiles[fnum];
            sftpStream.status(reqid, STATUS_CODE.OK);
            // console.log('Closing file');
          });
        });
      });


    }).on('end', function() {
      // console.log('Client disconnected');
    });
  }).listen(2222, '127.0.0.1', function() {
    // console.log('Listening on port ' + this.address().port);
  });

}
