try {
  await ssh.putFile('./dist/index.html', '/var/www/site')
} catch (error) {
  console.log(error.message)
}
