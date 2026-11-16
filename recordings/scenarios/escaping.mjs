const text = '$HOME; echo injected'

console.log(await ssh.exec('echo', [text]))
console.log((await ssh.execCommand(`echo ${text}`)).stdout)
