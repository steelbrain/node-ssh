const started = Date.now()
try {
  await ssh.execCommand('sleep 60', { timeout: 2000 })
} catch (error) {
  console.log(error.code, error.message)
  console.log(`rejected after ${Date.now() - started}ms`)
}

const { code } = await ssh.execCommand('pgrep -x sleep')
console.log(code === 1 ? 'sleep is no longer running' : 'sleep is still running')
