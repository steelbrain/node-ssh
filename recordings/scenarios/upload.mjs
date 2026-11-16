// /var/www/site holds the previous upload of ./dist. Since then, only assets/app.js changed.
await ssh.putDirectory('./dist', '/var/www/site', {
  atomic: true,
  skipUnchanged: true,
  tick(localFile, remoteFile, error, skipped) {
    console.log(error ? 'failed' : skipped ? 'unchanged' : 'uploaded', remoteFile)
  },
})
