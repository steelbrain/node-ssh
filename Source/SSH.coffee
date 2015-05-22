

FS = require 'fs'
Driver = require 'ssh2'
Promise = require 'a-promise'
class SSH
  constructor:(Config)->
    @Config = Config
    if typeof Config.username is 'undefined' then throw new Error "Please specify a valid Username"
    if typeof Config.host is 'undefined' then throw new Error "Please specify a valid Host"
    if Config.privateKey
      try
        Config.privateKey = FS.readFileSync Config.privateKey
      catch
        throw new Error "Unable to read the Private Key File"
    else if typeof Config.password is 'undefined'
      throw new Error "Please specify a valid password or Private Key"
    Config.port = Config.port || 22
    @Connected = false
    @Connection = new Driver()
  connect:->
    return new Promise (Resolve, Reject)=>
      try
        @Connection.on 'error', Reject
        @Connection.on 'ready', =>
          @Connected = true
          Resolve()
        @Connection.connect(@Config)
      catch error
        Reject error
  mkdir:(Path)->
    return new @exec("mkdir -p #{Path}")
  exec:(Command, Opts)->
    throw new Error("Please connect before doing anything else") unless @Connected
    Opts = Opts || {}
    return new Promise (Resolve, Reject)=>
      Command = "cd #{Opts.cwd}; #{Command}" if Opts.cwd
      @Connection.exec Command, (Error, Stream)=>
        return Reject(Error) if Error
        ToReturn = stdout: [], stderr: []
        Stream.on('close', ->
          Resolve stderr: ToReturn.stderr.join(""), stdout: ToReturn.stdout.join("")
        ).on('data', (Data)->
          ToReturn.stdout.push Data.toString()
        ).stderr.on('data', (Data)->
          ToReturn.stderr.push Data.toString()
        )
  put:(LocalFile, RemoteFile, SFTP, Retry = true)->
    throw new Error("Please connect before doing anything else") unless @Connected
    return new Promise (Resolve, Reject)=>
      try
        FS.accessSync(LocalFile, FS.R_OK)
      catch
        return Reject("Local File '#{LocalFile}' doesn't exist")
      if SFTP
        ThePromise = Promise.resolve(SFTP)
      else
        ThePromise = @requestSFTP()
      ThePromise.then (SFTP)=>
        SFTP.fastPut LocalFile, RemoteFile, (Error)=>
          return Resolve() unless Error
          return Reject(Error) if Error.message isnt 'No such file' or not Retry
          @mkdir(RemoteFile.split("/").slice(0,-1).join('/')).then =>
            @put(LocalFile, RemoteFile, SFTP, false)
  putMulti:(Files, SFTP)->
    throw new Error("Please connect before doing anything else") unless @Connected
    return new Promise (Resolve, Reject)=>
      if SFTP
        ThePromise = Promise.resolve(SFTP)
      else
        ThePromise = @requestSFTP()
      Promises = []
      ThePromise.then (SFTP)=>
        Files.forEach (File)=>
          return unless File.Local or File.Remote
          return unless FS.existsSync File.Local
          Promises.push @put(File.Local, File.Remote, SFTP)
        Promise.all(Promises).then(Resolve,Reject);
  get:(RemoteFile, LocalFile, SFTP)->
    throw new Error("Please connect before doing anything else") unless @Connected
    return new Promise (Resolve, Reject)=>
      if SFTP
        ThePromise = Promise.resolve(SFTP)
      else
        ThePromise = @requestSFTP()
      ThePromise.then (SFTP)=>
        Stream = SFTP.createReadStream RemoteFile
        Contents = []
        Stream.on('data', (Data)->
          Contents.push Data.toString()
        ).on('close', ->
          Contents = Contents.join('')
          return Resolve(Contents) unless LocalFile
          FS.writeFile LocalFile, Contents, (error)->
            return Reject(error) if error
            Resolve()
        )
  requestSFTP:->
    throw new Error("Please connect before doing anything else") unless @Connected
    return new Promise (Resolve, Reject)=>
      @Connection.sftp (Error, SFTP)=>
        return Reject(Error) if Error
        Resolve(SFTP);
  end:->
    @Connection.end()
module.exports = SSH