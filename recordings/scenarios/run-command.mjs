const deployed = await ssh.execCommand('git log -1 --oneline', { cwd: '~/site' })
console.log(deployed)

const missing = await ssh.execCommand('ls /srv/backups')
console.log(missing)
