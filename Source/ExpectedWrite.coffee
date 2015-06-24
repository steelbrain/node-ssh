# @Compiler-Output "../Dist/ExceptedWrite.js"

EventEmitter = require('events').EventEmitter
Promise = require('a-promise')
Buffer = require('buffer').Buffer

class ExpectedWrite extends EventEmitter
  constructor: (@stream) ->
    super
    @status = true
    @expected = null
    @callback = null
    @data = stdout: new Buffer("", "utf8"), stderr: new Buffer("", "utf8")

    @stream.on 'close', =>
      @emit('end')
    if @stream.stdout
      @stream.stdout.on 'data', (data) =>
        @data.stdout = Buffer.concat([@data.stdout, data])
    else
      @stream.on 'data', (data) =>
        @data.stdout = Buffer.concat([@data.stdout, data])
    @stream.stderr.on 'data', (data) =>
      @data.stderr = Buffer.concat([@data.stderr, data])

  onEnd: ->
    return new Promise (Resolve)=>
      if @status
        @once('end', Resolve)
      else
        Resolve()

module.exports = ExpectedWrite