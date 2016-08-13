const sftp = require('mock-sftp-server');

const listing = [
  {
    '/foo': [
      { filename: 'bar', attrs: {} },
      { filename: 'not.afile', attrs: {} }
    ]
  },
  {
    '/bar': [
      { filename: 'foo', attrs: {} }
    ]
  }
];
const debug = false;
const port = 2222;

sftp.sftpServer({ listing, debug, port }, function(){console.log("done");});
