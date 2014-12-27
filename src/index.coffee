driver  = require('ssh2')
fs      = require('fs')
Promise = require('bluebird')

class SSH
  constructor:(config)->
    errors = []
    if typeof config.port is 'undefined' then config.port = 22
    if typeof config.username is 'undefined' then errors.push new Error "You must specify a valid username"
    if typeof config.host is 'undefined' then errors.push new Error "You must specify a valid hostname"
    if typeof config.privateKey is 'undefined' then errors.push new Error "You must specify path to a privateKey"
    else if !fs.existsSync config.privateKey then errors.push new Error "The privateKey specified doesn't exist"
    else if !fs.lstatSync(config.privateKey).isFile() then errors.push new Error "The privateKey specified isn't a file"
    if errors.length > 0
      throw errors
    config.privateKey = fs.readFileSync config.privateKey
    @config = config
    @status = 0
    try
      @conn = new driver()
    catch err
      throw [err]
  connect:->
    me = this
    return new Promise (resolve,reject)->
      try
        me.conn.on 'error', reject
        me.conn.on 'ready', ->
          me.status = 1
          resolve()
        me.conn.connect me.config
      catch error
        reject error
  exec:(command,opts)->
    if typeof opts is 'undefined' then opts = {}
    me = this
    return new Promise (resolve,reject)->
      if me.status is 0
        reject "Not yet connected to server"
        return
      if typeof opts.cwd isnt 'undefined' then command = "cd #{opts.cwd}; #{command}"
      me.conn.exec command,(error,stream)->
        if error
          reject error
          return
        toReturn = {stdout:'',stderr:''}
        stream.on 'close',->
          toReturn.stdout = toReturn.stdout.toString()
          toReturn.stderr = toReturn.stderr.toString()
          resolve toReturn
        .on 'data',(data)->
          toReturn.stdout = data
        .stderr.on 'data',(data)->
          toReturn.stderr = data
  put:(localFile,remoteFile)->
    me = this
    return new Promise (resolve,reject)->
      if !fs.existsSync localFile
        reject "Local File doesn't exists"
        return
      me.conn.sftp (error,sftp)->
        if error
          reject error
          return
        sftp.fastPut localFile,remoteFile,{},(error)->
          if typeof error isnt 'undefined'
            if error.message is 'No such file'
              remoteDir = remoteFile.split("/").slice(0,-1).join('/')
              me.mkdirRecursive(remoteDir).then ->
                me.put(localFile,remoteFile).then resolve,reject
            else
              reject error
          else
            resolve()
  mkdirRecursive:(path)->
    me = this
    console.log path
    return new Promise (resolve,reject)->
      me.conn.sftp (error,sftp)->
        if error
          reject error
          return
        sftp.lstat path,(info)->
          if info instanceof Error and info.message is 'No such file'
            console.log "Gonna create a directory"
            me.mkdir(path).then ->
              resolve()
            , ->
              dePath = path.split('/').slice(0,-1).join('/')
              me.mkdirRecursive(dePath).then ->
                me.mkdirRecursive(path).then resolve,reject
              ,reject

  mkdir:(path)->
    me = this
    return new Promise (resolve,reject)->
      me.conn.sftp (error,sftp)->
        if error
          reject error
          return
        sftp.mkdir path,(error)->
          if error
            reject error
          else
            resolve()


module.exports = SSH
