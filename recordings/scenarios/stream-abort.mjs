const controller = new AbortController()
setTimeout(() => controller.abort(), 3000)

try {
  await ssh.execCommand('tail -n 0 -f /var/log/app/access.log', {
    signal: controller.signal,
    onStdout(chunk) {
      process.stdout.write(chunk)
    },
  })
} catch (error) {
  console.log(error.name)
}
