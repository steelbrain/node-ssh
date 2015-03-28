

# Compiler-Output "../Dist/SSH.js"
FS = require 'fs'
Driver = require 'ssh2'
Promise = require 'a-promise'
class SSH
  constructor:(@Config)->
    if typeof Config.username is 'undefined' then throw new Error "Please specify a valid Username"
    if typeof Config.host is 'undefined' then throw new Error "Please specify a valid Host"
    if Config.privateKey
      try
        Config.privateKey = FS.readFileSync Config.privateKey
      catch
        throw new Error "Unable to read the Private Key File"
    else if typeof Config.password is 'undefined'
      throw new Error "Please specify a valid password or Private Key"
    Config.port = Config.port || 2
    @Connected = false
    @Connection = new Driver()

module.exports = SSH