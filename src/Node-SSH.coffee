FS = require 'fs'
Driver = require 'ssh2'
if typeof Promise is 'undefined' then Promise = require 'a-promise'

# A helper method


class Node_SSH
  DisconnectedError:"You must connect before doing anything else"
  constructor:(@Config)->
    throw new Error("You must specify a valid username") unless Config.username
    throw new Error("You must specify a valid host") unless Config.host
    if Config.privateKey
      try
        FS.accessSync FS.R_OK, Config.privateKey
      catch
        throw new Error("Your specified private key path doesn't exist")
      try
        Config.privateKey = FS.readFileSync Config.privateKey
      catch err
        throw new Error("Error reading your specified private key", Error)
    else
      throw new Error("You must specify a password or a private key") unless Config.password
    @Connected = false
    @Connection = new Driver()
  connect:->
    return new Promise (Resolve, Reject)=>
      @Connection.on('error', Reject)
      @Connection.on('ready', =>
        @Connected = true
        Resolve()
      )
      try
        @Connection.connect(@Config)
      catch error
        Reject(error)
  mkdir:(Path)->
    return @exec("mkdir -p #{Path}")
  exec:(Command, Opts)->
    return Reject(new Error(@DisconnectedError)) unless @Connected

    Opts = {} unless Opts
    return new Promise (Resolve, Reject)=>
      Command = "cd #{Opts.cwd}; #{Command}" if Opts.cwd
      @Connection.exec(Command, (error, Stream)->
        return Reject(error) if error
        ToReturn = stdout:[], stderr:[]
        Stream.on('close', ->
          ToReturn.stdout.join('')
          ToReturn.stderr.join('')
          Resolve ToReturn
        ).on('data', (data)->
          ToReturn.stdout.push(data.toString())
        ).stderr.on('data', (data)->
          ToReturn.stderr.push(data.toString())
        )
      )
  put:(LocalFile, RemoteFile, SFTPInst, CreateDirectories = true)->
    throw new Error(@DisconnectedError) unless @Connected

    try
      FS.accessSync FS.R_OK, LocalFile
    catch error
      throw new Error("Unable to read local file")
    return new Promise (Resolve, Reject)=>
      if not SFTPInst
        DePromise = @requestSFTP
      else
        DePromise = Promise.resolve(SFTPInst)
      DePromise.then((SFTP)=>
        SFTPInst = SFTP
        SFTP.fastPut(LocalFile, RemoteFile, (error)=>
          return Resolve() unless error
          return Reject(error) unless error.message is 'No such file' or !CreateDirectories
          @mkdir(RemoteFile.split("/").slice(0,-1).join('/')).then =>
            @put(LocalFile, RemoteFile, SFTPInst, false).then(Resolve, Reject)
        )
      , Reject)
  # Array<Shape('Local' => string, 'Remote' => string)>
  putMulti:(Files)->
    return new Promise (Resolve, Reject)->
      #TODO: Do Something
  get:(RemotePath)->
    # Do Something
  requestSFTP:->
    throw new Error(@DisconnectedError) unless @Connected

    return new Promise (Resolve, Reject)=>
      @Connection.sftp (error, sftp)->
        return Reject(error) if error
        Resolve(sftp)
module.exports = Node_SSH