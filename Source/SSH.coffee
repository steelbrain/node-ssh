# @Compiler-Output "../Dist/SSH.js"

FS = require 'fs'
Driver = require 'ssh2'
Path = require 'path'
Promise = require 'a-promise'

class SSH
  constructor:(Config)->
    @Config = Config
    if typeof Config.username is 'undefined' then throw new Error "Please specify a valid Username"
    if typeof Config.host is 'undefined' then throw new Error "Please specify a valid Host"
    if Config.privateKey
      if Path.isAbsolute(Config.privateKey)
        try
          Config.privateKey = FS.readFileSync Config.privateKey
        catch
          throw new Error "Unable to read the Private Key File"
    else if typeof Config.password is 'undefined'
      throw new Error "Please specify a valid password or Private Key"
    Config.port = Config.port || 22
    @Connected = false
  connect:->
    @Connection = new Driver()
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
    return @exec("mkdir -p #{Path}")
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
    try
      FS.accessSync(LocalFile, FS.R_OK)
    catch
      throw new Error("Local File '#{LocalFile}' doesn't exist")
    if SFTP
      ThePromise = Promise.resolve(SFTP)
    else
      ThePromise = @requestSFTP()
    return ThePromise.then (SFTP)=>
      Deferred = Promise.defer()
      SFTP.fastPut LocalFile, RemoteFile, (Error)=>
        if Error
          if Error.message is 'No such file' or not Retry
            Deferred.reject(Error)
          else
            Deferred.resolve(@mkdir(RemoteFile.split("/").slice(0,-1).join('/')).then =>
              @put(LocalFile, RemoteFile, SFTP, false)
            )
        else
          Deferred.resolve()
      return Deferred.promise
  putMulti:(Files, SFTP)->
    throw new Error("Please connect before doing anything else") unless @Connected
    if SFTP
      ThePromise = Promise.resolve(SFTP)
    else
      ThePromise = @requestSFTP()
    Promises = []
    return ThePromise.then (SFTP)=>
      Files.forEach (File)=>
        return unless File.Local or File.Remote
        return unless FS.existsSync File.Local
        Promises.push @put(File.Local, File.Remote, SFTP)
      return Promise.all(Promises)
  get:(RemoteFile, LocalFile, SFTP)->
    throw new Error("Please connect before doing anything else") unless @Connected
    if SFTP
      ThePromise = Promise.resolve(SFTP)
    else
      ThePromise = @requestSFTP()
    return ThePromise.then (SFTP)=>
      Deferred = Promise.defer()
      Stream = SFTP.createReadStream(RemoteFile)
      Contents = []
      Stream.on('data', (Data)->
        Contents.push Data.toString()
      ).on('close', ->
        Contents = Contents.join('')
        return Deferred.resolve(Contents) unless LocalFile
        FS.writeFile LocalFile, Contents, (error)->
          return Reject(error) if error
          Deferred.resolve()
      )
      return Deferred.promise
  requestSFTP:->
    throw new Error("Please connect before doing anything else") unless @Connected
    return new Promise (Resolve, Reject)=>
      @Connection.sftp (Error, SFTP)=>
        return Reject(Error) if Error
        Resolve(SFTP)
  requestShell:->
    throw new Error("Please connect before doing anything else") unless @Connected
    return new Promise (Resolve, Reject)=>
      @Connection.shell (Error, Shell)=>
        return Reject(Error) if Error
        Resolve(Shell)
  end:->
    @Connection.end()
    @Connected = false
module.exports = SSH